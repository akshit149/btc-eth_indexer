package eth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"log/slog"
	"os"
)

func TestPoller_ChainID(t *testing.T) {
	poller := NewPoller("http://localhost:8545", 100, 2000, true, 12, nil, slog.New(slog.NewTextHandler(os.Stdout, nil)))

	if poller.ChainID() != "eth" {
		t.Errorf("expected chain ID 'eth', got '%s'", poller.ChainID())
	}
}

func TestPoller_GetMetrics(t *testing.T) {
	poller := NewPoller("http://localhost:8545", 100, 2000, true, 12, nil, slog.New(slog.NewTextHandler(os.Stdout, nil)))

	logs, decodeFailures, rateLimits, rangeReductions := poller.GetMetrics()

	// Initial metrics should be zero
	if logs != 0 || decodeFailures != 0 || rateLimits != 0 || rangeReductions != 0 {
		t.Error("expected all metrics to be zero initially")
	}
}

func TestParseHexUint64(t *testing.T) {
	tests := []struct {
		input    string
		expected uint64
		hasError bool
	}{
		{"0x0", 0, false},
		{"0x1", 1, false},
		{"0xa", 10, false},
		{"0xff", 255, false},
		{"0x100", 256, false},
		{"0x1234567890abcdef", 0x1234567890abcdef, false},
		{"", 0, true},
		{"x", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result, err := parseHexUint64(tt.input)
			if tt.hasError && err == nil {
				t.Error("expected error")
			}
			if !tt.hasError && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if !tt.hasError && result != tt.expected {
				t.Errorf("expected %d, got %d", tt.expected, result)
			}
		})
	}
}

func TestParseHexBigInt(t *testing.T) {
	result := parseHexBigInt("0x100")
	if result.Int64() != 256 {
		t.Errorf("expected 256, got %d", result.Int64())
	}

	result = parseHexBigInt("")
	if result.Int64() != 0 {
		t.Errorf("expected 0 for empty string, got %d", result.Int64())
	}
}

func TestIsHexString(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"0x1234", true},
		{"0xabcdef", true},
		{"0xABCDEF", true},
		{"1234", false},
		{"0x", true},
		{"0xghij", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := isHexString(tt.input)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestIsRateLimitError(t *testing.T) {
	tests := []struct {
		input    error
		expected bool
	}{
		{nil, false},
		{fmt.Errorf("rate limited: HTTP 429"), true},
		{fmt.Errorf("some other error"), false},
	}

	for _, tt := range tests {
		result := isRateLimitError(tt.input)
		if result != tt.expected {
			t.Errorf("expected %v for error '%v', got %v", tt.expected, tt.input, result)
		}
	}
}

func TestIsRangeTooLargeError(t *testing.T) {
	tests := []struct {
		input    error
		expected bool
	}{
		{nil, false},
		{fmt.Errorf("query returned more than 10000 results"), true},
		{fmt.Errorf("block range too large"), true},
		{fmt.Errorf("some other error"), false},
	}

	for _, tt := range tests {
		result := isRangeTooLargeError(tt.input)
		if result != tt.expected {
			t.Errorf("expected %v for error '%v', got %v", tt.expected, tt.input, result)
		}
	}
}

// MockRPCServer creates a mock Ethereum JSON-RPC server for testing
func mockRPCServer(handler func(method string, params interface{}) interface{}) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Method string      `json:"method"`
			Params interface{} `json:"params"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		result := handler(req.Method, req.Params)

		resp := map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      1,
			"result":  result,
		}
		json.NewEncoder(w).Encode(resp)
	}))
}

func TestPoller_GetChainTip(t *testing.T) {
	server := mockRPCServer(func(method string, params interface{}) interface{} {
		if method == "eth_blockNumber" {
			return "0x100" // Block 256
		}
		return nil
	})
	defer server.Close()

	poller := NewPoller(server.URL, 100, 2000, true, 12, nil, slog.New(slog.NewTextHandler(os.Stdout, nil)))

	tip, err := poller.GetChainTip(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if tip != 256 {
		t.Errorf("expected tip 256, got %d", tip)
	}
}

func TestPoller_Poll_AtTip(t *testing.T) {
	server := mockRPCServer(func(method string, params interface{}) interface{} {
		if method == "eth_blockNumber" {
			return "0x100" // Block 256
		}
		return nil
	})
	defer server.Close()

	poller := NewPoller(server.URL, 100, 2000, true, 12, nil, slog.New(slog.NewTextHandler(os.Stdout, nil)))

	// Poll when already at tip
	blocks, txs, err := poller.Poll(context.Background(), 256)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(blocks) != 0 {
		t.Errorf("expected no blocks when at tip, got %d", len(blocks))
	}
	if len(txs) != 0 {
		t.Errorf("expected no txs when at tip, got %d", len(txs))
	}
}
