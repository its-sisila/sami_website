"""
Application configuration using pydantic-settings.
Reads environment variables for database and Supabase connections.
"""

import json
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


# Default CORS origins — production only. Add localhost via .env for development.
DEFAULT_CORS_ORIGINS = "https://dashboard.getsami.app,https://getsami.app,https://www.getsami.app"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    # Application
    app_name: str = "SAMI API"
    debug: bool = False
    
    # Database (Supabase Postgres)
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/sami"
    
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""  # anon/public key for client
    supabase_service_key: str = ""  # service role key for admin operations
    
    # Email / Resend
    resend_api_key: str = ""
    
    
    # JWT (Supabase uses these for token verification)
    jwt_secret: str = ""  # Supabase JWT secret
    jwt_algorithm: str = "HS256"
    
    # CORS - stored as string, converted to list via property
    cors_origins_str: str = DEFAULT_CORS_ORIGINS

    @model_validator(mode="after")
    def validate_critical_settings(self):
        """Fail fast if critical secrets are not configured."""
        if not self.jwt_secret:
            raise ValueError(
                "JWT_SECRET is not set. Get it from Supabase Dashboard -> Settings -> API -> JWT Secret."
            )
        if "password" in self.database_url and "localhost" in self.database_url:
            raise ValueError(
                "DATABASE_URL appears to be the default placeholder. "
                "Set it to your actual Supabase Postgres connection string."
            )
        return self
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from string."""
        val = self.cors_origins_str
        if not val:
            return DEFAULT_CORS_ORIGINS.split(",")
        # Try JSON array first
        if val.startswith("["):
            try:
                return json.loads(val)
            except json.JSONDecodeError:
                pass
        # Fall back to comma-separated
        return [origin.strip() for origin in val.split(",") if origin.strip()]
    
    @property
    def async_database_url(self) -> str:
        """Ensure the database URL uses asyncpg driver."""
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()

