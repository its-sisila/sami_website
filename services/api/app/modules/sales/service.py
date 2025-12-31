"""
Sales module business logic.
Shift management and sales entry recording.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.sales.models import Shift, Sale, ShiftType, ShiftStatus
from app.modules.sales.schemas import ShiftStart, ShiftRead, SaleEntryCreate, SaleRead


# ============================================================================
# Shifts
# ============================================================================

async def start_shift(
    station_id: UUID,
    data: ShiftStart,
    opened_by: UUID | None,
    db: AsyncSession
) -> Shift:
    """Start a new shift."""
    shift_date = data.date or date.today()
    
    # Check if shift already exists for this station+type+date
    stmt = select(Shift).where(
        and_(
            Shift.station_id == station_id,
            Shift.shift_type == data.shift_type,
            Shift.date == shift_date,
        )
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.status == ShiftStatus.open:
            return existing  # Already open, return it
        raise ValueError(f"Shift {data.shift_type.value} for {shift_date} already exists and is closed")
    
    shift = Shift(
        id=uuid4(),
        station_id=station_id,
        shift_type=data.shift_type,
        date=shift_date,
        status=ShiftStatus.open,
        opened_at=datetime.utcnow(),
        opened_by=opened_by,
        notes=data.notes,
    )
    db.add(shift)
    await db.flush()
    return shift


async def end_shift(
    shift_id: UUID,
    closed_by: UUID | None,
    notes: str | None,
    db: AsyncSession
) -> Shift:
    """End/close a shift."""
    stmt = select(Shift).where(Shift.id == shift_id)
    result = await db.execute(stmt)
    shift = result.scalar_one_or_none()
    
    if not shift:
        raise ValueError(f"Shift {shift_id} not found")
    
    if shift.status != ShiftStatus.open:
        raise ValueError(f"Shift is already {shift.status.value}")
    
    shift.status = ShiftStatus.closed
    shift.closed_at = datetime.utcnow()
    shift.closed_by = closed_by
    if notes:
        shift.notes = (shift.notes or "") + f"\n{notes}"
    
    await db.flush()
    return shift


async def get_current_shift(station_id: UUID, db: AsyncSession) -> Shift | None:
    """Get the current open shift for a station."""
    stmt = (
        select(Shift)
        .where(Shift.station_id == station_id)
        .where(Shift.status == ShiftStatus.open)
        .order_by(Shift.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_shift(shift_id: UUID, db: AsyncSession) -> Shift | None:
    """Get a shift by ID."""
    stmt = select(Shift).where(Shift.id == shift_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ============================================================================
# Sales
# ============================================================================

async def record_sale_entry(data: SaleEntryCreate, db: AsyncSession) -> Sale:
    """
    Record meter readings for a nozzle.
    Calculates liters_sold and amount automatically.
    """
    # Calculate liters sold
    liters_sold = data.end_meter_digital - data.start_meter_digital
    if liters_sold < 0:
        raise ValueError("End meter cannot be less than start meter")
    
    # Calculate amount
    amount_lkr = liters_sold * data.price_per_liter
    
    # Check if entry already exists for this shift+nozzle
    stmt = select(Sale).where(
        and_(
            Sale.shift_id == data.shift_id,
            Sale.nozzle_id == data.nozzle_id,
        )
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update existing entry
        existing.start_meter_digital = data.start_meter_digital
        existing.end_meter_digital = data.end_meter_digital
        existing.start_meter_analog = data.start_meter_analog
        existing.end_meter_analog = data.end_meter_analog
        existing.liters_sold = liters_sold
        existing.price_per_liter = data.price_per_liter
        existing.amount_lkr = amount_lkr
        existing.employee_id = data.employee_id
        existing.notes = data.notes
        sale = existing
    else:
        # Create new entry
        sale = Sale(
            id=uuid4(),
            shift_id=data.shift_id,
            nozzle_id=data.nozzle_id,
            employee_id=data.employee_id,
            start_meter_digital=data.start_meter_digital,
            end_meter_digital=data.end_meter_digital,
            start_meter_analog=data.start_meter_analog,
            end_meter_analog=data.end_meter_analog,
            liters_sold=liters_sold,
            price_per_liter=data.price_per_liter,
            amount_lkr=amount_lkr,
            notes=data.notes,
        )
        db.add(sale)
    
    await db.flush()
    return sale


async def get_shift_sales(shift_id: UUID, db: AsyncSession) -> list[Sale]:
    """Get all sales for a shift."""
    stmt = select(Sale).where(Sale.shift_id == shift_id).order_by(Sale.created_at)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_last_meter_readings(station_id: UUID, db: AsyncSession) -> dict[str, Decimal]:
    """
    Get the last end_meter_digital reading for each nozzle in the station.
    
    Returns a dict of nozzle_id -> last_end_meter value.
    This is used to auto-populate the start meter for new shifts.
    """
    from app.modules.inventory.models import Pump, Nozzle
    
    # Subquery to find the max created_at (latest sale) per nozzle
    # First, get all nozzle IDs for this station's pumps
    pump_subq = select(Pump.id).where(Pump.station_id == station_id)
    nozzle_subq = select(Nozzle.id).where(Nozzle.pump_id.in_(pump_subq))
    
    # Get the latest sale per nozzle
    # Using a correlated subquery to find the max created_at for each nozzle
    latest_sale_subq = (
        select(func.max(Sale.created_at))
        .where(Sale.nozzle_id == Sale.nozzle_id)  # This will be correlated
        .correlate(Sale)
        .scalar_subquery()
    )
    
    # Alternative simpler approach: Get all sales for station nozzles, order by created_at desc
    # and dedupe in Python
    stmt = (
        select(Sale.nozzle_id, Sale.end_meter_digital, Sale.created_at)
        .where(Sale.nozzle_id.in_(nozzle_subq))
        .order_by(Sale.nozzle_id, Sale.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    # Dedupe: keep only the first (most recent) entry per nozzle
    last_readings = {}
    for row in rows:
        nozzle_id_str = str(row[0])
        if nozzle_id_str not in last_readings:
            last_readings[nozzle_id_str] = row[1]  # end_meter_digital
    
    return last_readings


# ============================================================================
# Shift Scheduling
# ============================================================================

from app.modules.sales.models import ShiftAssignment


async def get_scheduled_employees(
    station_id: UUID,
    shift_date: date,
    shift_type: ShiftType,
    db: AsyncSession
) -> list[UUID]:
    """Get employee IDs scheduled for a specific shift."""
    stmt = select(ShiftAssignment.employee_id).where(
        and_(
            ShiftAssignment.station_id == station_id,
            ShiftAssignment.shift_date == shift_date,
            ShiftAssignment.shift_type == shift_type,
        )
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def schedule_employee(
    station_id: UUID,
    shift_date: date,
    shift_type: ShiftType,
    employee_id: UUID,
    assigned_by: UUID | None,
    db: AsyncSession
) -> ShiftAssignment:
    """Assign an employee to a shift."""
    # Check if already assigned
    stmt = select(ShiftAssignment).where(
        and_(
            ShiftAssignment.station_id == station_id,
            ShiftAssignment.shift_date == shift_date,
            ShiftAssignment.shift_type == shift_type,
            ShiftAssignment.employee_id == employee_id,
        )
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        return existing  # Already assigned
    
    assignment = ShiftAssignment(
        id=uuid4(),
        station_id=station_id,
        shift_date=shift_date,
        shift_type=shift_type,
        employee_id=employee_id,
        assigned_by=assigned_by,
    )
    db.add(assignment)
    await db.flush()
    return assignment


async def unschedule_employee(
    station_id: UUID,
    shift_date: date,
    shift_type: ShiftType,
    employee_id: UUID,
    db: AsyncSession
) -> bool:
    """Remove an employee from a shift schedule."""
    stmt = select(ShiftAssignment).where(
        and_(
            ShiftAssignment.station_id == station_id,
            ShiftAssignment.shift_date == shift_date,
            ShiftAssignment.shift_type == shift_type,
            ShiftAssignment.employee_id == employee_id,
        )
    )
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()
    
    if assignment:
        await db.delete(assignment)
        await db.flush()
        return True
    return False


async def get_weekly_sales(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession
) -> list[dict]:
    """Get aggregated sales stats for weekly chart."""
    # We want to group by date and shift_type, summing amount_lkr
    # First, get all shifts in range with their sales sums
    
    # Subquery to sum sales per shift
    sales_sub = (
        select(
            Sale.shift_id,
            func.sum(Sale.amount_lkr).label("total_sales")
        )
        .group_by(Sale.shift_id)
        .subquery()
    )
    
    # Join shifts with sales summary
    stmt = (
        select(
            Shift.shift_date,
            Shift.shift_type,
            func.coalesce(sales_sub.c.total_sales, 0).label("total_sales")
        )
        .outerjoin(sales_sub, Shift.id == sales_sub.c.shift_id)
        .where(
            and_(
                Shift.station_id == station_id,
                Shift.shift_date >= start_date,
                Shift.shift_date <= end_date
            )
        )
        .order_by(Shift.shift_date)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Process into daily format {day: "Mon", dayShift: 0, nightShift: 0}
    stats = {}
    
    for r in rows:
        shift_date = r.shift_date
        date_str = shift_date.strftime("%a") # Mon, Tue...
        
        if shift_date not in stats:
            stats[shift_date] = {"day": date_str, "dayShift": Decimal(0), "nightShift": Decimal(0)}
            
        if r.shift_type == ShiftType.day:
            stats[shift_date]["dayShift"] = r.total_sales
        else:
            stats[shift_date]["nightShift"] = r.total_sales
            
    return list(stats.values())


# ============================================================================
# Complete Shift (Transactional Save)
# ============================================================================

from app.modules.sales.models import CardSale, CreditSale
from app.modules.sales.schemas import ShiftCompletePayload, CardSaleCreate, CreditSaleCreate


async def complete_shift(
    shift_id: UUID,
    payload: ShiftCompletePayload,
    completed_by: UUID | None,
    db: AsyncSession
) -> dict:
    """
    Complete a shift by saving all sales data transactionally.
    
    This saves:
    - Sale entries (meter readings per nozzle)
    - Card sales (payments via card terminals)
    - Credit sales (company credit accounts)
    
    Returns summary of what was saved.
    """
    # Get the shift first
    shift = await get_shift(shift_id, db)
    if not shift:
        raise ValueError(f"Shift {shift_id} not found")
    
    if shift.status != ShiftStatus.open:
        raise ValueError(f"Shift is already {shift.status.value}")
    
    saved_sales = []
    saved_card_sales = []
    saved_credit_sales = []
    
    # 1. Save sale entries (nozzle meter readings)
    for entry in payload.sale_entries:
        # Override shift_id from path
        entry_data = SaleEntryCreate(
            shift_id=shift_id,
            nozzle_id=entry.nozzle_id,
            employee_id=entry.employee_id,
            start_meter_digital=entry.start_meter_digital,
            end_meter_digital=entry.end_meter_digital,
            start_meter_analog=entry.start_meter_analog,
            end_meter_analog=entry.end_meter_analog,
            price_per_liter=entry.price_per_liter,
            notes=entry.notes,
        )
        sale = await record_sale_entry(entry_data, db)
        saved_sales.append(sale)
    
    # 2. Save card sales
    for card_entry in payload.card_sales:
        card_sale = CardSale(
            id=uuid4(),
            shift_id=shift_id,
            sale_id=card_entry.sale_id,
            nozzle_id=card_entry.nozzle_id,
            terminal_id=card_entry.terminal_id,
            batch_number=card_entry.batch_number,
            settlement_datetime=card_entry.settlement_datetime,
            amount=card_entry.amount,
            notes=card_entry.notes,
        )
        db.add(card_sale)
        saved_card_sales.append(card_sale)
    
    # 3. Save credit sales
    for credit_entry in payload.credit_sales:
        credit_sale = CreditSale(
            id=uuid4(),
            shift_id=shift_id,
            sale_id=credit_entry.sale_id,
            nozzle_id=credit_entry.nozzle_id,
            account_id=credit_entry.account_id,
            po_number=credit_entry.po_number,
            vehicle_number=credit_entry.vehicle_number,
            liters=credit_entry.liters,
            amount=credit_entry.amount,
            notes=credit_entry.notes,
        )
        db.add(credit_sale)
        saved_credit_sales.append(credit_sale)
    
    # 4. Update shift with cash collected and notes
    # NOTE: cash_collected column needs to be added to shifts table via migration
    # if payload.cash_collected:
    #     shift.cash_collected = payload.cash_collected
    
    if payload.notes:
        shift.notes = (shift.notes or "") + f"\n{payload.notes}"
    
    # Flush all changes
    await db.flush()
    
    # Calculate totals
    total_fuel_sales = sum(s.amount_lkr for s in saved_sales)
    total_card_sales = sum(c.amount for c in saved_card_sales)
    total_credit_sales = sum(c.amount for c in saved_credit_sales)
    
    return {
        "shift_id": str(shift_id),
        "sales_count": len(saved_sales),
        "card_sales_count": len(saved_card_sales),
        "credit_sales_count": len(saved_credit_sales),
        "total_fuel_sales": float(total_fuel_sales),
        "total_card_sales": float(total_card_sales),
        "total_credit_sales": float(total_credit_sales),
        "cash_collected": float(payload.cash_collected) if payload.cash_collected else 0,
    }

