import time
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.models.schemas import AgentRunRequest, AgentRunResponse, HealthResponse
from app.services.observability import AGENT_ERRORS, AGENT_LATENCY, AGENT_RUNS, TOKEN_COST

router = APIRouter()


@router.get("/healthz", response_model=HealthResponse)
async def healthz(request: Request) -> HealthResponse:
    settings = request.app.state.settings
    return HealthResponse(status="ok", service=settings.app_name, environment=settings.environment)


@router.get("/readyz", response_model=HealthResponse)
async def readyz(request: Request) -> HealthResponse:
    settings = request.app.state.settings
    status = "ok"
    cache = request.app.state.cache
    db = request.app.state.db
    if settings.redis_url and not cache.client:
        status = "degraded"
    if settings.postgres_dsn and not db.pool:
        status = "degraded"
    return HealthResponse(
        status=status,
        service=settings.app_name,
        environment=settings.environment,
    )


@router.get("/metrics")
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@router.post("/v1/agent/runs", response_model=AgentRunResponse)
async def create_agent_run(request: Request, payload: AgentRunRequest) -> AgentRunResponse:
    started = time.perf_counter()
    response = await request.app.state.agent.run(payload)
    error = None
    if response.fallback_used:
        AGENT_ERRORS.labels(type="fallback").inc()
        error = response.steps[-1].detail if response.steps else "fallback"

    await request.app.state.db.save_run(
        response=response,
        api_key_hash=getattr(request.state, "api_key_hash", "unknown"),
        prompt=payload.prompt,
        session_id=payload.session_id,
        error=error,
    )
    AGENT_RUNS.labels(
        cached=str(response.cached).lower(),
        fallback=str(response.fallback_used).lower(),
    ).inc()
    AGENT_LATENCY.observe((time.perf_counter() - started) or response.latency_ms / 1000)
    TOKEN_COST.inc(response.token_usage.estimated_cost_usd)
    return response


@router.get("/v1/agent/runs/{run_id}")
async def get_agent_run(request: Request, run_id: UUID) -> dict:
    record = await request.app.state.db.fetch_run(run_id)
    if not record:
        raise HTTPException(status_code=404, detail="run not found")
    return record
