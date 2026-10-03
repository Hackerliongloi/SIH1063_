from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Polar Portal API"
    environment: str = "development"
    database_url: str = "sqlite:///./polar.db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-this-before-deploying-use-a-long-random-secret"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    cors_origins: str = "http://localhost:3000"
    max_upload_mb: int = 200
    storage_endpoint: str = "http://localhost:9000"
    storage_access_key: str = "polar"
    storage_secret_key: str = "polar-local-secret"
    storage_bucket: str = "polar-assets"
    storage_region: str = "us-east-1"
    llm_provider: str = "fake"
    model_name: str = "local-fake"
    model_base_url: str = ""
    model_api_key: str = ""
    model_path: str = ""
    admin_email: str = "admin@polar.local"
    admin_password: str = "ChangeMe-Local-Only-123!"
    social_webhook_enabled: bool = False
    social_webhook_url: str = ""
    social_webhook_secret: str = ""
    public_app_url: str = "http://localhost:3000"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@polar.local"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache
def get_settings(): return Settings()

settings = get_settings()
