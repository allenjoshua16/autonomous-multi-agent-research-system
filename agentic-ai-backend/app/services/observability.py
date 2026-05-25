from prometheus_client import Counter, Histogram

AGENT_RUNS = Counter("agent_runs_total", "Total agent run requests.", ["cached", "fallback"])
AGENT_ERRORS = Counter("agent_errors_total", "Total agent orchestration errors.", ["type"])
AGENT_LATENCY = Histogram(
    "agent_latency_seconds",
    "Agent orchestration latency in seconds.",
    buckets=(0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30),
)
TOKEN_COST = Counter("agent_token_cost_usd_total", "Estimated cumulative model token cost.")
