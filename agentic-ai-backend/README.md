# Production Agentic AI Backend Service

FastAPI backend that demonstrates production-oriented agent orchestration with Anthropic Claude through LangChain, authentication, rate limiting, Redis caching, PostgreSQL persistence, observability, regression tests, Docker Compose, and CI.

## Capabilities

- REST API with API-key authentication middleware and per-key rate limiting.
- Async FastAPI request handling for concurrent multi-user LLM workloads.
- LangChain `ChatAnthropic` orchestration using tool calling, structured output validation, and deterministic fallback behavior.
- Redis prompt-response caching to reduce repeated inference cost.
- PostgreSQL persistence for agent runs, latency, token usage, cost estimates, and errors.
- Health, readiness, and Prometheus metrics endpoints.
- Pytest regression coverage and GitHub Actions CI.

## Local Development

```bash
cd agentic-ai-backend
cp .env.example .env
docker compose up --build
```

The API listens on `http://localhost:8000`.

For a no-Docker local run, install dependencies and start FastAPI directly:

```bash
pip install -e ".[dev]"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The service falls back to in-memory cache/storage if local Redis or PostgreSQL are not running.

```bash
curl -X POST http://localhost:8000/v1/agent/runs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -d "{\"prompt\":\"Design a rollout plan for a support-ticket triage agent.\"}"
```

If `ANTHROPIC_API_KEY` is empty, the service returns a deterministic fallback response while still exercising persistence, rate limiting, metrics, and caching paths.

## Do Not Commit

- `.env` because it can contain API keys and database credentials.
- `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, and `*.egg-info/` because they are generated locally.
- `.venv/` or `venv/` because virtual environments are machine-specific and can be recreated.

## Tests

```bash
cd agentic-ai-backend
pip install -e ".[dev]"
pytest
ruff check .
```
