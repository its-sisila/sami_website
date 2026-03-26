"""
Pytest fixtures for RBAC testing.
Provides mock users, tokens, and test client setup.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import AsyncGenerator, Callable
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from jose import jwt

from app.main import app
from app.core.config import settings
from app.core.database import Base, engine
from app.modules.auth.models import UserRole

# Import ALL model modules so they register with Base.metadata
# Use importlib to avoid shadowing the FastAPI `app` instance with the `app` package
import importlib
for _model_module in [
    "app.modules.auth.models",
    "app.modules.accounts.models",
    "app.modules.employees.models",
    "app.modules.inventory.models",
    "app.modules.sales.models",
    "app.modules.orders.models",
    "app.modules.settlements.models",
    "app.modules.stations.models",
    "app.modules.admin.models",
    "app.modules.expenses.models",
    "app.modules.pricing.models",
]:
    importlib.import_module(_model_module)


# ============================================================================
# Database Schema Setup (session-scoped)
# ============================================================================

@pytest.fixture(scope="session", autouse=True)
def event_loop():
    """Create event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before tests, drop after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ============================================================================
# Test User Fixtures
# ============================================================================

class MockUser:
    """Mock user for testing with role and station assignment."""
    
    def __init__(
        self,
        user_id: str | None = None,
        email: str = "test@example.com",
        role: UserRole = UserRole.owner,
        station_id: str | None = None,
    ):
        self.user_id = user_id or str(uuid4())
        self.email = email
        self.role = role
        self.station_id = station_id or str(uuid4())
    
    def make_token(self, expires_in: int = 3600) -> str:
        """Generate a valid JWT token for this user."""
        payload = {
            "sub": self.user_id,
            "email": self.email,
            "role": self.role.value,
            "station_id": self.station_id,
            "aud": "authenticated",
            "exp": int((datetime.utcnow() + timedelta(seconds=expires_in)).timestamp()),
            "iat": int(datetime.utcnow().timestamp()),
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


# Pre-built mock users for each role
STATION_A_ID = str(uuid4())
STATION_B_ID = str(uuid4())

MOCK_USERS = {
    "system_admin": MockUser(
        email="admin@sami.lk",
        role=UserRole.system_admin,
        station_id=None,  # system_admin doesn't belong to a station
    ),
    "owner_a": MockUser(
        email="owner.a@station.lk",
        role=UserRole.owner,
        station_id=STATION_A_ID,
    ),
    "owner_b": MockUser(
        email="owner.b@station.lk",
        role=UserRole.owner,
        station_id=STATION_B_ID,
    ),
    "manager_a": MockUser(
        email="manager.a@station.lk",
        role=UserRole.manager,
        station_id=STATION_A_ID,
    ),
    "accountant_a": MockUser(
        email="accountant.a@station.lk",
        role=UserRole.accountant,
        station_id=STATION_A_ID,
    ),
    "supervisor_a": MockUser(
        email="supervisor.a@station.lk",
        role=UserRole.supervisor,
        station_id=STATION_A_ID,
    ),
}


@pytest.fixture
def system_admin() -> MockUser:
    """System admin user fixture."""
    return MOCK_USERS["system_admin"]


@pytest.fixture
def owner_a() -> MockUser:
    """Owner user for station A fixture."""
    return MOCK_USERS["owner_a"]


@pytest.fixture
def owner_b() -> MockUser:
    """Owner user for station B fixture."""
    return MOCK_USERS["owner_b"]


@pytest.fixture
def manager_a() -> MockUser:
    """Manager user for station A fixture."""
    return MOCK_USERS["manager_a"]


@pytest.fixture
def accountant_a() -> MockUser:
    """Accountant user for station A fixture."""
    return MOCK_USERS["accountant_a"]


@pytest.fixture
def supervisor_a() -> MockUser:
    """Supervisor user for station A fixture."""
    return MOCK_USERS["supervisor_a"]


# ============================================================================
# HTTP Client Fixtures
# ============================================================================

@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client for testing API endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def auth_headers() -> Callable[[MockUser], dict[str, str]]:
    """Factory fixture to generate auth headers for a mock user."""
    def _make_headers(user: MockUser) -> dict[str, str]:
        token = user.make_token()
        return {"Authorization": f"Bearer {token}"}
    return _make_headers


@pytest.fixture
def expired_token() -> str:
    """Generate an expired token for testing."""
    user = MockUser()
    payload = {
        "sub": user.user_id,
        "email": user.email,
        "role": user.role.value,
        "aud": "authenticated",
        "exp": int((datetime.utcnow() - timedelta(hours=1)).timestamp()),
        "iat": int((datetime.utcnow() - timedelta(hours=2)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@pytest.fixture
def invalid_token() -> str:
    """Generate a token signed with wrong secret."""
    user = MockUser()
    payload = {
        "sub": user.user_id,
        "email": user.email,
        "role": user.role.value,
        "aud": "authenticated",
        "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
    }
    return jwt.encode(payload, "wrong-secret-key", algorithm="HS256")


# ============================================================================
# Station Fixtures
# ============================================================================

@pytest.fixture
def station_a_id() -> str:
    """Station A UUID fixture."""
    return STATION_A_ID


@pytest.fixture
def station_b_id() -> str:
    """Station B UUID fixture."""
    return STATION_B_ID
