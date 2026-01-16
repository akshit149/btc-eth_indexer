package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

// Config is the root configuration structure
type Config struct {
	Database DatabaseConfig         `yaml:"database"`
	Redis    RedisConfig            `yaml:"redis"`
	Chains   map[string]ChainConfig `yaml:"chains"`
	Server   ServerConfig           `yaml:"server"`
	Logging  LoggingConfig          `yaml:"logging"`
}

// DatabaseConfig holds PostgreSQL connection settings
type DatabaseConfig struct {
	Host           string `yaml:"host"`
	Port           int    `yaml:"port"`
	Name           string `yaml:"name"`
	User           string `yaml:"user"`
	Password       string `yaml:"password"`
	MaxConnections int    `yaml:"max_connections"`
	SSLMode        string `yaml:"ssl_mode"`
}

// DSN returns the PostgreSQL connection string
func (d DatabaseConfig) DSN() string {
	sslMode := d.SSLMode
	if sslMode == "" {
		sslMode = "disable"
	}
	return fmt.Sprintf(
		"host=%s port=%d dbname=%s user=%s password=%s sslmode=%s",
		d.Host, d.Port, d.Name, d.User, d.Password, sslMode,
	)
}

// RedisConfig holds Redis connection settings
type RedisConfig struct {
	Addr          string        `yaml:"addr"`
	Password      string        `yaml:"password"`
	DB            int           `yaml:"db"`
	KeyPrefix     string        `yaml:"key_prefix"`
	CacheTTL      time.Duration `yaml:"cache_ttl"`
	ShortCacheTTL time.Duration `yaml:"short_cache_ttl"`
}

// ChainConfig holds configuration for a single blockchain
type ChainConfig struct {
	Enabled           bool          `yaml:"enabled"`
	RPCURL            string        `yaml:"rpc_url"`
	PollInterval      time.Duration `yaml:"poll_interval"`
	BatchSize         int           `yaml:"batch_size"`
	ConfirmationDepth int           `yaml:"confirmation_depth"`
	StartHeight       uint64        `yaml:"start_height"`
	MaxReorgDepth     int           `yaml:"max_reorg_depth"` // P1 alert if exceeded
	EnableMempool     bool          `yaml:"enable_mempool"`

	// ETH-specific
	LogBatchSize    int              `yaml:"log_batch_size"`    // Max blocks per eth_getLogs call
	UseFinalizedTag bool             `yaml:"use_finalized_tag"` // Use finalized block tag
	Contracts       []ContractConfig `yaml:"contracts,omitempty"`
}

// ContractConfig defines a contract to monitor for events
type ContractConfig struct {
	Address string `yaml:"address"`
	ABIPath string `yaml:"abi_path"`
}

// ServerConfig holds HTTP server settings
type ServerConfig struct {
	HealthPort  int `yaml:"health_port"`
	MetricsPort int `yaml:"metrics_port"`
}

// LoggingConfig holds logging settings
type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"` // "json" or "text"
}

// Load reads configuration from a YAML file and expands environment variables
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading config file: %w", err)
	}

	// Expand environment variables
	expanded := os.ExpandEnv(string(data))

	var cfg Config
	if err := yaml.Unmarshal([]byte(expanded), &cfg); err != nil {
		return nil, fmt.Errorf("parsing config: %w", err)
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("validating config: %w", err)
	}

	cfg.setDefaults()

	return &cfg, nil
}

func (c *Config) validate() error {
	if c.Database.Host == "" {
		return fmt.Errorf("database.host is required")
	}
	if c.Database.Name == "" {
		return fmt.Errorf("database.name is required")
	}

	for name, chain := range c.Chains {
		if chain.Enabled && chain.RPCURL == "" {
			return fmt.Errorf("chains.%s.rpc_url is required when enabled", name)
		}
	}

	return nil
}

func (c *Config) setDefaults() {
	if c.Database.Port == 0 {
		c.Database.Port = 5432
	}
	if c.Database.MaxConnections == 0 {
		c.Database.MaxConnections = 10
	}

	if c.Server.HealthPort == 0 {
		c.Server.HealthPort = 8080
	}
	if c.Server.MetricsPort == 0 {
		c.Server.MetricsPort = 9090
	}

	if c.Logging.Level == "" {
		c.Logging.Level = "info"
	}
	if c.Logging.Format == "" {
		c.Logging.Format = "json"
	}

	for name, chain := range c.Chains {
		if chain.PollInterval == 0 {
			if name == "btc" {
				chain.PollInterval = 10 * time.Second
			} else {
				chain.PollInterval = 2 * time.Second
			}
		}
		if chain.BatchSize == 0 {
			chain.BatchSize = 100
		}
		if chain.ConfirmationDepth == 0 {
			if name == "btc" {
				chain.ConfirmationDepth = 6
			} else {
				chain.ConfirmationDepth = 12
			}
		}
		if chain.MaxReorgDepth == 0 {
			chain.MaxReorgDepth = 100 // Default max reorg depth before P1 alert
		}
		// ETH-specific defaults
		if name == "eth" {
			if chain.LogBatchSize == 0 {
				chain.LogBatchSize = 2000 // Default blocks per eth_getLogs
			}
			// UseFinalizedTag defaults to true for ETH
			// (zero value is false, so we check explicitly if not set)
		}
		c.Chains[name] = chain
	}
}
