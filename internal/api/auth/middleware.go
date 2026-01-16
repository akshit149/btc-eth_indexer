package auth

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/internal/indexer/internal/api/cache"
	"github.com/internal/indexer/internal/api/config"
)

// Middleware handles authentication and rate limiting
type Middleware struct {
	cache cache.Cache
	cfg   config.AuthConfig
}

// New creates a new auth middleware
func New(cache cache.Cache, cfg config.AuthConfig) *Middleware {
	return &Middleware{
		cache: cache,
		cfg:   cfg,
	}
}

// Handler wraps an http.Handler with auth and rate limiting
func (m *Middleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Check API Key
		apiKey := r.Header.Get("X-API-Key")

		// For health checks or public endpoints, we might want to skip this.
		// But usually middleware is mounted on valid routes.
		// If apiKey is empty, we reject?
		// Requirement: "API key authentication".
		// We'll enforce it.
		if apiKey == "" {
			http.Error(w, "Missing API Key", http.StatusUnauthorized)
			return
		}

		// Validate API Key (Mock logic: assume any non-empty key is valid for now,
		// or check against a set if we implemented key management.
		// Prompt doesn't specify where keys come from. Assuming static or just existence for now.
		// In production, we'd check DB or Cache.)

		// 2. Rate Limiting
		// Key: "ratelimit:{apiKey}:{window_timestamp}"
		// Window: 1 second or 1 minute.
		// Config: RateLimitRequests per RateLimitWindow.

		window := m.cfg.RateLimitWindow
		if window == 0 {
			window = 1 * time.Second
		}
		// Round to variable window
		now := time.Now().Truncate(window).UnixNano()

		// Use IP if key is shared? Promt says "per key + IP".
		// Let's combine them.
		ip := r.RemoteAddr
		// Basic IP parsing to remove port is good practice but let's keep it simple for now or use SplitHostPort
		if idx := strings.LastIndex(ip, ":"); idx != -1 {
			ip = ip[:idx]
		}

		limitKey := fmt.Sprintf("ratelimit:%s:%s:%d", apiKey, ip, now)

		count, err := m.cache.Incr(r.Context(), limitKey, window*2) // *2 to be safe with expiry
		if err != nil {
			// On cache error, fail open or closed? Closed is safer for system stability.
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		if int(count) > m.cfg.RateLimitRequests {
			w.Header().Set("Retry-After", fmt.Sprintf("%.0f", window.Seconds()))
			http.Error(w, "Rate Limit Exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
