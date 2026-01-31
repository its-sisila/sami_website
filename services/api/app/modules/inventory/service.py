"""
Inventory module business logic.
CRUD for tanks, products, and readings.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.inventory.models import FuelProduct, Tank, TankReading, FuelDelivery, Nozzle, Pump
from app.modules.inventory.schemas import (
    FuelProductCreate, FuelProductRead,
    TankCreate, TankWithLevel,
    TankReadingCreate, TankReadingRead,
    FuelDeliveryCreate,
    NozzleCreate, NozzleRead,
    PumpRead, PumpCreate,
)


# ============================================================================
# Fuel Products
# ============================================================================

async def list_products(station_id: UUID, db: AsyncSession) -> list[FuelProduct]:
    """List all fuel products for a station."""
    stmt = (
        select(FuelProduct)
        .where(FuelProduct.station_id == station_id)
        .where(FuelProduct.is_active == True)
        .order_by(FuelProduct.code)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_product(
    station_id: UUID,
    data: FuelProductCreate,
    db: AsyncSession
) -> FuelProductRead:
    """Create a new fuel product for a station."""
    # Check if product code already exists
    existing_stmt = select(FuelProduct).where(
        FuelProduct.station_id == station_id,
        FuelProduct.code == data.code
    )
    existing_result = await db.execute(existing_stmt)
    if existing_result.scalar_one_or_none():
        raise ValueError(f"Product with code '{data.code}' already exists")
    
    product = FuelProduct(
        id=uuid4(),
        station_id=station_id,
        code=data.code,
        name=data.name,
        price_per_liter=data.price_per_liter,
        is_active=True,
    )
    db.add(product)
    await db.flush()
    
    return FuelProductRead(
        id=product.id,
        station_id=product.station_id,
        code=product.code,
        name=product.name,
        price_per_liter=product.price_per_liter,
        is_active=product.is_active,
    )


async def update_product(
    station_id: UUID,
    product_id: UUID,
    data: FuelProductCreate,
    db: AsyncSession
) -> FuelProductRead:
    """Update a fuel product."""
    stmt = select(FuelProduct).where(
        FuelProduct.id == product_id,
        FuelProduct.station_id == station_id
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    if not product:
        raise ValueError("Product not found")
    
    product.code = data.code
    product.name = data.name
    product.price_per_liter = data.price_per_liter
    await db.flush()
    
    return FuelProductRead(
        id=product.id,
        station_id=product.station_id,
        code=product.code,
        name=product.name,
        price_per_liter=product.price_per_liter,
        is_active=product.is_active,
    )


async def delete_product(station_id: UUID, product_id: UUID, db: AsyncSession) -> None:
    """Delete (deactivate) a fuel product."""
    stmt = select(FuelProduct).where(
        FuelProduct.id == product_id,
        FuelProduct.station_id == station_id
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    if not product:
        raise ValueError("Product not found")
    
    # Soft delete - set is_active to False
    product.is_active = False
    await db.flush()


# ============================================================================
# Tanks
# ============================================================================

async def list_tanks(station_id: UUID, db: AsyncSession, for_date: date | None = None) -> list[TankWithLevel]:
    """List all tanks with current levels (latest reading) or reading for a specific date."""
    from datetime import date as date_type
    
    # Get tanks with product info
    stmt = (
        select(Tank)
        .options(selectinload(Tank.product))
        .where(Tank.station_id == station_id)
        .where(Tank.is_active == True)
        .order_by(Tank.name)
    )
    result = await db.execute(stmt)
    tanks = list(result.scalars().all())
    
    # Get reading for each tank (for specific date or latest)
    tank_levels = []
    for tank in tanks:
        if for_date:
            # Get reading for specific date
            reading_stmt = (
                select(TankReading.volume_liters)
                .where(TankReading.tank_id == tank.id)
                .where(TankReading.reading_date == for_date)
                .order_by(TankReading.created_at.desc())
                .limit(1)
            )
        else:
            # Get most recent reading
            reading_stmt = (
                select(TankReading.volume_liters)
                .where(TankReading.tank_id == tank.id)
                .order_by(TankReading.reading_date.desc(), TankReading.created_at.desc())
                .limit(1)
            )
        reading_result = await db.execute(reading_stmt)
        volume = reading_result.scalar_one_or_none()
        
        tank_levels.append(TankWithLevel(
            id=tank.id,
            station_id=tank.station_id,
            name=tank.name,
            product_id=tank.product_id,
            tank_type=tank.tank_type,
            capacity_liters=tank.capacity_liters,
            color=tank.color,
            is_active=tank.is_active,
            created_at=tank.created_at,
            current_volume=volume,
            product_name=tank.product.name if tank.product else None,
            product_code=tank.product.code if tank.product else None,
        ))
    
    return tank_levels


async def create_tank(station_id: UUID, data: TankCreate, db: AsyncSession) -> Tank:
    """Create a new tank."""
    tank = Tank(
        id=uuid4(),
        station_id=station_id,
        product_id=data.product_id,
        name=data.name,
        tank_type=data.tank_type,
        capacity_liters=data.capacity_liters,
        color=data.color,
    )
    db.add(tank)
    await db.flush()
    return tank


async def get_tank(tank_id: UUID, db: AsyncSession) -> Tank | None:
    """Get a single tank by ID."""
    stmt = select(Tank).where(Tank.id == tank_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_tank(
    station_id: UUID,
    tank_id: UUID,
    data: TankCreate,
    db: AsyncSession
) -> Tank:
    """Update a tank."""
    stmt = select(Tank).where(Tank.id == tank_id, Tank.station_id == station_id)
    result = await db.execute(stmt)
    tank = result.scalar_one_or_none()
    if not tank:
        raise ValueError("Tank not found")
    
    tank.name = data.name
    tank.product_id = data.product_id
    tank.tank_type = data.tank_type
    tank.capacity_liters = data.capacity_liters
    tank.color = data.color
    
    await db.flush()
    return tank


async def delete_tank(station_id: UUID, tank_id: UUID, db: AsyncSession) -> None:
    """Delete (deactivate) a tank."""
    stmt = select(Tank).where(
        Tank.id == tank_id,
        Tank.station_id == station_id
    )
    result = await db.execute(stmt)
    tank = result.scalar_one_or_none()
    if not tank:
        raise ValueError("Tank not found")
    
    tank.is_active = False
    await db.flush()


# ============================================================================
# Tank Readings
# ============================================================================

async def submit_readings(
    data: TankReadingCreate,
    recorded_by: UUID | None,
    db: AsyncSession
) -> list[TankReading]:
    """Submit daily dip readings for multiple tanks."""
    created = []
    
    for entry in data.readings:
        # Use entry-level staff fields if available, otherwise use global fields
        staff_responsible = entry.staff_responsible_ids or data.staff_responsible_ids
        monitored_by = entry.monitored_by_ids or data.monitored_by_ids
        
        # Check if reading already exists for this tank+date
        stmt = select(TankReading).where(
            and_(
                TankReading.tank_id == entry.tank_id,
                TankReading.reading_date == data.reading_date
            )
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        # Prepare meter readings as JSON-serializable list of dicts
        meter_readings_json = None
        if entry.meter_readings:
            meter_readings_json = [m.model_dump() for m in entry.meter_readings]

        if existing:
            # Update existing reading
            existing.height_cm = entry.height_cm
            existing.volume_liters = entry.volume_liters
            existing.staff_responsible_ids = staff_responsible
            existing.monitored_by_ids = monitored_by
            existing.meter_readings = meter_readings_json
            created.append(existing)
        else:
            # Create new reading
            reading = TankReading(
                id=uuid4(),
                tank_id=entry.tank_id,
                reading_date=data.reading_date,
                height_cm=entry.height_cm,
                volume_liters=entry.volume_liters,
                reading_type="manual",
                recorded_by=recorded_by,
                staff_responsible_ids=staff_responsible,
                monitored_by_ids=monitored_by,
                meter_readings=meter_readings_json,
            )
            db.add(reading)
            created.append(reading)
    
    await db.flush()
    return created


async def get_tank_readings(
    tank_id: UUID,
    limit: int = 30,
    db: AsyncSession = None
) -> list[TankReading]:
    """Get historical readings for a tank, most recent first."""
    stmt = (
        select(TankReading)
        .where(TankReading.tank_id == tank_id)
        .order_by(TankReading.reading_date.desc(), TankReading.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_all_readings_history(
    station_id: UUID,
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
    tank_id: UUID | None = None,
    limit: int = 500,
) -> list[dict]:
    """Get all tank readings history for a station with tank info, most recent first."""
    from sqlalchemy.orm import joinedload
    from app.modules.employees.models import Employee
    
    stmt = (
        select(TankReading)
        .join(Tank, TankReading.tank_id == Tank.id)
        .where(Tank.station_id == station_id)
        .options(joinedload(TankReading.tank))
        .order_by(TankReading.reading_date.desc(), TankReading.created_at.desc())
    )
    
    # Apply filters
    if start_date:
        stmt = stmt.where(TankReading.reading_date >= start_date)
    if end_date:
        stmt = stmt.where(TankReading.reading_date <= end_date)
    if tank_id:
        stmt = stmt.where(TankReading.tank_id == tank_id)
    
    stmt = stmt.limit(limit)
    
    result = await db.execute(stmt)
    readings = list(result.scalars().all())
    
    # Collect all unique employee IDs for lookup
    all_employee_ids = set()
    for r in readings:
        if r.staff_responsible_ids:
            all_employee_ids.update(r.staff_responsible_ids)
        if r.monitored_by_ids:
            all_employee_ids.update(r.monitored_by_ids)
    
    # Fetch employee names in bulk
    employee_names = {}
    if all_employee_ids:
        # Filter and validate UUIDs
        valid_uuids = []
        for eid in all_employee_ids:
            if eid:
                try:
                    valid_uuids.append(UUID(eid))
                except (ValueError, TypeError):
                    pass  # Skip invalid UUIDs
        
        if valid_uuids:
            emp_stmt = select(Employee.id, Employee.full_name).where(
                Employee.id.in_(valid_uuids)
            )
            emp_result = await db.execute(emp_stmt)
            for emp_id, name in emp_result.all():
                employee_names[str(emp_id)] = name
    
    # Helper to get names from IDs
    def get_names(ids: list | None) -> list[str]:
        if not ids:
            return []
        return [employee_names.get(eid, "Unknown") for eid in ids]
    
    # Return as list of dicts with tank name and staff names included
    return [
        {
            "id": str(r.id),
            "tank_id": str(r.tank_id),
            "tank_name": r.tank.name if r.tank else "Unknown",
            "reading_date": r.reading_date.isoformat() if r.reading_date else None,
            "volume_liters": float(r.volume_liters) if r.volume_liters else 0,
            "height_cm": float(r.height_cm) if r.height_cm else None,
            "staff_responsible_ids": r.staff_responsible_ids or [],
            "staff_responsible_names": get_names(r.staff_responsible_ids),
            "monitored_by_ids": r.monitored_by_ids or [],
            "monitored_by_names": get_names(r.monitored_by_ids),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in readings
    ]


# ============================================================================
# Fuel Deliveries
# ============================================================================

async def record_delivery(
    data: FuelDeliveryCreate,
    recorded_by: UUID | None,
    db: AsyncSession
) -> FuelDelivery:
    """Record a fuel delivery into a tank."""
    from datetime import date as date_type
    
    delivery = FuelDelivery(
        id=uuid4(),
        tank_id=data.tank_id,
        order_id=data.order_id,
        liters_received=data.liters_received,
        delivery_date=data.delivery_date or date_type.today(),
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
# Nozzles
# ============================================================================

async def list_nozzles(station_id: UUID, db: AsyncSession) -> list[NozzleRead]:
    """List all nozzles for the station with pump and product info."""
    # Get all pumps for the station first
    pumps_stmt = select(Pump.id).where(Pump.station_id == station_id)
    pumps_result = await db.execute(pumps_stmt)
    pump_ids = [p[0] for p in pumps_result.all()]
    
    if not pump_ids:
        return []
    
    # Get nozzles with related data
    stmt = (
        select(Nozzle, Pump.name.label("pump_name"), FuelProduct.name.label("product_name"),
               FuelProduct.code.label("product_code"), FuelProduct.price_per_liter)
        .join(Pump, Nozzle.pump_id == Pump.id)
        .join(FuelProduct, Nozzle.product_id == FuelProduct.id)
        .where(Nozzle.pump_id.in_(pump_ids))
        .where(Nozzle.is_active == True)
        .order_by(Pump.name, Nozzle.nozzle_name)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    nozzles = []
    for row in rows:
        nozzle = row[0]
        nozzles.append(NozzleRead(
            id=nozzle.id,
            nozzle_code=nozzle.nozzle_code,
            nozzle_name=nozzle.nozzle_name,
            pump_id=nozzle.pump_id,
            tank_id=nozzle.tank_id,
            product_id=nozzle.product_id,
            is_active=nozzle.is_active,
            pump_name=row[1],  # pump_name
            product_name=row[2],  # product_name
            product_code=row[3],  # product_code
            price_per_liter=row[4],  # price_per_liter
        ))
    
    return nozzles


async def list_pumps(station_id: UUID, db: AsyncSession) -> list[PumpRead]:
    """List all pumps for the station."""
    stmt = (
        select(Pump)
        .where(Pump.station_id == station_id)
        .where(Pump.is_active == True)
        .order_by(Pump.name)
    )
    result = await db.execute(stmt)
    pumps = result.scalars().all()
    return [PumpRead.model_validate(p) for p in pumps]


async def create_nozzle(
    station_id: UUID,
    data: NozzleCreate,
    db: AsyncSession
) -> NozzleRead:
    """Create a new nozzle."""
    # Verify tank belongs to station
    tank_stmt = select(Tank).where(Tank.id == data.tank_id, Tank.station_id == station_id)
    tank_result = await db.execute(tank_stmt)
    tank = tank_result.scalar_one_or_none()
    if not tank:
        raise ValueError("Tank not found or does not belong to this station")
    
    # Verify pump belongs to station
    pump_stmt = select(Pump).where(Pump.id == data.pump_id, Pump.station_id == station_id)
    pump_result = await db.execute(pump_stmt)
    pump = pump_result.scalar_one_or_none()
    if not pump:
        raise ValueError("Pump not found or does not belong to this station")
    
    # Create nozzle with auto-generated UUID
    nozzle = Nozzle(
        id=uuid4(),
        nozzle_code=data.nozzle_code,  # User-provided code (e.g., N-LAD-1)
        nozzle_name=data.nozzle_name,
        pump_id=data.pump_id,
        tank_id=data.tank_id,
        product_id=data.product_id,
        is_active=True,
    )
    db.add(nozzle)
    await db.flush()
    
    # TODO: Store initial meter readings (digital_meter, analog_meter) if needed
    # For now, these will be used on the frontend to initialize the sales form
    
    # Fetch with related data for response
    stmt = (
        select(Nozzle, Pump.name.label("pump_name"), FuelProduct.name.label("product_name"),
               FuelProduct.code.label("product_code"), FuelProduct.price_per_liter)
        .join(Pump, Nozzle.pump_id == Pump.id)
        .join(FuelProduct, Nozzle.product_id == FuelProduct.id)
        .where(Nozzle.id == nozzle.id)
    )
    result = await db.execute(stmt)
    row = result.one()
    
    return NozzleRead(
        id=nozzle.id,
        nozzle_code=nozzle.nozzle_code,
        nozzle_name=nozzle.nozzle_name,
        pump_id=nozzle.pump_id,
        tank_id=nozzle.tank_id,
        product_id=nozzle.product_id,
        is_active=nozzle.is_active,
        pump_name=row[1],
        product_name=row[2],
        product_code=row[3],
        price_per_liter=row[4],
    )


async def update_nozzle(
    station_id: UUID,
    nozzle_id: UUID,
    data: NozzleCreate,
    db: AsyncSession
) -> NozzleRead:
    """Update a nozzle."""
    stmt = (
        select(Nozzle)
        .join(Pump, Nozzle.pump_id == Pump.id)
        .where(Nozzle.id == nozzle_id, Pump.station_id == station_id)
    )
    result = await db.execute(stmt)
    nozzle = result.scalar_one_or_none()
    if not nozzle:
        raise ValueError("Nozzle not found")
        
    # Verify tank belongs to station
    tank_stmt = select(Tank).where(Tank.id == data.tank_id, Tank.station_id == station_id)
    tank_result = await db.execute(tank_stmt)
    tank = tank_result.scalar_one_or_none()
    if not tank:
        raise ValueError("Tank not found or does not belong to this station")
    
    # Verify pump belongs to station
    pump_stmt = select(Pump).where(Pump.id == data.pump_id, Pump.station_id == station_id)
    pump_result = await db.execute(pump_stmt)
    pump = pump_result.scalar_one_or_none()
    if not pump:
        raise ValueError("Pump not found or does not belong to this station")
    
    # Update nozzle fields
    nozzle.nozzle_code = data.nozzle_code
    nozzle.nozzle_name = data.nozzle_name
    nozzle.pump_id = data.pump_id
    nozzle.tank_id = data.tank_id
    nozzle.product_id = data.product_id
    await db.flush()
    
    # Fetch updated nozzle with related data
    stmt = (
        select(Nozzle, Pump.name.label("pump_name"), FuelProduct.name.label("product_name"),
               FuelProduct.code.label("product_code"), FuelProduct.price_per_liter)
        .join(Pump, Nozzle.pump_id == Pump.id)
        .join(FuelProduct, Nozzle.product_id == FuelProduct.id)
        .where(Nozzle.id == nozzle.id)
    )
    result = await db.execute(stmt)
    row = result.one()
    
    return NozzleRead(
        id=nozzle.id,
        nozzle_code=nozzle.nozzle_code,
        nozzle_name=nozzle.nozzle_name,
        pump_id=nozzle.pump_id,
        tank_id=nozzle.tank_id,
        product_id=nozzle.product_id,
        is_active=nozzle.is_active,
        pump_name=row[1],
        product_name=row[2],
        product_code=row[3],
        price_per_liter=row[4],
    )


async def delete_nozzle(station_id: UUID, nozzle_id: UUID, db: AsyncSession) -> None:
    """Delete (deactivate) a nozzle."""
    stmt = (
        select(Nozzle)
        .join(Pump, Nozzle.pump_id == Pump.id)
        .where(Nozzle.id == nozzle_id, Pump.station_id == station_id)
    )
    result = await db.execute(stmt)
    nozzle = result.scalar_one_or_none()
    if not nozzle:
        raise ValueError("Nozzle not found")
    
    nozzle.is_active = False
    await db.flush()


async def create_pump(
    station_id: UUID,
    data: PumpCreate,
    db: AsyncSession
) -> PumpRead:
    """Create a new pump."""
    pump = Pump(
        id=uuid4(),
        station_id=station_id,
        name=data.name,
        location=data.location,
        is_active=True,
    )
    db.add(pump)
    await db.flush()
    return PumpRead.model_validate(pump)


async def update_pump(
    station_id: UUID,
    pump_id: UUID,
    data: PumpCreate,
    db: AsyncSession
) -> PumpRead:
    """Update a pump."""
    stmt = select(Pump).where(Pump.id == pump_id, Pump.station_id == station_id)
    result = await db.execute(stmt)
    pump = result.scalar_one_or_none()
    if not pump:
        raise ValueError("Pump not found")
    
    pump.name = data.name
    pump.location = data.location
    await db.flush()
    return PumpRead.model_validate(pump)


async def delete_pump(station_id: UUID, pump_id: UUID, db: AsyncSession) -> None:
    """Delete (deactivate) a pump."""
    stmt = select(Pump).where(Pump.id == pump_id, Pump.station_id == station_id)
    result = await db.execute(stmt)
    pump = result.scalar_one_or_none()
    if not pump:
        raise ValueError("Pump not found")
    
    pump.is_active = False
    await db.flush()


