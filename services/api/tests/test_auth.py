"""
Authentication & JWT Token Tests.

Tests JWT token verification, expiration, and authentication flow.
These tests do NOT require a database connection.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from jose import jwt

from app.core.config import settings
from app.core.security import verify_token, TokenPayload
from tests.conftest import MockUser


# ============================================================================
# Token Verification Unit Tests
# ============================================================================

class TestTokenVerification:
    """Test the verify_token function in isolation."""

    def test_valid_token_returns_payload(self):
        """A correctly signed, non-expired token should decode successfully."""
        user = MockUser(email="valid@test.com")
        token = user.make_token(expires_in=3600)
        payload = verify_token(token)

        assert isinstance(payload, TokenPayload)
        assert payload.sub == user.user_id
        assert payload.email == "valid@test.com"
        assert payload.aud == "authenticated"

    def test_expired_token_raises_401(self):
        """An expired token should raise HTTPException 401."""
        user = MockUser()
        payload = {
            "sub": user.user_id,
            "email": user.email,
            "role": user.role.value,
            "aud": "authenticated",
            "exp": int((datetime.utcnow() - timedelta(hours=1)).timestamp()),
        }
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            verify_token(token)
        assert exc_info.value.status_code == 401

    def test_wrong_secret_raises_401(self):
        """A token signed with a wrong secret should raise HTTPException 401."""
        user = MockUser()
        payload = {
            "sub": user.user_id,
            "email": user.email,
            "role": user.role.value,
            "aud": "authenticated",
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
        }
        token = jwt.encode(payload, "completely-wrong-secret", algorithm="HS256")

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            verify_token(token)
        assert exc_info.value.status_code == 401

    def test_malformed_token_raises_401(self):
        """A completely malformed string should raise HTTPException 401."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            verify_token("this.is.not.a.jwt")
        assert exc_info.value.status_code == 401

    def test_empty_token_raises_401(self):
        """An empty string should raise HTTPException 401."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            verify_token("")
        assert exc_info.value.status_code == 401

    def test_wrong_audience_raises_401(self):
        """A token with wrong audience should raise HTTPException 401."""
        user = MockUser()
        payload = {
            "sub": user.user_id,
            "email": user.email,
            "role": user.role.value,
            "aud": "wrong-audience",
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
        }
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            verify_token(token)
        assert exc_info.value.status_code == 401


# ============================================================================
# Endpoint Authentication Tests (via HTTP Client)
# ============================================================================

class TestEndpointAuthentication:
    """Test authentication enforcement on API endpoints."""

    @pytest.mark.asyncio
    async def test_no_token_returns_401(self, async_client):
        """Request with no Authorization header should return 401."""
        response = await async_client.get("/employees")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_empty_bearer_returns_401(self, async_client):
        """Request with 'Bearer ' but no token value should return 401."""
        response = await async_client.get(
            "/employees",
            headers={"Authorization": "Bearer "},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_token_returns_401(self, async_client, expired_token):
        """Expired token should be rejected."""
        response = await async_client.get(
            "/employees",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_signature_returns_401(self, async_client, invalid_token):
        """Token signed with wrong key should be rejected."""
        response = await async_client.get(
            "/employees",
            headers={"Authorization": f"Bearer {invalid_token}"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_health_endpoint_no_auth_required(self, async_client):
        """Health check endpoint should be publicly accessible."""
        response = await async_client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] in ["ok", "degraded"]

    @pytest.mark.asyncio
    async def test_root_endpoint_no_auth_required(self, async_client):
        """Root endpoint should be publicly accessible."""
        response = await async_client.get("/")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_debug_cors_endpoint_removed(self, async_client):
        """The /debug/cors endpoint should no longer exist."""
        response = await async_client.get("/debug/cors")
        assert response.status_code == 404
