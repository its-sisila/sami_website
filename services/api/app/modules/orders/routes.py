"""
Orders module API routes.
Fuel orders, deliveries, and regulatory returns endpoints.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.orders import service
from app.modules.orders.models import OrderStatus
from app.modules.orders.schemas import (
    FuelOrderCreate, FuelOrderUpdate, FuelOrderRead,
    FuelDeliveryCreate, FuelDeliveryRead,
    RegulatoryReturnCreate, RegulatoryReturnRead,
)


router = APIRouter()


def get_station_uuid(user: CurrentUser) -> UUID:
    """Extract and validate station_id from current user."""
    if not user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    return UUID(user.station_id) if isinstance(user.station_id, str) else user.station_id


# ============================================================================
# Fuel Orders
# ============================================================================

@router.get("", response_model=list[FuelOrderRead])
async def list_orders(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    order_status: Annotated[OrderStatus | None, Query(alias="status")] = None,
):
    """List all fuel orders for the station."""
    station_id = get_station_uuid(current_user)
    orders = await service.list_fuel_orders(station_id, db, status=order_status)
    return orders


@router.post("", response_model=FuelOrderRead, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: FuelOrderCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new fuel order."""
    station_id = get_station_uuid(current_user)
    order = await service.create_fuel_order(station_id, data, db)
    return order


@router.patch("/{order_id}", response_model=FuelOrderRead)
async def update_order(
    order_id: UUID,
    data: FuelOrderUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update a fuel order status."""
    station_id = get_station_uuid(current_user)
    order = await service.get_fuel_order(order_id, db)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Security: Ensure order belongs to user's station
    if order.station_id != station_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this order",
        )
    
    updated = await service.update_fuel_order(order, data, db)
    return updated


# ============================================================================
# Fuel Deliveries
# ============================================================================

@router.get("/deliveries", response_model=list[FuelDeliveryRead])
async def list_deliveries(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all fuel deliveries for the station."""
    station_id = get_station_uuid(current_user)
    deliveries = await service.list_deliveries(station_id, db)
    return deliveries


@router.post("/deliveries", response_model=FuelDeliveryRead, status_code=status.HTTP_201_CREATED)
async def create_delivery(
    data: FuelDeliveryCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Record a new fuel delivery."""
    # Note: Station validation happens implicitly via tank ownership
    # Could add explicit check if needed
    recorded_by = UUID(current_user.user_id) if current_user.user_id else None
    delivery = await service.create_delivery(data, recorded_by, db)
    return delivery


# ============================================================================
# Regulatory Returns
# ============================================================================

@router.get("/returns", response_model=list[RegulatoryReturnRead])
async def list_returns(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all regulatory returns for the station."""
    station_id = get_station_uuid(current_user)
    returns = await service.list_regulatory_returns(station_id, db)
    return returns


@router.post("/returns", response_model=RegulatoryReturnRead, status_code=status.HTTP_201_CREATED)
async def create_return(
    data: RegulatoryReturnCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Record a new regulatory return."""
    # Note: Station validation happens implicitly via tank ownership
    recorded_by = UUID(current_user.user_id) if current_user.user_id else None
    regulatory_return = await service.create_regulatory_return(data, recorded_by, db)
    return regulatory_return
