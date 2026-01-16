# Blockchain Query API

A production-grade, read-only API service for querying indexed blockchain data (BTC + ETH).

## Architecture

- **Language**: Go 1.25
- **Framework**: Chi
- **Database**: PostgreSQL (Read-only access)
- **Cache**: Redis (Cache-aside pattern)
- **Deployment**: Docker + Docker Compose

## Features

- **Read-Only**: Strictly read-only SQL queries.
- **Caching**: Multi-level Redis caching (Latest blocks, block lookups, transactions).
- **Security**: API Key authentication and Rate Limiting.
- **Observability**: Prometheus metrics at `/metrics` and structured logging.
- **Pagination**: Cursor-based pagination for large datasets.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Go 1.25+ (for local development)

### Running with Docker Compose

This spins up Postgres, Redis, the Indexer (dummy/existing), and the Query API.

```bash
docker-compose up --build
```

The API will be available at `http://localhost:8081`.

### Configuration

Configuration is handled via Environment Variables (defined in `docker-compose.yaml`):

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PORT` | HTTP Port | 8080 |
| `DATABASE_HOST` | Postgres Host | localhost |
| `REDIS_ADDR` | Redis Address | localhost:6379 |
| `AUTH_RATELIMIT_REQUESTS` | Requests per window | 1000 |

### API Usage

**Authentication**:
All endpoints require `X-API-Key` header (except `/health` and `/status`).
For development, any non-empty string matches basic validation.

**Endpoints**:

- `GET /blocks/latest?chain=eth`
- `GET /blocks/btc/123456`
- `GET /tx/eth/0x...`
- `GET /address/eth/0x.../txs`

See `openapi.yaml` for full specification.
