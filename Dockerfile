FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app

# uv binary pinned for reproducible builds.
COPY --from=ghcr.io/astral-sh/uv:0.9.17 /uv /uvx /bin/

# Install dependencies first so Docker can cache this layer
# while the application source code changes.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

# Copy the rest of the application source and install the project itself
# so the `backend` package is importable regardless of the working directory.
COPY . .
RUN uv sync --locked --no-dev

# Railway injects $PORT at runtime; default to 8000 for local docker runs.
# Run migrations before starting the server so the schema is always current.
CMD ["sh", "-c", "uv run --no-dev alembic upgrade head && uv run --no-dev uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
