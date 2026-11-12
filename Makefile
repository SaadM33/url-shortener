# `make` lists every target. Backend lives in backend/, frontend in frontend/.
.DEFAULT_GOAL := help
.PHONY: help up down logs install db api web migrate revision downgrade test lint docs admin

PYTHON ?= python3

help: ## Show this list
	@awk 'BEGIN {FS = ":.*## "} /^## / {printf "\n%s\n", substr($$0, 4)} /^[a-z-]+:.*## / {printf "  make %-10s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

## Docker: the whole stack
up: ## Build and start db + api + web (ports: WEB_PORT=3000, API_PORT=8000)
	docker compose up --build -d
	@echo "web: http://localhost:$${WEB_PORT:-3000}   api docs: http://localhost:$${API_PORT:-8000}/docs"

down: ## Stop the stack (data is kept)
	docker compose down

logs: ## Follow the stack's logs
	docker compose logs -f

## Local development (app runs on your machine, MySQL in Docker)
install: ## Install backend and frontend dependencies
	$(PYTHON) -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt
	cd frontend && npm install

db: ## Start the local MySQL container (mysql-dev, port 3307)
	@docker ps -a --format '{{.Names}}' | grep -qx mysql-dev || docker run -d --name mysql-dev \
		-e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=url_shortener -p 3307:3306 mysql:debian >/dev/null
	@docker start mysql-dev >/dev/null
	@for i in $$(seq 1 30); do \
		docker exec mysql-dev mysqladmin ping -h127.0.0.1 -proot --silent >/dev/null 2>&1 && echo "mysql-dev is ready" && exit 0; \
		sleep 1; \
	done; echo "mysql-dev did not become ready"; exit 1

api: db migrate ## Run the API with auto-reload on http://localhost:8000
	cd backend && PYTHONDONTWRITEBYTECODE=1 uvicorn app.main:app --reload

web: ## Run the frontend dev server on http://localhost:3000
	cd frontend && npm run dev

## Database migrations
migrate: ## Apply pending migrations
	cd backend && alembic upgrade head

revision: ## Create a migration from model changes (asks for a message)
	@read -p "Migration message: " msg; cd backend && alembic revision --autogenerate -m "$$msg"

downgrade: ## Roll back one migration
	cd backend && alembic downgrade -1

## Checks and tools
test: ## Run the backend tests
	cd backend && $(PYTHON) -m pytest -q

lint: ## Lint and type-check the frontend
	cd frontend && npm run lint && npm run typecheck

docs: ## Regenerate docs/API.md, docs/openapi.json and the frontend's API types
	cd backend && $(PYTHON) -W ignore -m app.cli api-docs
	cd frontend && npm run gen:api

admin: ## Make a registered user an admin: make admin EMAIL=you@example.com
	@test -n "$(EMAIL)" || (echo "usage: make admin EMAIL=you@example.com"; exit 1)
	cd backend && $(PYTHON) -W ignore -m app.cli create-admin $(EMAIL)
