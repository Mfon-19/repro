.PHONY: run dev

run:
	uvicorn app.main:app --host 0.0.0.0 --port 8080

dev:
	@if [ -f .env ]; then \
		set -a; . ./.env; set +a; \
	fi; \
	uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
