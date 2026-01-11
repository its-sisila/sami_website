"""
Users module business logic.
User listing, invites via Supabase Admin API, and audit logging.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.auth.models import Profile, UserStationRole, UserRole
from app.modules.admin.models import AuditLog
from app.modules.users.schemas import InviteCreate


# ============================================================================
# User Listing
# ============================================================================

async def list_users_for_station(
    station_id: UUID,
    db: AsyncSession,
) -> list[dict]:
    """List all users for a station with their roles."""
    stmt = (
        select(Profile, UserStationRole)
        .join(UserStationRole, Profile.id == UserStationRole.user_id)
        .where(UserStationRole.station_id == station_id)
        .order_by(Profile.full_name, Profile.email)
    )
    result = await db.execute(stmt)
    
    users = []
    for profile, station_role in result.all():
        users.append({
            "id": profile.id,
            "email": profile.email,
            "full_name": profile.full_name,
            "avatar_url": profile.avatar_url,
            "role": station_role.role,
            "station_id": station_role.station_id,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
        })
    return users


async def get_user_station_role(
    user_id: UUID,
    db: AsyncSession,
) -> UserStationRole | None:
    """Get user's station role."""
    stmt = select(UserStationRole).where(UserStationRole.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ============================================================================
# Invite User via Supabase Admin API
# ============================================================================

async def invite_user_supabase(
    email: str,
    password: str | None = None,
) -> dict | None:
    """
    Create a user in Supabase Auth using the Admin API.
    
    Returns the created user data or None if failed.
    """
    if not settings.supabase_url or not settings.supabase_service_key:
        raise ValueError("Supabase URL and service key are required for invites")
    
    url = f"{settings.supabase_url}/auth/v1/admin/users"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
        "Content-Type": "application/json",
    }
    
    # Generate a temporary password if not provided
    # User will reset via email
    temp_password = password or f"TempPass_{uuid4().hex[:8]}!"
    
    payload = {
        "email": email,
        "password": temp_password,
        "email_confirm": True,  # Auto-confirm email
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        
        if response.status_code in (200, 201):
            return response.json()
        else:
            # Log the error but don't expose details
            print(f"Supabase invite error: {response.status_code} - {response.text}")
            return None


async def update_user_password_supabase(
    user_id: UUID,
    new_password: str,
) -> bool:
    """
    Update a user's password in Supabase Auth using the Admin API.
    """
    if not settings.supabase_url or not settings.supabase_service_key:
        raise ValueError("Supabase URL and service key are required for password updates")
    
    url = f"{settings.supabase_url}/auth/v1/admin/users/{user_id}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
        "Content-Type": "application/json",
    }
    
    payload = {
        "password": new_password,
        # We don't change email verification status on password reset
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.put(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            return True
        else:
            print(f"Supabase password update error: {response.status_code} - {response.text}")
            return False


async def create_user_profile(
    user_id: UUID,
    email: str,
    full_name: str | None,
    role: UserRole,
    db: AsyncSession,
) -> Profile:
    """Create a profile record for the new user."""
    profile = Profile(
        id=user_id,
        email=email,
        full_name=full_name,
        role=role,
    )
    db.add(profile)
    await db.flush()
    return profile


async def assign_user_to_station(
    user_id: UUID,
    station_id: UUID,
    role: UserRole,
    db: AsyncSession,
) -> UserStationRole:
    """Assign user to a station with a role."""
    station_role = UserStationRole(
        id=uuid4(),
        user_id=user_id,
        station_id=station_id,
        role=role,
    )
    db.add(station_role)
    await db.flush()
    return station_role


async def remove_user_from_station(
    user_id: UUID,
    db: AsyncSession,
) -> bool:
    """Remove user's station role (soft removal from station access)."""
    stmt = select(UserStationRole).where(UserStationRole.user_id == user_id)
    result = await db.execute(stmt)
    station_role = result.scalar_one_or_none()
    
    if station_role:
        await db.delete(station_role)
        await db.flush()
        return True
    return False


# ============================================================================
# RBAC Permission Checks
# ============================================================================

def can_invite_role(actor_role: UserRole, target_role: UserRole) -> bool:
    """
    Check if actor can invite a user with target role.
    
    Rules:
    - system_admin → can invite any role
    - owner → can invite manager, accountant, supervisor
    - manager → can invite accountant, supervisor
    - accountant → cannot invite anyone
    - supervisor → cannot invite anyone
    """
    if actor_role == UserRole.system_admin:
        return True
    
    if actor_role == UserRole.owner:
        return target_role in (UserRole.manager, UserRole.accountant, UserRole.supervisor)
    
    if actor_role == UserRole.manager:
        return target_role in (UserRole.accountant, UserRole.supervisor)
    
    return False


# ============================================================================
# Audit Logging
# ============================================================================

async def log_audit(
    actor_id: UUID | None,
    station_id: UUID | None,
    action: str,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    db: AsyncSession | None = None,
) -> AuditLog | None:
    """Log an action to the audit trail."""
    if db is None:
        return None
    
    audit_entry = AuditLog(
        id=uuid4(),
        actor_id=actor_id,
        station_id=station_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(audit_entry)
    await db.flush()
    return audit_entry
