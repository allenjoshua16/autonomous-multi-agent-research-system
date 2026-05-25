from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "agentic-ai-backend"
    environment: str = "local"
    log_level: str = "INFO"
    api_keys: str = "local-dev-key"
    rate_limit_per_minute: int = 60
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-3-5-sonnet-20240620"
    postgres_dsn: str | None = None
    redis_url: str | None = None
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cache_ttl_seconds: int = 900
    token_input_cost_per_1k: float = Field(default=0.003)
    token_output_cost_per_1k: float = Field(default=0.015)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_api_keys(self) -> set[str]:
        return {key.strip() for key in self.api_keys.split(",") if key.strip()}

    @property
    def allowed_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
