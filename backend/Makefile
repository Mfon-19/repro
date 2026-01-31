.PHONY: run test tidy

run:
	@if [ -f .env ]; then \
		set -a; . ./.env; set +a; \
	fi; \
	go run ./cmd/api

test:
	go test ./...

tidy:
	go mod tidy
