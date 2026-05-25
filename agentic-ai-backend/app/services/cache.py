import json
import logging
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


class CacheClient:
    def __init__(self, redis_url: str | None, ttl_seconds: int) -> None:
        self.redis_url = redis_url
        self.ttl_seconds = ttl_seconds
        self.client: Redis | None = None
        self.memory: dict[str, str] = {}

    async def connect(self) -> None:
        if not self.redis_url:
            return
        self.client = Redis.from_url(self.redis_url, decode_responses=True)
        try:
            await self.client.ping()
        except RedisError as exc:
            logger.warning("redis_unavailable_using_memory_cache", extra={"error": str(exc)})
            await self.client.aclose()
            self.client = None

    async def close(self) -> None:
        if self.client:
            await self.client.aclose()

    async def get_json(self, key: str) -> dict[str, Any] | None:
        raw = await self.client.get(key) if self.client else self.memory.get(key)
        if not raw:
            return None
        return json.loads(raw)

    async def set_json(self, key: str, value: dict[str, Any]) -> None:
        raw = json.dumps(value, default=str)
        if self.client:
            await self.client.setex(key, self.ttl_seconds, raw)
            return
        self.memory[key] = raw

    async def increment_window(self, key: str, ttl_seconds: int) -> int:
        if self.client:
            value = await self.client.incr(key)
            if value == 1:
                await self.client.expire(key, ttl_seconds)
            return int(value)

        value = int(self.memory.get(key, "0")) + 1
        self.memory[key] = str(value)
        return value
