from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AgentRunRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=8000)
    session_id: str | None = Field(default=None, max_length=128)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentStep(BaseModel):
    name: str
    status: Literal["ok", "fallback", "error"]
    detail: str
    latency_ms: float


class AgentAnswer(BaseModel):
    summary: str = Field(description="Concise answer for the user request.")
    reasoning: list[str] = Field(description="Short reasoning checkpoints.")
    actions: list[str] = Field(description="Recommended implementation or operational actions.")
    risk_level: Literal["low", "medium", "high"]
    confidence: float = Field(ge=0, le=1)


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0


class AgentRunResponse(BaseModel):
    run_id: UUID
    cached: bool
    fallback_used: bool
    answer: AgentAnswer
    steps: list[AgentStep]
    token_usage: TokenUsage
    latency_ms: float
    created_at: datetime


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    environment: str
