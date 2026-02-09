.PHONY: dev db

dev:
	@echo "Starting Next.js dev server"
	@if [ ! -d node_modules/next ]; then \
		echo "Installing dependencies..."; \
		npm install; \
	fi
	@npm run dev

db:
	@if [ -z "$$POSTGRES_URL" ]; then \
		echo "POSTGRES_URL is not set"; \
		exit 1; \
	fi
	@psql "$$POSTGRES_URL" -f sql/schema.sql
