async def test_health_is_public(client):
    response = await client.get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_agent_run_requires_api_key(client):
    response = await client.post("/v1/agent/runs", json={"prompt": "hello"})

    assert response.status_code == 401


async def test_agent_run_uses_fallback_without_anthropic_key(client):
    response = await client.post(
        "/v1/agent/runs",
        headers={"X-API-Key": "test-key"},
        json={"prompt": "Build a production LLM evaluation plan."},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["fallback_used"] is True
    assert payload["answer"]["risk_level"] == "medium"
    assert payload["token_usage"]["total_tokens"] == 0


async def test_agent_run_is_cached(client):
    body = {"prompt": "Recommend observability metrics for an AI backend."}

    first = await client.post("/v1/agent/runs", headers={"X-API-Key": "test-key"}, json=body)
    second = await client.post("/v1/agent/runs", headers={"X-API-Key": "test-key"}, json=body)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["cached"] is True
