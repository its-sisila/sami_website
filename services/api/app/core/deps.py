"""
Core dependencies for FastAPI routes.
Provides authenticated user and station context.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user as get_current_user_base, CurrentUser


async def get_current_user_with_station(
    user: Annotated[CurrentUser, Depends(get_current_user_base)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    """
    Get current user with station_id populated from database.
    
    This dependency queries user_station_roles to get the user's
    assigned station and role.
    """
    from app.modules.auth.models import UserStationRole
    
    user_id = UUID(user.user_id)
    
    # Query user_station_roles to get station assignment
    stmt = select(UserStationRole).where(UserStationRole.user_id == user_id)
    result = await db.execute(stmt)
    station_role = result.scalar_one_or_none()
    
    if station_role:
        user.station_id = str(station_role.station_id)
        user.role = station_role.role.value
    
    return user


async def get_current_station(
    user: Annotated[CurrentUser, Depends(get_current_user_with_station)],
) -> UUID:
    """
    Get the current user's station_id.
    Raises 400 if user is not assigned to a station.
    """
    if not user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    return UUID(user.station_id)


async def require_role(*allowed_roles: str):
    """
    Factory for role-checking dependencies.
    
    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("owner", "manager"))])
    """
    async def check_role(
        user: Annotated[CurrentUser, Depends(get_current_user_with_station)],
    ):
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {', '.join(allowed_roles)}",
            )
        return user
    return check_role


def require_system_admin():
    """Dependency that requires system_admin role."""
    async def check(
        user: Annotated[CurrentUser, Depends(get_current_user_base)],
    ):
        if user.role != "system_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="System admin access required",
            )
        return user
    return Depends(check)
