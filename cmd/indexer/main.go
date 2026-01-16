package main

import (
	"context"
	"database/sql"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/internal/indexer/internal/config"
	"github.com/internal/indexer/internal/coordinator"
	"github.com/internal/indexer/internal/poller"
	"github.com/internal/indexer/internal/poller/btc"
	"github.com/internal/indexer/internal/poller/eth"
	"github.com/internal/indexer/internal/reorg"
	"github.com/internal/indexer/internal/server"
	"github.com/internal/indexer/internal/storage"
	"github.com/internal/indexer/pkg/types"

	_ "github.com/lib/pq"
)

func main() {
	configPath := flag.String("config", "config.yaml", "path to configuration file")
	flag.Parse()

	// Setup structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	if err := run(*configPath, logger); err != nil {
		logger.Error("fatal error", "error", err)
		os.Exit(1)
	}
}

func run(configPath string, logger *slog.Logger) error {
	// Load configuration
	cfg, err := config.Load(configPath)
	if err != nil {
		return err
	}

	logger.Info("loaded configuration",
		"chains", len(cfg.Chains),
		"health_port", cfg.Server.HealthPort,
		"metrics_port", cfg.Server.MetricsPort,
	)

	// Connect to database
	db, err := sql.Open("postgres", cfg.Database.DSN())
	if err != nil {
		return err
	}
	defer db.Close()

	db.SetMaxOpenConns(cfg.Database.MaxConnections)

	if err := db.Ping(); err != nil {
		return err
	}
	logger.Info("connected to database")

	// Create storage and run migrations
	store := storage.New(db)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := store.Migrate(ctx); err != nil {
		return err
	}
	logger.Info("database migrations complete")

	// Create HTTP server
	httpServer := server.New(cfg.Server.HealthPort, cfg.Server.MetricsPort, logger)

	// Create coordinators for enabled chains
	var coordinators []*coordinator.Coordinator

	for chainName, chainCfg := range cfg.Chains {
		if !chainCfg.Enabled {
			continue
		}

		var chainID types.ChainID
		var chainPoller poller.ChainPoller

		switch chainName {
		case "btc":
			chainID = types.ChainBTC
			chainPoller = btc.New(chainCfg.RPCURL, chainCfg.BatchSize)

		case "eth":
			chainID = types.ChainETH

			// Load contract ABIs
			var contracts []eth.ContractConfig
			for _, contractCfg := range chainCfg.Contracts {
				abiData, err := os.ReadFile(contractCfg.ABIPath)
				if err != nil {
					logger.Warn("failed to load ABI, skipping contract",
						"address", contractCfg.Address,
						"error", err,
					)
					continue
				}

				parsedABI, err := eth.LoadABIFromJSON(abiData)
				if err != nil {
					logger.Warn("failed to parse ABI, skipping contract",
						"address", contractCfg.Address,
						"error", err,
					)
					continue
				}

				contracts = append(contracts, eth.ContractConfig{
					Address: eth.HexToAddress(contractCfg.Address),
					ABI:     parsedABI,
					Name:    contractCfg.Address, // Use address as name if not specified
				})

				logger.Info("loaded contract ABI",
					"address", contractCfg.Address,
				)
			}

			chainPoller = eth.NewPoller(
				chainCfg.RPCURL,
				chainCfg.BatchSize,
				chainCfg.LogBatchSize,
				chainCfg.UseFinalizedTag,
				chainCfg.ConfirmationDepth,
				contracts,
				logger,
			)

		default:
			logger.Warn("unknown chain, skipping", "chain", chainName)
			continue
		}

		detector := reorg.New(store, chainCfg.MaxReorgDepth, logger)
		coord := coordinator.New(
			chainID,
			chainCfg,
			chainPoller,
			store,
			detector,
			logger,
		)

		httpServer.RegisterCoordinator(chainID, coord)
		coordinators = append(coordinators, coord)

		logger.Info("initialized chain coordinator",
			"chain", chainName,
			"start_height", chainCfg.StartHeight,
			"confirmation_depth", chainCfg.ConfirmationDepth,
		)
	}

	if len(coordinators) == 0 {
		logger.Warn("no chains enabled, server will still run but no indexing will occur")
	}

	// Setup signal handling
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	// Start coordinators
	var wg sync.WaitGroup
	for _, coord := range coordinators {
		wg.Add(1)
		go func(c *coordinator.Coordinator) {
			defer wg.Done()
			if err := c.Run(ctx); err != nil && err != context.Canceled {
				logger.Error("coordinator error", "error", err)
			}
		}(coord)
	}

	// Start HTTP server (non-blocking)
	go func() {
		if err := httpServer.Start(ctx); err != nil && err != context.Canceled {
			logger.Error("http server error", "error", err)
		}
	}()

	// Wait for shutdown signal
	sig := <-sigCh
	logger.Info("received shutdown signal", "signal", sig)

	// Cancel context to stop all goroutines
	cancel()

	// Stop coordinators
	for _, coord := range coordinators {
		coord.Stop()
	}

	// Shutdown HTTP server
	if err := httpServer.Shutdown(); err != nil {
		logger.Warn("http server shutdown error", "error", err)
	}

	// Wait for coordinators to finish
	wg.Wait()

	logger.Info("shutdown complete")
	return nil
}
