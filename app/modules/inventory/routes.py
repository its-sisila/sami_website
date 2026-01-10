"""
Inventory module API routes.
Tanks, products, and dip readings endpoints.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.inventory import service
from app.modules.inventory.schemas import (
    FuelProductCreate, FuelProductRead,
    TankCreate, TankRead, TankWithLevel,
    TankReadingCreate, TankReadingRead,
    FuelDeliveryCreate, FuelDeliveryRead,
    NozzleCreate, NozzleRead,
    PumpRead,
)


router = APIRouter()


# ============================================================================
# Fuel Products
# ============================================================================

@router.get("/products", response_model=list[FuelProductRead])
async def list_products(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all fuel products for the station."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    products = await service.list_products(station_id, db)
    return products


@router.post("/products", response_model=FuelProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: FuelProductCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new fuel product for the station."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    try:
        product = await service.create_product(station_id, data, db)
        await db.commit()
        return product
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/products/{product_id}", response_model=FuelProductRead)
async def update_product(
    product_id: UUID,
    data: FuelProductCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update a fuel product."""
    if not current_user.station_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a station")
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    try:
        product = await service.update_product(station_id, product_id, data, db)
        await db.commit()
        return product
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a fuel product."""
    if not current_user.station_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a station")
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    try:
        await service.delete_product(station_id, product_id, db)
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# Tanks
# ============================================================================

@router.get("/tanks", response_model=list[TankWithLevel])
async def list_tanks(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    for_date: str | None = None,
):
    """List all tanks with current levels, or levels for a specific date."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    
    # Parse date if provided
    from datetime import date
    parsed_date = None
    if for_date:
        try:
            parsed_date = date.fromisoformat(for_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD",
            )
    
    tanks = await service.list_tanks(station_id, db, for_date=parsed_date)
    return tanks


@router.post("/tanks", response_model=TankRead, status_code=status.HTTP_201_CREATED)
async def create_tank(
    data: TankCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new tank."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    tank = await service.create_tank(station_id, data, db)
    return tank


@router.put("/tanks/{tank_id}", response_model=TankRead)
async def update_tank(
    tank_id: UUID,
    data: TankCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update a tank."""
    if not current_user.station_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a station")
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    try:
        tank = await service.update_tank(station_id, tank_id, data, db)
        await db.commit()
        return tank
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/tanks/{tank_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tank(
    tank_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a tank."""
    if not current_user.station_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a station")
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    try:
        await service.delete_tank(station_id, tank_id, db)
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# Tank Readings
# ============================================================================

@router.post("/readings", response_model=list[TankReadingRead], status_code=status.HTTP_201_CREATED)
async def submit_readings(
    data: TankReadingCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Submit daily dip readings for tanks."""
    recorded_by = UUID(current_user.user_id) if current_user.user_id else None
    readings = await service.submit_readings(data, recorded_by, db)
    return readings


@router.get("/tanks/{tank_id}/readings", response_model=list[TankReadingRead])
async def get_tank_readings(
    tank_id: UUID,
    limit: int = 30,
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """Get historical readings for a tank."""
    # Verify tank exists
    tank = await service.get_tank(tank_id, db)
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")
    
    readings = await service.get_tank_readings(tank_id, limit, db)
    return readings


@router.get("/readings/history")
async def get_readings_history(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: str | None = None,
    end_date: str | None = None,
    tank_id: str | None = None,
    limit: int = 500,
):
    """Get all tank readings history for the station."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    
    # Parse dates
    from datetime import date
    parsed_start = None
    parsed_end = None
    parsed_tank_id = None
    
    if start_date:
        try:
            parsed_start = date.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    
    if end_date:
        try:
            parsed_end = date.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    
    if tank_id:
        try:
            parsed_tank_id = UUID(tank_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid tank_id format")
    
    readings = await service.get_all_readings_history(
        station_id, db,
        start_date=parsed_start,
        end_date=parsed_end,
        tank_id=parsed_tank_id,
        limit=limit,
    )
    return readings


# ============================================================================
# Fuel Deliveries
# ============================================================================

@router.post("/deliveries", response_model=FuelDeliveryRead, status_code=status.HTTP_201_CREATED)
async def record_delivery(
    data: FuelDeliveryCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Record a fuel delivery into a tank."""
    recorded_by = UUID(current_user.user_id) if current_user.user_id else None
    delivery = await service.record_delivery(data, recorded_by, db)
    return delivery


# ============================================================================
# Nozzles
# ============================================================================

@router.get("/nozzles", response_model=list[NozzleRead])
async def list_nozzles(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all nozzles for the station with pump and product info."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    nozzles = await service.list_nozzles(station_id, db)
    return nozzles


@router.post("/nozzles", response_model=NozzleRead, status_code=status.HTTP_201_CREATED)
async def create_nozzle(
    data: NozzleCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new nozzle."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    try:
        nozzle = await service.create_nozzle(station_id, data, db)
        await db.commit()
        return nozzle
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/nozzles/{nozzle_id}", response_model=NozzleRead)
async def update_nozzle(
    nozzle_id: str,
    data: NozzleCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update a nozzle."""
    if not current_user.station_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a station")
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    try:
        nozzle = await service.update_nozzle(station_id, nozzle_id, data, db)
        await db.commit()
        return nozzle
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/nozzles/{nozzle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nozzle(
    nozzle_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a nozzle."""
    if not current_user.station_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not assigned to a station")
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    try:
        await service.delete_nozzle(station_id, nozzle_id, db)
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# Pumps
# ============================================================================

@router.get("/pumps", response_model=list[PumpRead])
async def list_pumps(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all pumps for the station."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    pumps = await service.list_pumps(station_id, db)
    return pumps
