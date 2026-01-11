"""
Stations module business logic.
CRUD operations for stations (System Admin only).
"""

from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.stations.models import Station
from app.modules.stations.schemas import StationCreate, StationUpdate


async def list_stations(db: AsyncSession) -> list[Station]:
    """List all stations."""
    stmt = select(Station).order_by(Station.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_station(station_id: UUID, db: AsyncSession) -> Station | None:
    """Get a single station by ID."""
    stmt = select(Station).where(Station.id == station_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_station(data: StationCreate, db: AsyncSession) -> Station:
    """Create a new station."""
    station = Station(
        id=uuid4(),
        name=data.name,
        location=data.location,
        address=data.address,
        phone=data.phone,
        email=data.email,
    )
    db.add(station)
    await db.flush()
    return station


async def update_station(
    station: Station,
    data: StationUpdate,
    db: AsyncSession
) -> Station:
    """Update a station."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(station, field, value)
    await db.flush()
    return station


async def delete_station(station: Station, db: AsyncSession) -> None:
    """Delete a station (hard delete)."""
    await db.delete(station)
    await db.flush()


# ============================================================================
# Station Settings Functions
# ============================================================================

from app.modules.stations.models import StationSettings
from app.modules.stations.schemas import StationSettingsUpdate


async def get_station_settings(station_id: UUID, db: AsyncSession) -> StationSettings:
    """
    Get station settings. Creates default settings if none exist.
    """
    stmt = select(StationSettings).where(StationSettings.station_id == station_id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()
    
    if settings is None:
        # Create default settings for this station
        settings = StationSettings(
            id=uuid4(),
            station_id=station_id,
            late_arrival_threshold=10,
            early_departure_threshold=30,
        )
        db.add(settings)
        await db.flush()
    
    return settings


async def update_station_settings(
    station_id: UUID,
    data: StationSettingsUpdate,
    db: AsyncSession
) -> StationSettings:
    """
    Update station settings. Creates default settings if none exist.
    """
    settings = await get_station_settings(station_id, db)
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    await db.flush()
    return settings
