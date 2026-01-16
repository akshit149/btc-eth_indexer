# Build stage
FROM golang:1.25.4-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /indexer ./cmd/indexer

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy binary
COPY --from=builder /indexer /app/indexer
COPY configs/config.yaml /app/config.yaml

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:8080/healthz || exit 1

# Expose ports
EXPOSE 8080 9090

ENTRYPOINT ["/app/indexer"]
CMD ["-config", "/app/config.yaml"]
