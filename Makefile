.PHONY: install dev run mysql-dev upgrade downgrade revision help

PYTHON ?= python3

help:
	@echo "Available commands:"
	@echo "  make install      Install project dependencies"
	@echo "  make dev          Start MySQL if needed, upgrade if migration files exist, then run the app"
	@echo "  make run          Run the FastAPI app with uvicorn"
	@echo "  make mysql-dev    Start or reuse the local MySQL dev container"
	@echo "  make upgrade      Apply pending Alembic migrations"
	@echo "  make downgrade    Roll back the latest migration"
	@echo "  make revision     Create a new Alembic revision with autogenerate"

install:
	$(PYTHON) -m pip install -r requirements.txt

dev: mysql-dev
	@if [ -d alembic/versions ] && [ "$$(find alembic/versions -maxdepth 1 -type f | wc -l)" -gt 0 ]; then \
		alembic upgrade head; \
	else \
		echo "No Alembic migration files yet; skipping migration step."; \
	fi
	@$(MAKE) run

run:
	@export PYTHONDONTWRITEBYTECODE=1; \
	uvicorn app.main:app --reload

mysql-dev:
	@docker ps -a --format '{{.Names}}' | grep -qx 'mysql-dev' || docker run --name mysql-dev \
		-e MYSQL_ROOT_PASSWORD=root \
		-e MYSQL_DATABASE=url_shortener \
		-p 3307:3306 \
		-d mysql:debian
	@docker start mysql-dev >/dev/null 2>&1 || true
	@echo "Waiting for mysql-dev to accept connections..."; \
	for i in $$(seq 1 30); do \
		if docker exec mysql-dev mysqladmin ping -h127.0.0.1 -proot --silent >/dev/null 2>&1; then \
			echo "mysql-dev is ready"; \
			break; \
		fi; \
		sleep 1; \
		done

upgrade:
	alembic upgrade head

downgrade:
	@read -p "Revision to downgrade to (or leave blank for -1): " target; \
	if [ -n "$$target" ]; then \
		alembic downgrade $$target; \
	else \
		alembic downgrade -1; \
	fi

revision:
	@read -p "Migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"
