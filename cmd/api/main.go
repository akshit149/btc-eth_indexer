package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/internal/indexer/internal/api/auth"
	"github.com/internal/indexer/internal/api/cache"
	"github.com/internal/indexer/internal/api/config"
	"github.com/internal/indexer/internal/api/query"
	"github.com/internal/indexer/internal/api/server"
	"github.com/internal/indexer/internal/api/service"
)

func main() {
	// 1. Load Configuration
	cfgPath := os.Getenv("CONFIG_PATH")
	if cfgPath == "" {
		cfgPath = "configs/config.yaml" // Default path common in structure
	}

	// We might need a separate config file for API or reuse the main one but the struct is different.
	// For now, let's assume we use a dedicated config or the environment variables are sufficient.
	// If the file doesn't exist, Load might fail if we don't handle it gracefully or have Env override.
	// The prompt implies "Env + YAML".

	// Create logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load(cfgPath)
	if err != nil {
		// Fallback to strict env vars if config file missing?
		// Or just fatal. Let's log fatal.
		// However, for dev convenience, if file missing we might want to continue if envs are set?
		// But config.Load fails on file read error.
		// Let's assume the user provides a config file or we change Load to be resilient.
		// For this task, we'll crash if load fails as per standard practice.
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// 2. Setup Database
	store, err := query.NewPostgresStore(cfg.Database.DSN(), cfg.Database.MaxConnections)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer store.Close()

	// 3. Setup Cache
	redisCache, err := cache.NewRedisCache(cfg.Redis)
	if err != nil {
		logger.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer redisCache.Close()

	// 4. Setup Service
	svc := service.New(store, redisCache)

	// 5. Setup Auth Middleware
	authMiddleware := auth.New(redisCache, cfg.Auth)

	// 6. Setup Server
	srv := server.New(cfg.Server, svc, authMiddleware)

	// 7. Start Server with Graceful Shutdown
	go func() {
		if err := srv.Start(); err != nil {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal using channel
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server forced to shutdown", "error", err)
	}
}
