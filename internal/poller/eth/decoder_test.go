package eth

import (
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	ethtypes "github.com/ethereum/go-ethereum/core/types"
)

func TestDecoder_NoABI(t *testing.T) {
	decoder := NewDecoder(nil)

	log := ethtypes.Log{
		Address: common.HexToAddress("0x1234567890123456789012345678901234567890"),
		Topics: []common.Hash{
			common.HexToHash("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"), // Transfer
		},
		Data: []byte{},
	}

	_, err := decoder.DecodeLog(log)
	if err == nil {
		t.Error("expected error for missing ABI")
	}
}

func TestDecoder_NoTopics(t *testing.T) {
	decoder := NewDecoder(nil)

	log := ethtypes.Log{
		Address: common.HexToAddress("0x1234567890123456789012345678901234567890"),
		Topics:  []common.Hash{},
		Data:    []byte{},
	}

	_, err := decoder.DecodeLog(log)
	if err == nil {
		t.Error("expected error for log with no topics")
	}
}

func TestDecoder_HasABI(t *testing.T) {
	contractAddr := common.HexToAddress("0x1234567890123456789012345678901234567890")

	// Minimal ERC20 Transfer event ABI
	abiJSON := `[{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]`

	parsedABI, err := LoadABIFromJSON([]byte(abiJSON))
	if err != nil {
		t.Fatalf("failed to parse ABI: %v", err)
	}

	abiMap := map[common.Address]*abi.ABI{
		contractAddr: parsedABI,
	}
	decoder := NewDecoder(abiMap)

	if !decoder.HasABI(contractAddr) {
		t.Error("expected HasABI to return true for known contract")
	}

	unknownAddr := common.HexToAddress("0x0000000000000000000000000000000000000001")
	if decoder.HasABI(unknownAddr) {
		t.Error("expected HasABI to return false for unknown contract")
	}
}

func TestLoadABIFromJSON_Valid(t *testing.T) {
	abiJSON := `[{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"}],"name":"Transfer","type":"event"}]`

	parsed, err := LoadABIFromJSON([]byte(abiJSON))
	if err != nil {
		t.Fatalf("failed to parse valid ABI: %v", err)
	}

	if parsed == nil {
		t.Error("expected non-nil ABI")
	}
}

func TestLoadABIFromJSON_Invalid(t *testing.T) {
	invalidJSON := `{not valid json}`

	_, err := LoadABIFromJSON([]byte(invalidJSON))
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestHexToAddress(t *testing.T) {
	addr := HexToAddress("0x1234567890123456789012345678901234567890")
	expected := common.HexToAddress("0x1234567890123456789012345678901234567890")

	if addr != expected {
		t.Errorf("expected %s, got %s", expected.Hex(), addr.Hex())
	}
}

func TestFormatValue(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected interface{}
	}{
		{"address", common.HexToAddress("0x1234"), "0x0000000000000000000000000000000000001234"},
		{"bytes", []byte{0x01, 0x02}, "0x0102"},
		{"string", "hello", "hello"},
		{"int", 42, 42},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatValue(tt.input)
			// For addresses, check hex representation
			if addr, ok := result.(string); ok {
				if exp, ok := tt.expected.(string); ok && addr != exp {
					t.Errorf("expected %v, got %v", tt.expected, result)
				}
			}
		})
	}
}
