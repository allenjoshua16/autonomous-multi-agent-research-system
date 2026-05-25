# Production Agentic AI Backend Service

This project is a portfolio-ready AI backend and web console. The backend is built with Python, FastAPI, LangChain, Docker, PostgreSQL, and Redis. The frontend is a React/Vite dashboard that lets you submit prompts, view structured agent responses, inspect fallback behavior, and see latency, cache, token, and cost metadata.

The service can call Anthropic Claude when `ANTHROPIC_API_KEY` is configured. If no paid Anthropic key is available, it still runs in fallback mode so the API, auth, caching, logging, metrics, and tests can be demonstrated locally.

## What It Does

- Exposes a REST endpoint at `POST /v1/agent/runs`.
- Protects API routes with an `X-API-Key` header.
- Applies per-key rate limiting.
- Runs async agent orchestration with structured responses.
- Uses deterministic fallback handling when the LLM provider is unavailable.
- Tracks latency, token usage, estimated cost, cache status, and errors.
- Supports Redis caching and PostgreSQL persistence.
- Includes Docker Compose and GitHub Actions CI.
- Provides a React web console for easier local demos.

## Project Structure

- `agentic-ai-backend/` - FastAPI backend service.
- `agentic-ai-backend/app/` - API routes, middleware, agent orchestration, cache, database, and observability code.
- `agentic-ai-backend/tests/` - Backend regression tests.
- `src/` - React/Vite frontend web console.
- `.github/workflows/agentic-ai-backend.yml` - CI workflow for backend linting and tests.

## Install Dependencies

From the project root:

```powershell
npm install
```

Then install backend dependencies:

```powershell
cd agentic-ai-backend
python -m pip install -e ".[dev]"
```

## Run The Backend Locally

```powershell
cd agentic-ai-backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check:

```text
http://127.0.0.1:8000/healthz
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## Test The Main AI Endpoint

Open a second PowerShell window:

```powershell
$headers = @{ "X-API-Key" = "local-dev-key" }
$body = @{ prompt = "Test the main AI endpoint in fallback mode." } | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/v1/agent/runs" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

If `ANTHROPIC_API_KEY` is empty, the response should include:

```json
"fallback_used": true
```

## Run The Web Console

From the project root:

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Run Checks

Frontend:

```powershell
npm test -- --run
npm run lint
npm run build
```

Backend:

```powershell
cd agentic-ai-backend
python -m pytest
python -m ruff check .
```

## Docker Compose

For a fuller local stack with PostgreSQL and Redis:

```powershell
cd agentic-ai-backend
Copy-Item .env.example .env
docker compose up --build
```

## Files Not Meant To Be Pushed

These files and folders are intentionally ignored by Git:

- `.env` and `.env.*` - may contain API keys, passwords, database URLs, or other secrets.
- `node_modules/` - installed JavaScript dependencies; recreated with `npm install`.
- `dist/` and `dist-ssr/` - generated frontend build output; recreated with `npm run build`.
- `.vercel/` - local deployment metadata.
- `__pycache__/`, `*.pyc`, and `*.pyo` - generated Python bytecode.
- `*.egg-info/` - generated Python package metadata from editable installs.
- `.pytest_cache/`, `.ruff_cache/`, and `.mypy_cache/` - local tool caches.
- `.venv/` and `venv/` - local Python virtual environments.
- `logs/` and `*.log` - local runtime/debug logs.
- `screenshots/` and `datastory/` - local/generated project artifacts that are not needed to run the app.

The committed `.env.example` file is safe to push because it documents required environment variables without containing real secrets.
