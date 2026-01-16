package eth

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	ethtypes "github.com/ethereum/go-ethereum/core/types"
)

// ErrNoABI indicates no ABI is available for the contract
var ErrNoABI = errors.New("no ABI available for contract")

// ErrUnknownEvent indicates the event signature is not in the ABI
var ErrUnknownEvent = errors.New("unknown event signature")

// DecodedEvent represents a successfully decoded event
type DecodedEvent struct {
	Name   string                 `json:"name"`
	Params map[string]interface{} `json:"params"`
}

// Decoder handles ABI-based event decoding
type Decoder struct {
	abis map[common.Address]*abi.ABI
}

// NewDecoder creates a new decoder with the given contract ABIs
func NewDecoder(contractABIs map[common.Address]*abi.ABI) *Decoder {
	return &Decoder{
		abis: contractABIs,
	}
}

// DecodeLog attempts to decode a log using the known ABIs
// Returns (decoded, nil) on success
// Returns (nil, error) on failure - caller should store raw log with decode_failed=true
func (d *Decoder) DecodeLog(log ethtypes.Log) (*DecodedEvent, error) {
	if len(log.Topics) == 0 {
		return nil, errors.New("log has no topics")
	}

	contractABI, ok := d.abis[log.Address]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrNoABI, log.Address.Hex())
	}

	// Find event by topic0 (event signature hash)
	event, err := contractABI.EventByID(log.Topics[0])
	if err != nil {
		return nil, fmt.Errorf("%w: %s", ErrUnknownEvent, log.Topics[0].Hex())
	}

	// Decode indexed parameters from topics
	indexed := make([]abi.Argument, 0)
	nonIndexed := make([]abi.Argument, 0)
	for _, input := range event.Inputs {
		if input.Indexed {
			indexed = append(indexed, input)
		} else {
			nonIndexed = append(nonIndexed, input)
		}
	}

	params := make(map[string]interface{})

	// Decode indexed parameters (from topics[1:])
	for i, arg := range indexed {
		if i+1 >= len(log.Topics) {
			break
		}
		// For indexed reference types (string, bytes, arrays), only hash is stored
		if arg.Type.T == abi.StringTy || arg.Type.T == abi.BytesTy || arg.Type.T == abi.SliceTy || arg.Type.T == abi.ArrayTy {
			params[arg.Name] = log.Topics[i+1].Hex() // Store as hash
		} else {
			// Decode simple indexed types
			val, err := decodeIndexedArg(arg.Type, log.Topics[i+1])
			if err != nil {
				params[arg.Name] = log.Topics[i+1].Hex() // Fallback to hex
			} else {
				params[arg.Name] = val
			}
		}
	}

	// Decode non-indexed parameters from data
	if len(nonIndexed) > 0 && len(log.Data) > 0 {
		values, err := event.Inputs.UnpackValues(log.Data)
		if err != nil {
			return nil, fmt.Errorf("unpack data failed: %w", err)
		}

		// Map values to non-indexed arguments
		nonIndexedIdx := 0
		for i, input := range event.Inputs {
			if !input.Indexed {
				if nonIndexedIdx < len(values) {
					params[input.Name] = formatValue(values[i])
					nonIndexedIdx++
				}
			}
		}
	}

	return &DecodedEvent{
		Name:   event.Name,
		Params: params,
	}, nil
}

// HasABI checks if an ABI is available for the given contract
func (d *Decoder) HasABI(address common.Address) bool {
	_, ok := d.abis[address]
	return ok
}

// decodeIndexedArg decodes a simple indexed argument from a topic
func decodeIndexedArg(t abi.Type, topic common.Hash) (interface{}, error) {
	switch t.T {
	case abi.AddressTy:
		return common.BytesToAddress(topic.Bytes()).Hex(), nil
	case abi.BoolTy:
		return topic.Big().Uint64() != 0, nil
	case abi.IntTy, abi.UintTy:
		return topic.Big().String(), nil
	default:
		return topic.Hex(), nil
	}
}

// formatValue converts ABI-decoded values to JSON-safe formats
func formatValue(v interface{}) interface{} {
	switch val := v.(type) {
	case common.Address:
		return val.Hex()
	case common.Hash:
		return val.Hex()
	case []byte:
		return fmt.Sprintf("0x%x", val)
	case [32]byte:
		return fmt.Sprintf("0x%x", val[:])
	default:
		// Try to use Stringer interface for big.Int etc
		if stringer, ok := v.(fmt.Stringer); ok {
			return stringer.String()
		}
		return v
	}
}

// LoadABIFromJSON parses an ABI from JSON bytes
func LoadABIFromJSON(data []byte) (*abi.ABI, error) {
	parsed, err := abi.JSON(strings.NewReader(string(data)))
	if err != nil {
		return nil, fmt.Errorf("parsing ABI JSON: %w", err)
	}
	return &parsed, nil
}

// EncodeDecodedEvent converts DecodedEvent to JSON bytes for storage
func EncodeDecodedEvent(event *DecodedEvent) ([]byte, error) {
	return json.Marshal(event)
}

// HexToAddress converts a hex string to a common.Address
func HexToAddress(hex string) common.Address {
	return common.HexToAddress(hex)
}
