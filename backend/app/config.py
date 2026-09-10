from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "dev"
    database_url: str = "postgresql+psycopg2://ledger:ledger@localhost:5432/ledger"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    access_token_expire_minutes: int = 60 * 24
    algorithm: str = "HS256"
    cors_origins: str = "http://localhost:3000"
    bookings_cache_ttl_seconds: int = 20
    summarise_queue_key: str = "jobs:summarise"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
