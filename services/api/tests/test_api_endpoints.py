"""
API Endpoint Smoke Tests.

Verifies that every mounted router responds correctly to
authenticated and unauthenticated requests.
These are lightweight smoke tests — not full CRUD tests.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import MockUser, MOCK_USERS


# All mounted routers and their expected base paths
AUTHENTICATED_ENDPOINTS = [
    ("/employees", "GET"),
    ("/accounts", "GET"),
    ("/inventory/tanks", "GET"),
    ("/sales/shifts/current", "GET"),
    ("/stations", "GET"),
    ("/orders", "GET"),
    ("/settlements", "GET"),
    ("/users/me", "GET"),
    ("/expenses", "GET"),
]

PUBLIC_ENDPOINTS = [
    ("/", "GET"),
    ("/health", "GET"),
]


class TestPublicEndpoints:
    """Verify that public endpoints are accessible without auth."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("path,method", PUBLIC_ENDPOINTS)
    async def test_public_endpoint_accessible(
        self, async_client: AsyncClient, path: str, method: str
    ):
        response = await async_client.request(method, path)
        assert response.status_code == 200, (
            f"Public endpoint {method} {path} returned {response.status_code}"
        )


class TestAuthenticatedEndpointsDenyAnonymous:
    """Every protected endpoint must return 401 for unauthenticated requests."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("path,method", AUTHENTICATED_ENDPOINTS)
    async def test_unauthenticated_returns_401(
        self, async_client: AsyncClient, path: str, method: str
    ):
        response = await async_client.request(method, path)
        assert response.status_code == 401, (
            f"{method} {path} should return 401 without auth, got {response.status_code}"
        )


class TestAuthenticatedEndpointsAcceptValidToken:
    """Every protected endpoint must NOT return 401/403 for a valid owner token."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("path,method", AUTHENTICATED_ENDPOINTS)
    async def test_authenticated_does_not_return_401(
        self,
        async_client: AsyncClient,
        auth_headers,
        owner_a: MockUser,
        path: str,
        method: str,
    ):
        """
        With a valid token, endpoints should not return 401.
        They may return 200, 204, 404, or 500 depending on DB state,
        but never 401 (authentication rejected).
        """
        headers = auth_headers(owner_a)
        response = await async_client.request(method, path, headers=headers)
        assert response.status_code != 401, (
            f"{method} {path} returned 401 with valid token"
        )


class TestOpenAPIDocumentation:
    """Verify the auto-generated API docs are accessible."""

    @pytest.mark.asyncio
    async def test_openapi_schema_available(self, async_client: AsyncClient):
        """The OpenAPI JSON schema should be publicly accessible."""
        response = await async_client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "paths" in schema
        assert "info" in schema

    @pytest.mark.asyncio
    async def test_swagger_docs_available(self, async_client: AsyncClient):
        """The /docs Swagger UI should be accessible."""
        response = await async_client.get("/docs")
        assert response.status_code == 200
