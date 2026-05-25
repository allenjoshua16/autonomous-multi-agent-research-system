import json
import logging
from typing import Any
from uuid import UUID

import asyncpg

from app.models.schemas import AgentRunResponse

logger = logging.getLogger(__name__)


class Database:
    def __init__(self, dsn: str | None) -> None:
        self.dsn = dsn
        self.pool: asyncpg.Pool | None = None
        self.records: list[dict[str, Any]] = []

    async def connect(self) -> None:
        if not self.dsn:
            return
        try:
            self.pool = await asyncpg.create_pool(self.dsn, min_size=1, max_size=10)
            await self.ensure_schema()
        except (OSError, asyncpg.PostgresError) as exc:
            logger.warning("postgres_unavailable_using_memory_store", extra={"error": str(exc)})
            if self.pool:
                await self.pool.close()
            self.pool = None

    async def close(self) -> None:
        if self.pool:
            await self.pool.close()

    async def ensure_schema(self) -> None:
        if not self.pool:
            return
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS agent_runs (
                    run_id UUID PRIMARY KEY,
                    api_key_hash TEXT NOT NULL,
                    session_id TEXT,
                    prompt TEXT NOT NULL,
                    response JSONB NOT NULL,
                    cached BOOLEAN NOT NULL,
                    fallback_used BOOLEAN NOT NULL,
                    latency_ms DOUBLE PRECISION NOT NULL,
                    input_tokens INTEGER NOT NULL,
                    output_tokens INTEGER NOT NULL,
                    estimated_cost_usd DOUBLE PRECISION NOT NULL,
                    error TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at
                    ON agent_runs (created_at DESC);
                """
            )

    async def save_run(
        self,
        *,
        response: AgentRunResponse,
        api_key_hash: str,
        prompt: str,
        session_id: str | None,
        error: str | None = None,
    ) -> None:
        payload = response.model_dump(mode="json")
        if not self.pool:
            self.records.append(
                {
                    "run_id": str(response.run_id),
                    "api_key_hash": api_key_hash,
                    "session_id": session_id,
                    "prompt": prompt,
                    "response": payload,
                    "error": error,
                }
            )
            return

        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO agent_runs (
                    run_id, api_key_hash, session_id, prompt, response, cached,
                    fallback_used, latency_ms, input_tokens, output_tokens,
                    estimated_cost_usd, error
                )
                VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12)
                """,
                response.run_id,
                api_key_hash,
                session_id,
                prompt,
                json.dumps(payload),
                response.cached,
                response.fallback_used,
                response.latency_ms,
                response.token_usage.input_tokens,
                response.token_usage.output_tokens,
                response.token_usage.estimated_cost_usd,
                error,
            )

    async def fetch_run(self, run_id: UUID) -> dict[str, Any] | None:
        if not self.pool:
            return next(
                (record for record in self.records if record["run_id"] == str(run_id)),
                None,
            )
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM agent_runs WHERE run_id = $1", run_id)
            return dict(row) if row else None
