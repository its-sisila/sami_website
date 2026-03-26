"""
Configuration Tests.

Tests the application settings, CORS parsing, and fail-fast validation.
"""

from __future__ import annotations

import os

import pytest

from app.core.config import Settings, DEFAULT_CORS_ORIGINS


class TestCORSParsing:
    """Test CORS origin string parsing."""

    def test_comma_separated_origins(self):
        """Comma-separated CORS string should parse into a list."""
        settings = Settings(
            jwt_secret="test-secret-for-unit-tests",
            database_url="postgresql+asyncpg://user:pass@real-host:5432/db",
            cors_origins_str="https://a.com,https://b.com,https://c.com",
        )
        assert settings.cors_origins == ["https://a.com", "https://b.com", "https://c.com"]

    def test_json_array_origins(self):
        """JSON array CORS string should parse into a list."""
        settings = Settings(
            jwt_secret="test-secret-for-unit-tests",
            database_url="postgresql+asyncpg://user:pass@real-host:5432/db",
            cors_origins_str='["https://a.com","https://b.com"]',
        )
        assert settings.cors_origins == ["https://a.com", "https://b.com"]

    def test_empty_cors_falls_back_to_default(self):
        """Empty CORS string should fall back to production defaults."""
        settings = Settings(
            jwt_secret="test-secret-for-unit-tests",
            database_url="postgresql+asyncpg://user:pass@real-host:5432/db",
            cors_origins_str="",
        )
        assert settings.cors_origins == DEFAULT_CORS_ORIGINS.split(",")

    def test_default_cors_has_no_localhost(self):
        """Default CORS origins should NOT include localhost (production safety)."""
        for origin in DEFAULT_CORS_ORIGINS.split(","):
            assert "localhost" not in origin, (
                f"Default CORS origin '{origin}' contains localhost — "
                "this should only be added via .env for development"
            )


class TestFailFastValidation:
    """Test that the app crashes immediately on misconfiguration."""

    def test_empty_jwt_secret_raises(self):
        """App should fail to start if JWT_SECRET is empty."""
        with pytest.raises(ValueError, match="JWT_SECRET is not set"):
            Settings(
                jwt_secret="",
                database_url="postgresql+asyncpg://user:pass@real-host:5432/db",
            )

    def test_default_database_url_raises(self):
        """App should fail if DATABASE_URL is the default placeholder."""
        with pytest.raises(ValueError, match="default placeholder"):
            Settings(
                jwt_secret="valid-secret",
                database_url="postgresql+asyncpg://user:password@localhost:5432/sami",
            )

    def test_valid_config_succeeds(self):
        """Valid configuration should initialize without errors."""
        settings = Settings(
            jwt_secret="a-real-secret-key-for-production",
            database_url="postgresql+asyncpg://postgres:realpass@db.supabase.co:5432/postgres",
        )
        assert settings.jwt_secret == "a-real-secret-key-for-production"


class TestAsyncDatabaseUrl:
    """Test database URL conversion."""

    def test_plain_postgres_converted_to_asyncpg(self):
        """postgresql:// should be converted to postgresql+asyncpg://."""
        settings = Settings(
            jwt_secret="test-secret",
            database_url="postgresql://user:pass@host:5432/db",
        )
        assert settings.async_database_url == "postgresql+asyncpg://user:pass@host:5432/db"

    def test_asyncpg_url_unchanged(self):
        """postgresql+asyncpg:// should remain unchanged."""
        settings = Settings(
            jwt_secret="test-secret",
            database_url="postgresql+asyncpg://user:pass@host:5432/db",
        )
        assert settings.async_database_url == "postgresql+asyncpg://user:pass@host:5432/db"
