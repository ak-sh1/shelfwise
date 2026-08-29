from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    # Render/Heroku style URLs → SQLAlchemy + psycopg2
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg2" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    # Render Postgres expects TLS for external hosts; harmless on local/private.
    if "sslmode=" not in url and ("render.com" in url or "dpg-" in url):
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://shelfwise:shelfwise@127.0.0.1:5432/shelfwise"
    jwt_secret: str = "shelfwise-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: str = (
        "http://127.0.0.1:4331,http://localhost:4331,"
        "http://127.0.0.1:3000,http://localhost:3000"
    )
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_database_url(self.database_url)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
