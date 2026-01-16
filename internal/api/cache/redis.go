package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/internal/indexer/internal/api/config"
	"github.com/redis/go-redis/v9"
)

// Cache defines the interface for caching
type Cache interface {
	Get(ctx context.Context, key string, dest interface{}) (bool, error)
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Incr(ctx context.Context, key string, ttl time.Duration) (int64, error)
	Close() error
}

// RedisCache implements Cache using Redis
type RedisCache struct {
	client *redis.Client
	cfg    config.RedisConfig
}

// NewRedisCache creates a new RedisCache
func NewRedisCache(cfg config.RedisConfig) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr,
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}

	return &RedisCache{
		client: client,
		cfg:    cfg,
	}, nil
}

func (c *RedisCache) Close() error {
	return c.client.Close()
}

// Get retrieves a value from cache and unmarshals it into dest.
// Returns true if found, false if not found.
func (c *RedisCache) Get(ctx context.Context, key string, dest interface{}) (bool, error) {
	val, err := c.client.Get(ctx, c.cfg.KeyPrefix+key).Bytes()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("redis get: %w", err)
	}

	if err := json.Unmarshal(val, dest); err != nil {
		return false, fmt.Errorf("json unmarshal: %w", err)
	}

	return true, nil
}

// Set stores a value in cache with TTL
func (c *RedisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	bytes, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("json marshal: %w", err)
	}

	if ttl == 0 {
		ttl = c.cfg.CacheTTL
	}

	if err := c.client.Set(ctx, c.cfg.KeyPrefix+key, bytes, ttl).Err(); err != nil {
		return fmt.Errorf("redis set: %w", err)
	}

	return nil
}

// Incr increments a key and sets expiration if it's new
func (c *RedisCache) Incr(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	pipe := c.client.Pipeline()
	incr := pipe.Incr(ctx, c.cfg.KeyPrefix+key)
	pipe.Expire(ctx, c.cfg.KeyPrefix+key, ttl)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, fmt.Errorf("redis incr: %w", err)
	}

	return incr.Val(), nil
}

// Helper methods for key generation

func BlockKey(chainID, hash string) string {
	return fmt.Sprintf("block:%s:%s", chainID, hash)
}

func BlockHeightKey(chainID string, height uint64) string {
	return fmt.Sprintf("block:%s:%d", chainID, height)
}

func LatestBlockKey(chainID string) string {
	return fmt.Sprintf("block:%s:latest", chainID)
}

func TxKey(chainID, hash string) string {
	return fmt.Sprintf("tx:%s:%s", chainID, hash)
}
