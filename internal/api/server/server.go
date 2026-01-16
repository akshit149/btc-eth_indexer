package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/internal/indexer/internal/api/auth"
	"github.com/internal/indexer/internal/api/config"
	"github.com/internal/indexer/internal/api/query"
	"github.com/internal/indexer/internal/api/service"
	"github.com/internal/indexer/pkg/types"
)

// Server holds the dependencies for the HTTP server
type Server struct {
	cfg     config.ServerConfig
	service *service.Service
	auth    *auth.Middleware
	router  *chi.Mux
	srv     *http.Server
}

// New creates a new HTTP server
func New(cfg config.ServerConfig, svc *service.Service, auth *auth.Middleware) *Server {
	s := &Server{
		cfg:     cfg,
		service: svc,
		auth:    auth,
	}
	s.setupRouter()
	return s
}

func (s *Server) setupRouter() {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Basic CORS for dev
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Adjust for production
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-API-Key"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Public endpoints
	r.Get("/health", s.handleHealth)
	r.Get("/status", s.handleStatus)
	r.Handle("/metrics", promhttp.Handler())

	// Authenticated endpoints
	r.Group(func(r chi.Router) {
		r.Use(s.auth.Handler) // Apply Rate Limit & API Key check

		// Blocks
		r.Get("/blocks/latest", s.handleGetLatestBlock)
		r.Get("/blocks/{chain}/{id}", s.handleGetBlock) // id can be height or hash

		// Transactions
		r.Get("/tx/{chain}/{hash}", s.handleGetTx)
		r.Get("/address/{chain}/{address}/txs", s.handleGetAddressTxs)
		r.Get("/blocks/{chain}/{id}/txs", s.handleGetBlockTxs)         // New endpoint
		r.Get("/txs/latest", s.handleGetLatestTxs)                     // New endpoint
		r.Get("/balance/{chain}/{address}", s.handleGetAddressBalance) // New endpoint

		// Events
		r.Get("/contract/{chain}/{address}/events", s.handleGetContractEvents)
		r.Get("/events", s.handleGetEvents)

		// Stats & Ranges
		r.Get("/stats/{chain}", s.handleGetStats)              // New endpoint
		r.Get("/blocks/{chain}/range", s.handleGetBlocksRange) // New endpoint
	})

	s.router = r
}

// Start starts the HTTP server
func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      s.router,
		ReadTimeout:  s.cfg.ReadTimeout,
		WriteTimeout: s.cfg.WriteTimeout,
	}

	s.srv = srv

	fmt.Printf("Starting API server on %s\n", addr)
	return s.srv.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	if s.srv != nil {
		return s.srv.Shutdown(ctx)
	}
	return nil
}

// Handlers

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]string{"status": "running"})
}

func (s *Server) handleGetLatestBlock(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	// Or query param? Prompt: GET /blocks/latest?chain=btc|eth
	// Let's check query param first as per prompt.
	// Ah, chi handles path params mainly. The routes defined above:
	// r.Get("/blocks/latest", s.handleGetLatestBlock) -> uses query param.

	if chain == "" {
		chain = r.URL.Query().Get("chain")
	}

	if chain == "" {
		http.Error(w, "chain is required", http.StatusBadRequest)
		return
	}

	b, err := s.service.GetLatestBlock(r.Context(), types.ChainID(chain))
	if err != nil {
		internalError(w, err)
		return
	}
	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	// Strip RawData by default to reduce payload size
	if r.URL.Query().Get("include_raw") != "true" {
		b.RawData = nil
	}

	jsonResponse(w, http.StatusOK, b)
}

func (s *Server) handleGetBlock(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	id := chi.URLParam(r, "id") // height or hash

	var b *types.Block
	var err error

	// Check if id is number
	if height, errParse := strconv.ParseUint(id, 10, 64); errParse == nil {
		b, err = s.service.GetBlockByHeight(r.Context(), types.ChainID(chain), height)
	} else {
		b, err = s.service.GetBlockByHash(r.Context(), types.ChainID(chain), id)
	}

	if err != nil {
		internalError(w, err)
		return
	}
	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	// Strip RawData by default
	if r.URL.Query().Get("include_raw") != "true" {
		b.RawData = nil
	}

	jsonResponse(w, http.StatusOK, b)
}

func (s *Server) handleGetTx(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	hash := chi.URLParam(r, "hash")

	tx, err := s.service.GetTx(r.Context(), types.ChainID(chain), hash)
	if err != nil {
		internalError(w, err)
		return
	}
	if tx == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	jsonResponse(w, http.StatusOK, tx)
}

func (s *Server) handleGetBlockTxs(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	id := chi.URLParam(r, "id")
	cursor := r.URL.Query().Get("cursor")
	limitStr := r.URL.Query().Get("limit")
	limit := 25
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	// 1. Get Block Info first
	var block *types.Block
	var err error
	if height, errParse := strconv.ParseUint(id, 10, 64); errParse == nil {
		block, err = s.service.GetBlockByHeight(r.Context(), types.ChainID(chain), height)
	} else {
		block, err = s.service.GetBlockByHash(r.Context(), types.ChainID(chain), id)
	}

	if err != nil {
		internalError(w, err)
		return
	}
	if block == nil {
		http.Error(w, "block not found", http.StatusNotFound)
		return
	}

	// 2. Get Txs
	txs, nextCursor, err := s.service.GetBlockTransactions(r.Context(), types.ChainID(chain), id, cursor, limit)
	if err != nil {
		internalError(w, err)
		return
	}

	// 3. Response Structure
	resp := struct {
		Block struct {
			Chain  types.ChainID `json:"chain"`
			Height uint64        `json:"height"`
			Hash   string        `json:"hash"`
		} `json:"block"`
		Page struct {
			NextCursor string `json:"next_cursor,omitempty"`
			Limit      int    `json:"limit"`
		} `json:"page"`
		Transactions []*types.Transaction `json:"transactions"`
	}{
		Transactions: txs,
	}
	resp.Block.Chain = block.ChainID
	resp.Block.Height = block.Height
	resp.Block.Hash = block.Hash
	resp.Page.NextCursor = nextCursor
	resp.Page.Limit = limit

	jsonResponse(w, http.StatusOK, resp)
}

func (s *Server) handleGetLatestTxs(w http.ResponseWriter, r *http.Request) {
	chain := r.URL.Query().Get("chain")
	if chain == "" {
		http.Error(w, "chain is required", http.StatusBadRequest)
		return
	}
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	txs, err := s.service.GetLatestTransactions(r.Context(), types.ChainID(chain), limit)
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, txs)
}

func (s *Server) handleGetStats(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	stats, err := s.service.GetNetworkStats(r.Context(), types.ChainID(chain))
	if err != nil {
		internalError(w, err)
		return
	}
	if stats == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, stats)
}

func (s *Server) handleGetBlocksRange(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	from, _ := strconv.ParseUint(fromStr, 10, 64)
	to, _ := strconv.ParseUint(toStr, 10, 64)

	blocks, err := s.service.GetBlocksRange(r.Context(), types.ChainID(chain), from, to)
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, blocks)
}

func (s *Server) handleGetAddressTxs(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	address := chi.URLParam(r, "address")
	cursor := r.URL.Query().Get("cursor")
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	txs, nextCursor, err := s.service.GetTransactionsByAddress(r.Context(), types.ChainID(chain), address, cursor, limit)
	if err != nil {
		internalError(w, err)
		return
	}

	resp := struct {
		Data   []*types.Transaction `json:"data"`
		Cursor string               `json:"cursor,omitempty"`
	}{
		Data:   txs,
		Cursor: nextCursor,
	}
	jsonResponse(w, http.StatusOK, resp)
}

func (s *Server) handleGetAddressBalance(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	address := chi.URLParam(r, "address")

	balance, err := s.service.GetAddressBalance(r.Context(), types.ChainID(chain), address)
	if err != nil {
		internalError(w, err)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{
		"address": address,
		"balance": balance,
		"chain":   chain,
	})
}

func (s *Server) handleGetContractEvents(w http.ResponseWriter, r *http.Request) {
	chain := chi.URLParam(r, "chain")
	address := chi.URLParam(r, "address")

	filter := s.parseEventFilter(r)
	filter.ChainID = types.ChainID(chain)
	filter.ContractAddr = address // Override/Set from path

	events, nextCursor, err := s.service.GetEvents(r.Context(), filter)
	if err != nil {
		internalError(w, err)
		return
	}

	resp := struct {
		Data   []*types.Event `json:"data"`
		Cursor string         `json:"cursor,omitempty"`
	}{
		Data:   events,
		Cursor: nextCursor,
	}
	jsonResponse(w, http.StatusOK, resp)
}

func (s *Server) handleGetEvents(w http.ResponseWriter, r *http.Request) {
	filter := s.parseEventFilter(r)

	// Chain is required query param
	chain := r.URL.Query().Get("chain")
	if chain == "" {
		http.Error(w, "chain is required", http.StatusBadRequest)
		return
	}
	filter.ChainID = types.ChainID(chain)

	events, nextCursor, err := s.service.GetEvents(r.Context(), filter)
	if err != nil {
		internalError(w, err)
		return
	}

	resp := struct {
		Data   []*types.Event `json:"data"`
		Cursor string         `json:"cursor,omitempty"`
	}{
		Data:   events,
		Cursor: nextCursor,
	}
	jsonResponse(w, http.StatusOK, resp)
}

func (s *Server) parseEventFilter(r *http.Request) query.EventFilter {
	q := r.URL.Query()
	f := query.EventFilter{
		Topic0: q.Get("topic0"),
		Cursor: q.Get("cursor"),
	}

	if val := q.Get("from_height"); val != "" {
		if h, err := strconv.ParseUint(val, 10, 64); err == nil {
			f.FromHeight = &h
		}
	}
	if val := q.Get("to_height"); val != "" {
		if h, err := strconv.ParseUint(val, 10, 64); err == nil {
			f.ToHeight = &h
		}
	}
	if val := q.Get("limit"); val != "" {
		if l, err := strconv.Atoi(val); err == nil {
			f.Limit = l
		}
	}
	return f
}

func jsonResponse(w http.ResponseWriter, code int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(data)
}

func internalError(w http.ResponseWriter, err error) {
	fmt.Printf("Internal Server Error: %v\n", err)
	http.Error(w, "Internal Server Error", http.StatusInternalServerError)
}
