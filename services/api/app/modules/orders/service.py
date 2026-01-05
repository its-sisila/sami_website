"""
Orders module business logic.
CRUD operations for fuel orders, deliveries, and regulatory returns.
"""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.models import FuelOrder, RegulatoryReturn, OrderStatus
from app.modules.orders.schemas import (
    FuelOrderCreate, FuelOrderUpdate,
    FuelDeliveryCreate,
    RegulatoryReturnCreate,
)
from app.modules.inventory.models import Tank, FuelDelivery


# ============================================================================
# Fuel Orders
# ============================================================================

async def list_fuel_orders(
    station_id: UUID,
    db: AsyncSession,
    status: OrderStatus | None = None,
) -> list[FuelOrder]:
    """List all fuel orders for a station, optionally filtered by status."""
    stmt = select(FuelOrder).where(FuelOrder.station_id == station_id)
    
    if status:
        stmt = stmt.where(FuelOrder.status == status)
    
    stmt = stmt.order_by(FuelOrder.placed_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_fuel_order(order_id: UUID, db: AsyncSession) -> FuelOrder | None:
    """Get a single fuel order by ID."""
    stmt = select(FuelOrder).where(FuelOrder.id == order_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_fuel_order(
    station_id: UUID,
    data: FuelOrderCreate,
    db: AsyncSession,
) -> FuelOrder:
    """Create a new fuel order."""
    order = FuelOrder(
        id=uuid4(),
        station_id=station_id,
        product_id=data.product_id,
        order_number=data.order_number,
        liters_ordered=data.liters_ordered,
        supplier=data.supplier,
        expected_date=data.expected_date,
        notes=data.notes,
        placed_at=data.placed_at or datetime.utcnow(),
        status=OrderStatus.pending,
    )
    db.add(order)
    await db.flush()
    return order


async def update_fuel_order(
    order: FuelOrder,
    data: FuelOrderUpdate,
    db: AsyncSession,
) -> FuelOrder:
    """Update a fuel order."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    await db.flush()
    return order


# ============================================================================
# Fuel Deliveries
# ============================================================================

async def list_deliveries(
    station_id: UUID,
    db: AsyncSession,
) -> list[FuelDelivery]:
    """List all fuel deliveries for a station (via tank -> station join)."""
    stmt = (
        select(FuelDelivery)
        .join(Tank, FuelDelivery.tank_id == Tank.id)
        .where(Tank.station_id == station_id)
        .order_by(FuelDelivery.delivery_date.desc(), FuelDelivery.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_delivery(delivery_id: UUID, db: AsyncSession) -> FuelDelivery | None:
    """Get a single delivery by ID."""
    stmt = select(FuelDelivery).where(FuelDelivery.id == delivery_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_delivery(
    data: FuelDeliveryCreate,
    recorded_by: UUID | None,
    db: AsyncSession,
) -> FuelDelivery:
    """Record a new fuel delivery."""
    delivery = FuelDelivery(
        id=uuid4(),
        tank_id=data.tank_id,
        order_id=data.order_id,
        liters_received=data.liters_received,
        delivery_date=data.delivery_date or date.today(),
        delivery_time=data.delivery_time,
        delivery_slip_number=data.delivery_slip_number,
        vehicle_number=data.vehicle_number,
        driver_name=data.driver_name,
        recorded_by=recorded_by,
        notes=data.notes,
    )
    db.add(delivery)
    await db.flush()
    return delivery


# ============================================================================
# Regulatory Returns
# ============================================================================

async def list_regulatory_returns(
    station_id: UUID,
    db: AsyncSession,
) -> list[RegulatoryReturn]:
    """List all regulatory returns for a station (via tank -> station join)."""
    stmt = (
        select(RegulatoryReturn)
        .join(Tank, RegulatoryReturn.tank_id == Tank.id)
        .where(Tank.station_id == station_id)
        .order_by(RegulatoryReturn.return_date.desc(), RegulatoryReturn.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_regulatory_return(return_id: UUID, db: AsyncSession) -> RegulatoryReturn | None:
    """Get a single regulatory return by ID."""
    stmt = select(RegulatoryReturn).where(RegulatoryReturn.id == return_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_regulatory_return(
    data: RegulatoryReturnCreate,
    recorded_by: UUID | None,
    db: AsyncSession,
) -> RegulatoryReturn:
    """Record a new regulatory return."""
    regulatory_return = RegulatoryReturn(
        id=uuid4(),
        tank_id=data.tank_id,
        shift_id=data.shift_id,
        staff_id=data.staff_id,
        liters_returned=data.liters_returned,
        reason=data.reason,
        return_date=data.return_date or date.today(),
        recorded_by=recorded_by,
    )
    db.add(regulatory_return)
    await db.flush()
    return regulatory_return
