from collections.abc import Awaitable, Callable
from hashlib import sha256

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import Settings

PUBLIC_PATHS = {"/healthz", "/readyz", "/metrics", "/docs", "/openapi.json", "/redoc"}


class ApiKeyAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings) -> None:
        super().__init__(app)
        self.settings = settings

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        api_key = request.headers.get("X-API-Key")
        if not api_key or api_key not in self.settings.allowed_api_keys:
            return Response("Unauthorized", status_code=401)

        request.state.api_key_hash = sha256(api_key.encode("utf-8")).hexdigest()
        return await call_next(request)
