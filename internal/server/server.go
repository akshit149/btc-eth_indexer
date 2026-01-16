package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/internal/indexer/internal/coordinator"
	"github.com/internal/indexer/pkg/types"
)

// Server provides health and metrics HTTP endpoints
type Server struct {
	healthPort   int
	metricsPort  int
	coordinators map[types.ChainID]*coordinator.Coordinator
	logger       *slog.Logger

	healthServer  *http.Server
	metricsServer *http.Server
}

// New creates a new HTTP server
func New(healthPort, metricsPort int, logger *slog.Logger) *Server {
	return &Server{
		healthPort:   healthPort,
		metricsPort:  metricsPort,
		coordinators: make(map[types.ChainID]*coordinator.Coordinator),
		logger:       logger,
	}
}

// RegisterCoordinator registers a coordinator for health reporting
func (s *Server) RegisterCoordinator(chainID types.ChainID, c *coordinator.Coordinator) {
	s.coordinators[chainID] = c
}

// Start starts the HTTP servers
func (s *Server) Start(ctx context.Context) error {
	var wg sync.WaitGroup
	errCh := make(chan error, 2)

	// Health server
	healthMux := http.NewServeMux()
	healthMux.HandleFunc("/healthz", s.handleHealth)
	healthMux.HandleFunc("/readyz", s.handleReady)

	s.healthServer = &http.Server{
		Addr:         fmt.Sprintf(":%d", s.healthPort),
		Handler:      healthMux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		s.logger.Info("starting health server", "port", s.healthPort)
		if err := s.healthServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- fmt.Errorf("health server: %w", err)
		}
	}()

	// Metrics server
	metricsMux := http.NewServeMux()
	metricsMux.HandleFunc("/metrics", s.handleMetrics)

	s.metricsServer = &http.Server{
		Addr:         fmt.Sprintf(":%d", s.metricsPort),
		Handler:      metricsMux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		s.logger.Info("starting metrics server", "port", s.metricsPort)
		if err := s.metricsServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- fmt.Errorf("metrics server: %w", err)
		}
	}()

	// Wait for context cancellation or error
	select {
	case <-ctx.Done():
		return s.Shutdown()
	case err := <-errCh:
		return err
	}
}

// Shutdown gracefully stops the servers
func (s *Server) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var errs []error
	if s.healthServer != nil {
		if err := s.healthServer.Shutdown(ctx); err != nil {
			errs = append(errs, fmt.Errorf("health server shutdown: %w", err))
		}
	}
	if s.metricsServer != nil {
		if err := s.metricsServer.Shutdown(ctx); err != nil {
			errs = append(errs, fmt.Errorf("metrics server shutdown: %w", err))
		}
	}

	if len(errs) > 0 {
		return errs[0]
	}
	return nil
}

// HealthResponse is the health check response
type HealthResponse struct {
	Status string                 `json:"status"`
	Chains map[string]ChainHealth `json:"chains"`
}

// ChainHealth contains health info for a single chain
type ChainHealth struct {
	LastIndexedHeight uint64    `json:"last_indexed_height"`
	LastIndexedAt     time.Time `json:"last_indexed_at"`
	LagSeconds        int64     `json:"lag_seconds"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	resp := HealthResponse{
		Status: "ok",
		Chains: make(map[string]ChainHealth),
	}

	for chainID, coord := range s.coordinators {
		metrics := coord.GetMetrics()
		lagSeconds := time.Since(metrics.LastIndexedAt).Seconds()

		resp.Chains[string(chainID)] = ChainHealth{
			LastIndexedHeight: metrics.LastIndexedHeight,
			LastIndexedAt:     metrics.LastIndexedAt,
			LagSeconds:        int64(lagSeconds),
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *Server) handleReady(w http.ResponseWriter, r *http.Request) {
	// Simple readiness check
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")

	for chainID, coord := range s.coordinators {
		metrics := coord.GetMetrics()
		chain := string(chainID)

		fmt.Fprintf(w, "# HELP indexer_blocks_indexed_total Total number of blocks indexed\n")
		fmt.Fprintf(w, "# TYPE indexer_blocks_indexed_total counter\n")
		fmt.Fprintf(w, "indexer_blocks_indexed_total{chain=\"%s\"} %d\n", chain, metrics.TotalBlocksIndexed)

		fmt.Fprintf(w, "# HELP indexer_last_indexed_height Last indexed block height\n")
		fmt.Fprintf(w, "# TYPE indexer_last_indexed_height gauge\n")
		fmt.Fprintf(w, "indexer_last_indexed_height{chain=\"%s\"} %d\n", chain, metrics.LastIndexedHeight)

		fmt.Fprintf(w, "# HELP indexer_last_indexed_timestamp Unix timestamp of last indexed block\n")
		fmt.Fprintf(w, "# TYPE indexer_last_indexed_timestamp gauge\n")
		fmt.Fprintf(w, "indexer_last_indexed_timestamp{chain=\"%s\"} %d\n", chain, metrics.LastIndexedAt.Unix())

		fmt.Fprintf(w, "# HELP indexer_poll_duration_seconds Duration of last poll in seconds\n")
		fmt.Fprintf(w, "# TYPE indexer_poll_duration_seconds gauge\n")
		fmt.Fprintf(w, "indexer_poll_duration_seconds{chain=\"%s\"} %f\n", chain, metrics.LastPollDuration.Seconds())

		fmt.Fprintf(w, "# HELP indexer_poll_errors_total Total number of poll errors\n")
		fmt.Fprintf(w, "# TYPE indexer_poll_errors_total counter\n")
		fmt.Fprintf(w, "indexer_poll_errors_total{chain=\"%s\"} %d\n", chain, metrics.TotalPollErrors)

		fmt.Fprintf(w, "# HELP indexer_reorgs_total Total number of reorgs detected\n")
		fmt.Fprintf(w, "# TYPE indexer_reorgs_total counter\n")
		fmt.Fprintf(w, "indexer_reorgs_total{chain=\"%s\"} %d\n", chain, metrics.TotalReorgs)

		fmt.Fprintf(w, "# HELP indexer_last_reorg_depth Depth of last reorg\n")
		fmt.Fprintf(w, "# TYPE indexer_last_reorg_depth gauge\n")
		fmt.Fprintf(w, "indexer_last_reorg_depth{chain=\"%s\"} %d\n", chain, metrics.LastReorgDepth)

		fmt.Fprintf(w, "\n")
	}
}
