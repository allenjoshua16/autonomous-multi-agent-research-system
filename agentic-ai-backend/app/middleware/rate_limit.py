import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import Settings
from app.middleware.auth import PUBLIC_PATHS


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings) -> None:
        super().__init__(app)
        self.settings = settings

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        identity = request.headers.get("X-API-Key")
        if not identity:
            identity = request.client.host if request.client else "unknown"
        window = int(time.time() // 60)
        cache = request.app.state.cache
        count = await cache.increment_window(f"rate:{identity}:{window}", ttl_seconds=70)
        if count > self.settings.rate_limit_per_minute:
            return Response("Rate limit exceeded", status_code=429)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.settings.rate_limit_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            max(self.settings.rate_limit_per_minute - count, 0)
        )
        return response
