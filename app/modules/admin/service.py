"""
Admin module business logic.
Support access management and audit logging.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin.models import SupportAccess, AuditLog
from app.modules.admin.schemas import SupportAccessToggle
from app.modules.stations.models import Station


# ============================================================================
# Audit Log Helper
# ============================================================================

async def log_audit(
    db: AsyncSession,
    actor_id: UUID | None,
    action: str,
    station_id: UUID | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    """
    Insert an audit log entry.
    
    Args:
        db: Database session
        actor_id: UUID of the user performing the action
        action: Description of the action (e.g., "employee.create")
        station_id: Station context (if applicable)
        entity_type: Type of entity affected (e.g., "employee")
        entity_id: ID of entity affected
        details: Additional details as JSON
        ip_address: Client IP address
        user_agent: Client user agent
    
    Returns:
        Created AuditLog entry
    """
    log = AuditLog(
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
    db.add(log)
    await db.flush()
    return log


# ============================================================================
# Stations (System Admin)
# ============================================================================

async def list_all_stations(db: AsyncSession) -> list[Station]:
    """List all stations (system admin only)."""
    stmt = select(Station).order_by(Station.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_station(
    db: AsyncSession,
    name: str,
    owner_email: str,
    address: str | None = None,
    phone: str | None = None,
) -> Station:
    """
    Create a new station (system admin only).
    
    This creates the station record. Owner user creation/invite 
    should be handled separately through the users module.
    """
    station = Station(
        id=uuid4(),
        name=name,
        address=address,
        phone=phone,
        email=owner_email,  # Store owner email in station
        status="setup",
    )
    db.add(station)
    await db.flush()
    await db.refresh(station)
    return station


async def update_station(
    db: AsyncSession,
    station_id: UUID,
    name: str | None = None,
    address: str | None = None,
    phone: str | None = None,
    email: str | None = None,
    status: str | None = None,
) -> Station | None:
    """
    Update station details (system admin only).
    """
    stmt = select(Station).where(Station.id == station_id)
    result = await db.execute(stmt)
    station = result.scalar_one_or_none()
    
    if not station:
        return None
    
    if name is not None:
        station.name = name
    if address is not None:
        station.address = address
    if phone is not None:
        station.phone = phone
    if email is not None:
        station.email = email
    if status is not None:
        station.status = status
    
    await db.flush()
    await db.refresh(station)
    return station


# ============================================================================
# Support Access
# ============================================================================

async def get_support_access(station_id: UUID, db: AsyncSession) -> SupportAccess | None:
    """Get support access record for a station."""
    stmt = select(SupportAccess).where(SupportAccess.station_id == station_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def toggle_support_access(
    station_id: UUID,
    data: SupportAccessToggle,
    enabled_by: UUID,
    db: AsyncSession
) -> SupportAccess:
    """Toggle support access for a station."""
    existing = await get_support_access(station_id, db)
    
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=data.expires_in_hours or 24) if data.enabled else None
    
    if existing:
        existing.enabled = data.enabled
        existing.reason = data.reason
        existing.enabled_by = enabled_by if data.enabled else None
        existing.enabled_at = now if data.enabled else None
        existing.expires_at = expires_at
        existing.disabled_at = now if not data.enabled else None
        return existing
    else:
        access = SupportAccess(
            id=uuid4(),
            station_id=station_id,
            enabled=data.enabled,
            reason=data.reason,
            enabled_by=enabled_by if data.enabled else None,
            enabled_at=now if data.enabled else None,
            expires_at=expires_at,
        )
        db.add(access)
        await db.flush()
        return access


# ============================================================================
# Audit Log Query
# ============================================================================

async def get_audit_logs(
    db: AsyncSession,
    station_id: UUID | None = None,
    limit: int = 100
) -> list[AuditLog]:
    """Get audit log entries."""
    stmt = select(AuditLog)
    if station_id:
        stmt = stmt.where(AuditLog.station_id == station_id)
    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())
