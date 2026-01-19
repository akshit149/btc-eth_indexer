# Blockchain Indexer Service

## 📖 Project Overview

This project is a high-performance, scalable Blockchain Indexer designed to ingest, process, and serve data from **Bitcoin (BTC)** and **Ethereum (ETH)** networks. It provides a robust backend for querying blockchain data and a modern React-based frontend for visualization.

The system is composed of three main components:
1.  **Indexer Service**: Polls the blockchain RPC nodes, handles chain reorganizations, and stores structured data in PostgreSQL.
2.  **Query API**: A RESTful API that serves the indexed data to consumers with caching (Redis) and rate limiting.
3.  **Web Dashboard**: A modern Next.js application that allows users to explore blocks, transactions, and network statistics in real-time.

---

## 🏗 Architecture

The architecture follows a microservices pattern optimized for data integrity and speed.

-   **Poller**: Fetches raw blocks from BTC/ETH RPC endpoints.
-   **Coordinator**: Manages the indexing flow and ensures data consistency.
-   **Reorg Handler**: Detects and handles blockchain reorganizations to prevent invalid data.
-   **Storage**: Uses **PostgreSQL** for persistent relational data and **Redis** for caching hot data and API rate limiting.

### Tech Stack

-   **Backend**: Go (Golang) 1.25+
-   **Frontend**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui
-   **Database**: PostgreSQL 16
-   **Cache**: Redis 7.2
-   **Infrastructure**: Docker, Docker Compose

---

## 🚀 Getting Started

### Prerequisites

-   [Docker](https://www.docker.com/) & Docker Compose
-   [Go](https://go.dev/) (1.25 or later) - *If running locally without Docker*
-   [Node.js](https://nodejs.org/) (20 or later) - *If running frontend locally*

### Option 1: Quick Start with Docker (Recommended)

The easiest way to run the entire stack is using Docker Compose.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd Indexer
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the root directory (or ensure the `docker-compose.yaml` defaults work for you). You **must** provide valid RPC URLs for standard indexing.
    ```bash
    # Example .env
    BTC_RPC_URL=http://user:pass@localhost:8332
    ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
    ```

3.  **Start the Services:**
    ```bash
    docker-compose up --build
    ```

    This will spin up:
    -   **Postgres**: `localhost:5432`
    -   **Redis**: `localhost:6379`
    -   **Indexer**: `localhost:9091` (Metrics), service logs will show indexing progress.
    -   **Query API**: `localhost:8081`
    -   **Web Dashboard**: `http://localhost:3000`
    -   **pgAdmin**: `http://localhost:5050` (DB Management)
    -   **Redis Commander**: `http://localhost:8082` (Redis UI)

---

### Option 2: Run Locally (Development)

If you prefer to run components individually for development:

#### 1. Start Infrastructure (DB & Redis)
You can still use Docker for the databases while running code locally.
```bash
docker-compose up -d postgres redis
```

#### 2. Run the Indexer
```bash
# Set necessary environment variables
export DB_HOST=localhost
export DB_USER=indexer
export DB_PASSWORD=indexer
export DB_NAME=indexer
export REDIS_ADDR=localhost:6379
export BTC_RPC_URL=<your_btc_rpc_url>
export ETH_RPC_URL=<your_eth_rpc_url>

# Run using Makefile
make run-indexer
```

#### 3. Run the API
```bash
# In a new terminal
export DB_HOST=localhost
export DB_USER=indexer
export DB_PASSWORD=indexer
export DB_NAME=indexer
export REDIS_ADDR=localhost:6379
export SERVER_PORT=8080

# Run using Makefile
make run-api
```

#### 4. Run the Web Dashboard
```bash
cd web
npm install
npm run dev
```
Access the dashboard at `http://localhost:3000`.

---

## 🛠 Configuration

The system is configured via environment variables.

| Variable | Description | Default (Docker) |
| :--- | :--- | :--- |
| `BTC_RPC_URL` | **Required**. URL for Bitcoin RPC | - |
| `ETH_RPC_URL` | **Required**. URL for Ethereum RPC | - |
| `DB_HOST` | PostgreSQL Hostname | `postgres` |
| `DB_PORT` | PostgreSQL Port | `5432` |
| `DB_USER` | PostgreSQL User | `indexer` |
| `DB_PASSWORD` | PostgreSQL Password | `indexer` |
| `DB_NAME` | Database Name | `indexer` |
| `REDIS_ADDR` | Redis Address | `redis:6379` |
| `SERVER_PORT` | API Server Port | `8080` |
| `AUTH_RATELIMIT_REQUESTS`| API Rate Limit | `1000` |

---

## 📡 API Documentation

The Query API provides endpoints to retrieve indexed data.
The OpenAPI specification is available in `openapi.yaml`.

**Common Endpoints:**
-   `GET /health`: Health check
-   `GET /api/v1/blocks`: List latest blocks
-   `GET /api/v1/tx/:hash`: Get transaction details

---

## 📂 Project Structure

```
├── cmd/                # Entry points for the application
│   ├── indexer/        # Main indexer binary
│   └── api/            # Query API binary
├── internal/           # Private application code
│   ├── api/            # API handlers and routes
│   ├── config/         # Configuration loading
│   ├── coordinator/    # Indexing orchestration
│   ├── poller/         # Blockchain RPC polling logic
│   ├── storage/        # Database and Redis layer
│   └── reorg/          # Reorganization handling
├── pkg/                # Public library code
├── web/                # Next.js Frontend
├── docker-compose.yaml # Docker orchestration
└── Makefile            # Build and run commands
```

## 🤝 Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

---

## 📄 License

[MIT](LICENSE)
