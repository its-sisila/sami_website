"""
Stations module API routes.
CRUD for stations (System Admin only).
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.stations import service
from app.modules.stations.schemas import StationCreate, StationUpdate, StationRead


router = APIRouter()


def require_system_admin(user: CurrentUser):
    """Check if user is system admin."""
    if user.role != "system_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System admin access required",
        )


# ============================================================================
# Station Settings Routes
# ============================================================================

from app.modules.stations.schemas import StationSettingsRead, StationSettingsUpdate


def require_settings_access(user: CurrentUser):
    """Check if user can access settings (owner, manager, or system_admin)."""
    allowed_roles = {"owner", "manager", "system_admin"}
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner, Manager, or System Admin access required",
        )


@router.get("/settings", response_model=StationSettingsRead)
async def get_settings(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get station settings for the current user's station.
    Auto-creates default settings if none exist.
    Requires owner, manager, or system_admin role.
    """
    require_settings_access(current_user)
    settings = await service.get_station_settings(current_user.station_id, db)
    return settings


@router.patch("/settings", response_model=StationSettingsRead)
async def update_settings(
    data: StationSettingsUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update station settings for the current user's station.
    Requires owner, manager, or system_admin role.
    """
    require_settings_access(current_user)
    settings = await service.update_station_settings(current_user.station_id, data, db)
    return settings


@router.get("", response_model=list[StationRead])
async def list_stations(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all stations. Requires system admin role."""
    require_system_admin(current_user)
    stations = await service.list_stations(db)
    return stations


@router.post("", response_model=StationRead, status_code=status.HTTP_201_CREATED)
async def create_station(
    data: StationCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new station. Requires system admin role."""
    require_system_admin(current_user)
    station = await service.create_station(data, db)
    return station


@router.get("/{station_id}", response_model=StationRead)
async def get_station(
    station_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a station by ID. Requires system admin role."""
    require_system_admin(current_user)
    station = await service.get_station(station_id, db)
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )
    return station


@router.patch("/{station_id}", response_model=StationRead)
async def update_station(
    station_id: UUID,
    data: StationUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update a station. Requires system admin role."""
    require_system_admin(current_user)
    station = await service.get_station(station_id, db)
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )
    updated = await service.update_station(station, data, db)
    return updated


@router.delete("/{station_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_station(
    station_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a station. Requires system admin role."""
    require_system_admin(current_user)
    station = await service.get_station(station_id, db)
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )
    await service.delete_station(station, db)



