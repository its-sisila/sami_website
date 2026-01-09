"""
Admin module API routes.
System admin only endpoints for station management and support access.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.admin import service
from app.modules.admin.schemas import SupportAccessToggle, SupportAccessRead, AuditLogRead, StationCreateAdmin, StationUpdateAdmin
from app.modules.stations.schemas import StationRead


router = APIRouter()


def require_system_admin(user: CurrentUser):
    """Check if user is system admin."""
    if user.role != "system_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"System admin access required. Got role: {user.role}",
        )


# ============================================================================
# Stations
# ============================================================================

@router.get("/stations", response_model=list[StationRead])
async def list_stations(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all stations. Requires system admin role."""
    require_system_admin(current_user)
    stations = await service.list_all_stations(db)
    return stations


@router.post("/stations", response_model=StationRead, status_code=status.HTTP_201_CREATED)
async def create_station(
    data: StationCreateAdmin,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new station. Requires system admin role."""
    require_system_admin(current_user)
    
    station = await service.create_station(
        db=db,
        name=data.name,
        owner_email=data.owner_email,
        address=data.address,
        phone=data.phone,
    )
    
    # Log the action
    await service.log_audit(
        db=db,
        actor_id=UUID(current_user.user_id),
        action="station.create",
        station_id=station.id,
        entity_type="station",
        entity_id=station.id,
        details={"name": data.name, "owner_email": data.owner_email},
    )
    
    await db.commit()
    return station


@router.patch("/stations/{station_id}", response_model=StationRead)
async def update_station(
    station_id: UUID,
    data: StationUpdateAdmin,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update station details. Requires system admin role."""
    require_system_admin(current_user)
    
    station = await service.update_station(
        db=db,
        station_id=station_id,
        name=data.name,
        address=data.address,
        phone=data.phone,
        email=data.email,
        status=data.status,
    )
    
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found",
        )
    
    # Log the action
    await service.log_audit(
        db=db,
        actor_id=UUID(current_user.user_id),
        action="station.update",
        station_id=station.id,
        entity_type="station",
        entity_id=station.id,
        details={"updates": data.model_dump(exclude_unset=True)},
    )
    
    await db.commit()
    return station


# ============================================================================
# Support Access
# ============================================================================

@router.post("/support-access/{station_id}", response_model=SupportAccessRead)
async def toggle_support_access(
    station_id: UUID,
    data: SupportAccessToggle,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Toggle support edit mode for a station. Requires system admin role."""
    require_system_admin(current_user)
    
    enabled_by = UUID(current_user.user_id)
    access = await service.toggle_support_access(station_id, data, enabled_by, db)
    
    # Log the action
    await service.log_audit(
        db=db,
        actor_id=enabled_by,
        action="support_access.toggle",
        station_id=station_id,
        entity_type="support_access",
        entity_id=access.id,
        details={"enabled": data.enabled, "reason": data.reason},
    )
    
    return access


@router.get("/support-access/{station_id}", response_model=SupportAccessRead | None)
async def get_support_access(
    station_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get support access status for a station. Requires system admin role."""
    require_system_admin(current_user)
    access = await service.get_support_access(station_id, db)
    return access


# ============================================================================
# Audit Log
# ============================================================================

@router.get("/audit-log", response_model=list[AuditLogRead])
async def get_audit_log(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    station_id: UUID | None = Query(None, description="Filter by station"),
    limit: int = Query(100, le=500, description="Max entries to return"),
):
    """Get audit log entries. Requires system admin role."""
    require_system_admin(current_user)
    logs = await service.get_audit_logs(db, station_id=station_id, limit=limit)
    return logs
