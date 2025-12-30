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
from app.modules.admin.schemas import SupportAccessToggle, SupportAccessRead, AuditLogRead
from app.modules.stations.schemas import StationRead


router = APIRouter()


def require_system_admin(user: CurrentUser):
    """Check if user is system admin."""
    if user.role != "system_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System admin access required",
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
