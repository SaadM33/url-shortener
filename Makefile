# `make` lists every target. Backend lives in backend/, frontend in frontend/, settings in .env.
.DEFAULT_GOAL := help
.PHONY: help up down logs install db api web migrate revision downgrade test lint docs admin

include .env

PYTHON ?= python3

help: ## Show this list
	@awk 'BEGIN {FS = ":.*## "} /^## / {printf "\n%s\n", substr($$0, 4)} /^[a-z-]+:.*## / {printf "  make %-10s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

## Docker: the whole stack on your machine
up: ## Build and start db + redis + api + web
	docker compose up --build -d
	@echo "web: http://localhost:$(WEB_PORT)   api docs: http://localhost:$(API_PORT)/docs"

down: ## Stop the stack (data is kept)
	docker compose down

logs: ## Follow the stack's logs
	docker compose logs -f

## Local development (app on your machine, MySQL and Redis in Docker)
install: ## Install backend and frontend dependencies
	$(PYTHON) -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt
	cd frontend && npm install

db: ## Start local MySQL (mysql-dev, :3307) and Redis (redis-dev, :6380)
	@docker ps -a --format '{{.Names}}' | grep -qx redis-dev || docker run -d --name redis-dev -p 6380:6379 redis:7-alpine >/dev/null
	@docker start redis-dev >/dev/null
	@docker ps -a --format '{{.Names}}' | grep -qx mysql-dev || docker run -d --name mysql-dev \
		-e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=url_shortener -p 3307:3306 mysql:debian >/dev/null
	@docker start mysql-dev >/dev/null
	@for i in $$(seq 1 30); do \
		docker exec mysql-dev mysqladmin ping -h127.0.0.1 -proot --silent >/dev/null 2>&1 && echo "mysql-dev and redis-dev are ready" && exit 0; \
		sleep 1; \
	done; echo "mysql-dev did not become ready"; exit 1

api: db migrate ## Run the API with auto-reload on API_PORT
	cd backend && PYTHONDONTWRITEBYTECODE=1 uvicorn app.main:app --reload --port $(API_PORT)

web: ## Run the frontend dev server on WEB_PORT
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

