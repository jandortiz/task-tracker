from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Jandortiz's Task Tracker"
    environment: str = "development"
    database_url: str = Field(default="postgresql+psycopg://postgres:postgres@localhost:5432/task_tracker")
    secret_key: str = Field(default="change-this-secret-key-before-production-32chars")
    access_token_expire_minutes: int = 60 * 24 * 7
    password_reset_expire_minutes: int = 30
    session_cookie_name: str = "task_tracker_session"
    csrf_cookie_name: str = "task_tracker_csrf"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    sqlalchemy_echo: bool = False
    db_pool_size: int = 5
    db_max_overflow: int = 10
    public_app_url: str = "http://localhost:8000"
    email_debug: bool = False
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from_email)

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
