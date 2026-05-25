import hashlib
import logging
import time
from datetime import UTC, datetime
from uuid import uuid4

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from pydantic import BaseModel, Field

from app.core.config import Settings
from app.models.schemas import AgentAnswer, AgentRunRequest, AgentRunResponse, AgentStep, TokenUsage
from app.services.cache import CacheClient

logger = logging.getLogger(__name__)


class RetrieveContextTool(BaseModel):
    """Retrieve known product or operations context for an agent run."""

    query: str = Field(description="The context query to retrieve.")


class EstimateCostTool(BaseModel):
    """Estimate implementation or inference cost risk for a proposed AI workflow."""

    workload_description: str = Field(description="The workload, traffic level, or task to assess.")


class AgentOrchestrator:
    def __init__(self, settings: Settings, cache: CacheClient) -> None:
        self.settings = settings
        self.cache = cache

    async def run(self, request: AgentRunRequest) -> AgentRunResponse:
        started = time.perf_counter()
        created_at = datetime.now(UTC)
        cache_key = self._cache_key(request)

        cached_payload = await self.cache.get_json(cache_key)
        if cached_payload:
            cached = AgentRunResponse.model_validate(cached_payload)
            cached.cached = True
            return cached

        steps: list[AgentStep] = []
        fallback_used = False
        token_usage = TokenUsage()

        try:
            if not self.settings.anthropic_api_key:
                raise RuntimeError("ANTHROPIC_API_KEY is not configured")
            answer, usage, llm_steps = await self._run_langchain(request)
            token_usage = usage
            steps.extend(llm_steps)
        except Exception as exc:
            logger.exception("agent_fallback", extra={"request_id": "agent-run"})
            fallback_used = True
            steps.append(
                AgentStep(
                    name="fallback",
                    status="fallback",
                    detail=str(exc),
                    latency_ms=(time.perf_counter() - started) * 1000,
                )
            )
            answer = self._fallback_answer(request.prompt)

        latency_ms = (time.perf_counter() - started) * 1000
        response = AgentRunResponse(
            run_id=uuid4(),
            cached=False,
            fallback_used=fallback_used,
            answer=answer,
            steps=steps,
            token_usage=token_usage,
            latency_ms=latency_ms,
            created_at=created_at,
        )
        await self.cache.set_json(cache_key, response.model_dump(mode="json"))
        return response

    async def _run_langchain(
        self, request: AgentRunRequest
    ) -> tuple[AgentAnswer, TokenUsage, list[AgentStep]]:
        from langchain_anthropic import ChatAnthropic

        steps: list[AgentStep] = []
        llm = ChatAnthropic(
            model=self.settings.anthropic_model,
            api_key=self.settings.anthropic_api_key,
            temperature=0.2,
            max_tokens=1200,
            max_retries=2,
            timeout=30,
        )

        tool_started = time.perf_counter()
        tool_llm = llm.bind_tools([RetrieveContextTool, EstimateCostTool])
        tool_message = await tool_llm.ainvoke(
            [
                SystemMessage(content=self._system_prompt()),
                HumanMessage(content=request.prompt),
            ]
        )
        steps.append(
            AgentStep(
                name="tool-selection",
                status="ok",
                detail=f"model requested {len(tool_message.tool_calls)} tool calls",
                latency_ms=(time.perf_counter() - tool_started) * 1000,
            )
        )

        tool_outputs = []
        for call in tool_message.tool_calls:
            output = self._execute_tool(call["name"], call.get("args", {}))
            tool_outputs.append(ToolMessage(content=output, tool_call_id=call["id"]))

        structured_started = time.perf_counter()
        structured_llm = llm.with_structured_output(AgentAnswer, include_raw=True)
        result = await structured_llm.ainvoke(
            [
                SystemMessage(content=self._system_prompt()),
                HumanMessage(content=request.prompt),
                tool_message,
                *tool_outputs,
            ]
        )
        if result.get("parsing_error") or not result.get("parsed"):
            raise RuntimeError(f"structured output parsing failed: {result.get('parsing_error')}")

        steps.append(
            AgentStep(
                name="structured-output",
                status="ok",
                detail="validated AgentAnswer schema",
                latency_ms=(time.perf_counter() - structured_started) * 1000,
            )
        )

        raw = result.get("raw")
        usage_metadata = getattr(raw, "usage_metadata", None) or {}
        usage = self._token_usage(usage_metadata)
        return result["parsed"], usage, steps

    def _execute_tool(self, name: str, args: dict) -> str:
        if name == "RetrieveContextTool":
            query = args.get("query", "")
            return (
                f"Retrieved context for '{query}': prefer async FastAPI endpoints, bounded "
                "tool execution, API-key auth, per-tenant persistence, and explicit fallback paths."
            )
        if name == "EstimateCostTool":
            workload = args.get("workload_description", "")
            return (
                f"Cost assessment for '{workload}': cache repeated prompts, track input/output "
                "tokens, cap max_tokens, and regress latency against representative fixtures."
            )
        return "Unknown tool requested; no external side effect performed."

    def _token_usage(self, metadata: dict) -> TokenUsage:
        input_tokens = int(metadata.get("input_tokens") or 0)
        output_tokens = int(metadata.get("output_tokens") or 0)
        total_tokens = int(metadata.get("total_tokens") or input_tokens + output_tokens)
        estimated_cost = (
            input_tokens / 1000 * self.settings.token_input_cost_per_1k
            + output_tokens / 1000 * self.settings.token_output_cost_per_1k
        )
        return TokenUsage(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            estimated_cost_usd=round(estimated_cost, 6),
        )

    def _fallback_answer(self, prompt: str) -> AgentAnswer:
        return AgentAnswer(
            summary=(
                "The production fallback path handled the request without calling Claude. "
                "Use the logged run record to inspect latency, cache behavior, and errors."
            ),
            reasoning=[
                "The service validates requests before orchestration.",
                "Unavailable model credentials or parsing failures use deterministic fallback.",
                (
                    "The original prompt was retained for audit and regression analysis: "
                    f"{prompt[:160]}"
                ),
            ],
            actions=[
                "Set ANTHROPIC_API_KEY to enable live LangChain Claude orchestration.",
                "Review /metrics and persisted agent_runs rows during load testing.",
                "Add prompt fixtures to regression tests before changing orchestration prompts.",
            ],
            risk_level="medium",
            confidence=0.74,
        )

    def _cache_key(self, request: AgentRunRequest) -> str:
        digest = hashlib.sha256(
            f"{request.prompt}|{request.session_id}|{request.metadata}".encode()
        ).hexdigest()
        return f"agent-run:{digest}"

    def _system_prompt(self) -> str:
        return (
            "You are a production backend AI agent. Produce concise, actionable output. "
            "Use tools when useful, preserve reliability concerns, and return only the "
            "requested structured schema."
        )
