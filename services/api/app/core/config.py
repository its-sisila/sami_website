"""
Application configuration using pydantic-settings.
Reads environment variables for database and Supabase connections.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    
    # JWT (Supabase uses these for token verification)
    jwt_secret: str = ""  # Supabase JWT secret
    jwt_algorithm: str = "HS256"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    
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
