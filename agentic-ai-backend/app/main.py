from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.middleware.auth import ApiKeyAuthMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.services.agent import AgentOrchestrator
from app.services.cache import CacheClient
from app.services.database import Database


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)

    cache = CacheClient(settings.redis_url, settings.cache_ttl_seconds)
    db = Database(settings.postgres_dsn)
    await cache.connect()
    await db.connect()

    app.state.settings = settings
    app.state.cache = cache
    app.state.db = db
    app.state.agent = AgentOrchestrator(settings, cache)
    yield
    await db.close()
    await cache.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-API-Key"],
    )
    app.add_middleware(RateLimitMiddleware, settings=settings)
    app.add_middleware(ApiKeyAuthMiddleware, settings=settings)
    app.include_router(router)
    return app


app = create_app()
