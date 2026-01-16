package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

// Config is the root configuration structure
type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	Redis    RedisConfig    `yaml:"redis"`
	Auth     AuthConfig     `yaml:"auth"`
	Logging  LoggingConfig  `yaml:"logging"`
}

// ServerConfig holds HTTP server settings
type ServerConfig struct {
	Port            int           `yaml:"port"`
	ReadTimeout     time.Duration `yaml:"read_timeout"`
	WriteTimeout    time.Duration `yaml:"write_timeout"`
	ShutdownTimeout time.Duration `yaml:"shutdown_timeout"`
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

// RedisConfig holds Redis connection settings
type RedisConfig struct {
	Addr          string        `yaml:"addr"`
	Password      string        `yaml:"password"`
	DB            int           `yaml:"db"`
	KeyPrefix     string        `yaml:"key_prefix"`
	CacheTTL      time.Duration `yaml:"cache_ttl"`
	ShortCacheTTL time.Duration `yaml:"short_cache_ttl"` // For volatile data like latest block
}

// AuthConfig holds API authentication settings
type AuthConfig struct {
	RateLimitRequests int           `yaml:"rate_limit_requests"`
	RateLimitWindow   time.Duration `yaml:"rate_limit_window"`
}

// LoggingConfig holds logging settings
type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"` // "json" or "text"
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
	if c.Redis.Addr == "" {
		return fmt.Errorf("redis.addr is required")
	}
	return nil
}

func (c *Config) setDefaults() {
	if c.Server.Port == 0 {
		c.Server.Port = 8080
	}
	if c.Server.ReadTimeout == 0 {
		c.Server.ReadTimeout = 5 * time.Second
	}
	if c.Server.WriteTimeout == 0 {
		c.Server.WriteTimeout = 10 * time.Second
	}
	if c.Server.ShutdownTimeout == 0 {
		c.Server.ShutdownTimeout = 5 * time.Second
	}

	if c.Database.Port == 0 {
		c.Database.Port = 5432
	}
	if c.Database.MaxConnections == 0 {
		c.Database.MaxConnections = 10
	}

	if c.Redis.CacheTTL == 0 {
		c.Redis.CacheTTL = 5 * time.Minute
	}
	if c.Redis.ShortCacheTTL == 0 {
		c.Redis.ShortCacheTTL = 15 * time.Second
	}

	if c.Auth.RateLimitRequests == 0 {
		c.Auth.RateLimitRequests = 1000
	}
	if c.Auth.RateLimitWindow == 0 {
		c.Auth.RateLimitWindow = 1 * time.Second
	}

	if c.Logging.Level == "" {
		c.Logging.Level = "info"
	}
	if c.Logging.Format == "" {
		c.Logging.Format = "json"
	}
}
