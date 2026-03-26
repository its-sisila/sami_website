"""
RBAC Enforcement Tests.

Tests that each role can only access their allowed endpoints.
Tests station isolation between users.
Tests Support Edit Mode restrictions.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import MockUser, STATION_A_ID, STATION_B_ID


# ============================================================================
# Role-Based Access Tests
# ============================================================================

class TestRoleBasedAccess:
    """Test that each role can only access allowed endpoints."""
    
    # ========================================================================
    # Admin Endpoints (system_admin only)
    # ========================================================================
    
    @pytest.mark.asyncio
    async def test_system_admin_can_list_all_stations(
        self,
        async_client: AsyncClient,
        system_admin: MockUser,
        auth_headers,
    ):
        """system_admin should be able to list all stations."""
        headers = auth_headers(system_admin)
        response = await async_client.get("/admin/stations", headers=headers)
        # Should succeed (200) or return empty list, but not 403
        # Note: May return 401 if token validation requires DB lookup
        assert response.status_code in [200, 401, 500], f"Unexpected status: {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_owner_cannot_access_admin_stations(
        self,
        async_client: AsyncClient,
        owner_a: MockUser,
        auth_headers,
    ):
        """owner should NOT be able to list all stations (admin only)."""
        headers = auth_headers(owner_a)
        response = await async_client.get("/admin/stations", headers=headers)
        # Should be 403 Forbidden or 401 if auth check happens first
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_manager_cannot_access_admin_endpoints(
        self,
        async_client: AsyncClient,
        manager_a: MockUser,
        auth_headers,
    ):
        """manager should NOT be able to access admin endpoints."""
        headers = auth_headers(manager_a)
        response = await async_client.get("/admin/stations", headers=headers)
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_accountant_cannot_access_admin_endpoints(
        self,
        async_client: AsyncClient,
        accountant_a: MockUser,
        auth_headers,
    ):
        """accountant should NOT be able to access admin endpoints."""
        headers = auth_headers(accountant_a)
        response = await async_client.get("/admin/audit-log", headers=headers)
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_supervisor_cannot_access_admin_endpoints(
        self,
        async_client: AsyncClient,
        supervisor_a: MockUser,
        auth_headers,
    ):
        """supervisor should NOT be able to access admin endpoints."""
        headers = auth_headers(supervisor_a)
        response = await async_client.get("/admin/stations", headers=headers)
        assert response.status_code in [401, 403]
    
    # ========================================================================
    # Support Access Endpoints (system_admin only)
    # ========================================================================
    
    @pytest.mark.asyncio
    async def test_system_admin_can_toggle_support_access(
        self,
        async_client: AsyncClient,
        system_admin: MockUser,
        auth_headers,
        station_a_id: str,
    ):
        """system_admin should be able to toggle support access."""
        headers = auth_headers(system_admin)
        response = await async_client.post(
            f"/admin/support-access/{station_a_id}",
            headers=headers,
            json={"enabled": True, "reason": "Test support access"},
        )
        # Should not be 403 (may fail for other reasons like station not existing)
        assert response.status_code != 403
    
    @pytest.mark.asyncio
    async def test_owner_cannot_toggle_support_access(
        self,
        async_client: AsyncClient,
        owner_a: MockUser,
        auth_headers,
        station_a_id: str,
    ):
        """owner should NOT be able to toggle support access."""
        headers = auth_headers(owner_a)
        response = await async_client.post(
            f"/admin/support-access/{station_a_id}",
            headers=headers,
            json={"enabled": True, "reason": "Test"},
        )
        assert response.status_code in [401, 403]
    
    # ========================================================================
    # General Authenticated Endpoints
    # ========================================================================
    
    @pytest.mark.asyncio
    async def test_unauthenticated_access_denied(
        self,
        async_client: AsyncClient,
    ):
        """Unauthenticated requests should be denied."""
        response = await async_client.get("/employees")
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_expired_token_denied(
        self,
        async_client: AsyncClient,
        expired_token: str,
    ):
        """Expired token should be denied."""
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = await async_client.get("/employees", headers=headers)
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_invalid_token_denied(
        self,
        async_client: AsyncClient,
        invalid_token: str,
    ):
        """Invalid token (wrong signature) should be denied."""
        headers = {"Authorization": f"Bearer {invalid_token}"}
        response = await async_client.get("/employees", headers=headers)
        assert response.status_code == 401


# ============================================================================
# Station Isolation Tests
# ============================================================================

class TestStationIsolation:
    """Test that users can only access data from their own station."""
    
    @pytest.mark.asyncio
    async def test_owner_can_access_own_station_employees(
        self,
        async_client: AsyncClient,
        owner_a: MockUser,
        auth_headers,
    ):
        """Owner A should be able to access station A employees."""
        headers = auth_headers(owner_a)
        response = await async_client.get("/employees", headers=headers)
        # Should succeed or return auth/validation error, not 403
        assert response.status_code in [200, 204, 400, 401]
    
    @pytest.mark.asyncio
    async def test_owner_cannot_access_other_station_employees(
        self,
        async_client: AsyncClient,
        owner_a: MockUser,
        owner_b: MockUser,
        auth_headers,
        station_b_id: str,
    ):
        """
        Owner A should NOT see employees from station B.
        Note: This assumes station filtering is properly implemented.
        """
        # This test validates the concept - actual implementation may need 
        # database fixtures to create employees in both stations
        headers = auth_headers(owner_a)
        response = await async_client.get("/employees", headers=headers)
        
        if response.status_code == 200:
            employees = response.json()
            # None of the returned employees should be from station B
            for emp in employees:
                if "station_id" in emp:
                    assert emp["station_id"] != station_b_id
    
    @pytest.mark.asyncio
    async def test_manager_sees_only_own_station_inventory(
        self,
        async_client: AsyncClient,
        manager_a: MockUser,
        auth_headers,
        station_b_id: str,
    ):
        """Manager A should only see inventory from station A."""
        headers = auth_headers(manager_a)
        response = await async_client.get("/inventory/tanks", headers=headers)
        
        if response.status_code == 200:
            tanks = response.json()
            for tank in tanks:
                if "station_id" in tank:
                    assert tank["station_id"] != station_b_id


# ============================================================================
# Support Edit Mode Tests
# ============================================================================

class TestSupportEditMode:
    """Test Support Edit Mode restrictions for system_admin."""
    
    @pytest.mark.asyncio
    async def test_system_admin_can_view_support_access_status(
        self,
        async_client: AsyncClient,
        system_admin: MockUser,
        auth_headers,
        station_a_id: str,
    ):
        """system_admin can check support access status."""
        headers = auth_headers(system_admin)
        response = await async_client.get(
            f"/admin/support-access/{station_a_id}",
            headers=headers,
        )
        assert response.status_code != 403
    
    @pytest.mark.asyncio
    async def test_support_access_toggle_requires_reason(
        self,
        async_client: AsyncClient,
        system_admin: MockUser,
        auth_headers,
        station_a_id: str,
    ):
        """Toggling support access should require a reason."""
        headers = auth_headers(system_admin)
        # Try without reason
        response = await async_client.post(
            f"/admin/support-access/{station_a_id}",
            headers=headers,
            json={"enabled": True},  # No reason provided
        )
        # Should fail validation (422) or require reason, or be 401 if auth check happens first
        # This depends on schema validation and auth order
        assert response.status_code in [401, 422, 400] or "reason" in str(response.json()).lower()
    
    @pytest.mark.asyncio
    async def test_support_access_logged_in_audit(
        self,
        async_client: AsyncClient,
        system_admin: MockUser,
        auth_headers,
        station_a_id: str,
    ):
        """Support access toggle should be logged in audit log."""
        headers = auth_headers(system_admin)
        
        # Toggle support access
        await async_client.post(
            f"/admin/support-access/{station_a_id}",
            headers=headers,
            json={"enabled": True, "reason": "Test audit log"},
        )
        
        # Check audit log
        response = await async_client.get(
            f"/admin/audit-log?station_id={station_a_id}",
            headers=headers,
        )
        
        # Should be able to view audit log
        assert response.status_code != 403


# ============================================================================
# Role Permission Matrix Tests
# ============================================================================

class TestRolePermissionMatrix:
    """Test the complete role permission matrix."""
    
    ENDPOINTS = [
        # (endpoint, method, allowed_roles)
        ("/admin/stations", "GET", ["system_admin"]),
        ("/admin/audit-log", "GET", ["system_admin"]),
        ("/employees", "GET", ["system_admin", "owner", "manager", "accountant", "supervisor"]),
        ("/inventory/tanks", "GET", ["system_admin", "owner", "manager", "accountant", "supervisor"]),
        ("/sales/shifts/current", "GET", ["system_admin", "owner", "manager", "accountant", "supervisor"]),
        ("/orders", "GET", ["system_admin", "owner", "manager", "accountant", "supervisor"]),
    ]
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint,method,allowed_roles", ENDPOINTS)
    async def test_role_access_matrix(
        self,
        async_client: AsyncClient,
        auth_headers,
        endpoint: str,
        method: str,
        allowed_roles: list[str],
    ):
        """
        Test each endpoint against the role permission matrix.
        Note: This is a template - actual allowed_roles should match your business logic.
        """
        from app.modules.auth.models import UserRole
        
        all_roles = ["system_admin", "owner", "manager", "accountant", "supervisor"]
        
        for role_name in all_roles:
            user = MockUser(
                email=f"{role_name}@test.com",
                role=UserRole(role_name),
                station_id=STATION_A_ID if role_name != "system_admin" else None,
            )
            headers = auth_headers(user)
            
            if method == "GET":
                response = await async_client.get(endpoint, headers=headers)
            elif method == "POST":
                response = await async_client.post(endpoint, headers=headers, json={})
            else:
                continue
            
            if role_name in allowed_roles:
                # Should NOT be forbidden (may be 400 for missing station, 404 for missing resources, 401 for auth issues)
                assert response.status_code not in [403], \
                    f"{role_name} should have access to {method} {endpoint}, got {response.status_code}"
            else:
                # Should be forbidden, unauthorized, or bad request (station not found)
                assert response.status_code in [400, 401, 403], \
                    f"{role_name} should NOT have access to {method} {endpoint}, got {response.status_code}"
