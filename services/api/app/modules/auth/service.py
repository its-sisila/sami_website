"""
Auth module business logic.
Fetches user profile and station information.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.auth.models import Profile, UserStationRole
from app.modules.auth.schemas import UserWithStation


async def get_user_with_station(user_id: UUID, db: AsyncSession) -> UserWithStation | None:
    """
    Fetch user profile with their associated station.
    
    Args:
        user_id: The user's UUID (from JWT sub claim)
        db: Async database session
        
    Returns:
        UserWithStation if found, None otherwise
    """
    # Query profile with station role eagerly loaded
    stmt = (
        select(Profile)
        .options(selectinload(Profile.station_role))
        .where(Profile.id == user_id)
    )
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        return None
    
    # Build response
    station_id = None
    station_name = None
    role = profile.role
    
    if profile.station_role:
        station_id = profile.station_role.station_id
        role = profile.station_role.role  # Use station-specific role if exists
        # Note: To get station name, we'd need to join stations table
        # For now, just return the ID
    
    return UserWithStation(
        user_id=profile.id,
        email=profile.email,
        full_name=profile.full_name,
        avatar_url=profile.avatar_url,
        role=role,
        station_id=station_id,
        station_name=station_name,
    )


async def get_or_create_profile(
    user_id: UUID,
    email: str,
    full_name: str | None,
    db: AsyncSession
) -> Profile:
    """
    Get existing profile or create a new one.
    Used when a user logs in for the first time.
    
    Args:
        user_id: The user's UUID from Supabase auth
        email: User's email
        full_name: User's display name
        db: Async database session
        
    Returns:
        Profile instance
    """
    stmt = select(Profile).where(Profile.id == user_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if profile:
        return profile
    
    # Create new profile
    profile = Profile(
        id=user_id,
        email=email,
        full_name=full_name,
    )
    db.add(profile)
    await db.flush()
    
    return profile
