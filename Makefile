.PHONY: build run-indexer run-api test clean docker-build help

# Variables
BINARY_NAME=indexer
API_BINARY_NAME=api

build: ## Build the indexer and api binaries
	@echo "Building indexer..."
	go build -o bin/$(BINARY_NAME) ./cmd/indexer
	@echo "Building api..."
	go build -o bin/$(API_BINARY_NAME) ./cmd/api

run-indexer: ## Run the indexer
	go run ./cmd/indexer

run-api: ## Run the API
	go run ./cmd/api

test: ## Run tests
	go test -v ./...

clean: ## Remove binaries
	rm -rf bin/

docker-build: ## Build docker image
	docker build -t indexer .

help: ## Display this help screen
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
