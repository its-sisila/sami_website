"""
Sales module business logic.
Shift management and sales entry recording.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select, func, and_, delete, case
from sqlalchemy.sql.functions import coalesce
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.sales.models import Shift, Sale, ShiftType, ShiftStatus
from app.modules.sales.schemas import ShiftStart, ShiftRead, SaleEntryCreate, SaleRead
from app.modules.settlements.models import CardSettlement, ShiftSettlement, SettlementStatus


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
    shift_date = data.shift_date or date.today()
    
    # Check if shift already exists for this station+type+date
    stmt = select(Shift).where(
        and_(
            Shift.station_id == station_id,
            Shift.shift_type == data.shift_type,
            Shift.shift_date == shift_date,
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
        shift_date=shift_date,
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


async def get_latest_closed_shift(station_id: UUID, db: AsyncSession) -> Shift | None:
    """Get the most recently closed shift for a station."""
    stmt = (
        select(Shift)
        .where(Shift.station_id == station_id)
        .where(Shift.status == ShiftStatus.closed)
        .order_by(Shift.closed_at.desc())
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
    
    # Handle nested Card Sales
    if data.card_entries is not None:
        
        # If updating, delete existing card sales linked to this sale
        if existing:
             await db.execute(
                delete(CardSale).where(CardSale.sale_id == sale.id)
            )
            
        for card in data.card_entries:
            db.add(CardSale(
                id=uuid4(),
                sale_id=sale.id,
                nozzle_id=data.nozzle_id,
                terminal_id=card.terminal_id,
                batch_number=card.batch_number,
                invoice_number=card.invoice_number,
                invoice_datetime=card.invoice_datetime,
                amount=card.amount
            ))

    # Handle nested Credit Sales
    if data.credit_entries is not None:
        
        # If updating, delete existing credit sales linked to this sale
        if existing:
             await db.execute(
                delete(CreditSale).where(CreditSale.sale_id == sale.id)
            )
            
        for credit in data.credit_entries:
            db.add(CreditSale(
                id=uuid4(),
                sale_id=sale.id,
                nozzle_id=data.nozzle_id,
                account_id=credit.account_id,
                po_number=credit.po_number,
                vehicle_number=credit.vehicle_number,
                liters=credit.liters,
                amount=credit.amount,
                notes=credit.notes
            ))

    await db.commit()
    
    # Re-fetch with eager-loaded relationships to avoid lazy loading during serialization
    stmt = (
        select(Sale)
        .where(Sale.id == sale.id)
        .options(selectinload(Sale.card_sales), selectinload(Sale.credit_sales))
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_shift_sales(shift_id: UUID, db: AsyncSession) -> list[Sale]:
    """Get all sales for a shift."""
    stmt = (
        select(Sale)
        .where(Sale.shift_id == shift_id)
        .options(selectinload(Sale.card_sales), selectinload(Sale.credit_sales))
        .order_by(Sale.created_at)
    )
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
    nozzle_subq = select(Nozzle.nozzle_id).where(Nozzle.pump_id.in_(pump_subq))
    
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





async def get_weekly_sales(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession
) -> list[dict]:
    """
    Get aggregated sales stats for weekly chart (Financial Trends + Sales Split).
    Returns Sales Amount (Day vs Night) and Verified Funds per day.
    """
    # 1. Sales per shift
    sales_sub = (
        select(
            Sale.shift_id,
            func.sum(Sale.amount_lkr).label("total_sales")
        )
        .group_by(Sale.shift_id)
        .subquery()
    )
    
    # 2. Verified Cash per shift
    cash_sub = (
        select(
            ShiftSettlement.shift_id,
            func.sum(ShiftSettlement.amount).label("verified_cash")
        )
        .where(ShiftSettlement.status == SettlementStatus.verified)
        .group_by(ShiftSettlement.shift_id)
        .subquery()
    )
    
    # 3. Verified Card per shift
    card_sub = (
        select(
            CardSettlement.shift_id,
            func.sum(CardSettlement.amount).label("verified_card")
        )
        .where(CardSettlement.status == SettlementStatus.verified)
        .group_by(CardSettlement.shift_id)
        .subquery()
    )
    
    # Main query: Group by Shift Date
    # We need to sum sales for day vs night shifts separately
    # Using case statements inside sum
    
    # CASE statement for day sales: SUM(CASE WHEN shift_type = 'day' THEN total_sales ELSE 0 END)
    # But we are joining on shift_id.
    # We can group by shift_date.
    
    stmt = (
        select(
            Shift.shift_date,
            # Total Sales
            func.sum(func.coalesce(sales_sub.c.total_sales, 0)).label("total_sales"),
            
            # Verified Funds (Cash + Card)
            func.sum(
                func.coalesce(cash_sub.c.verified_cash, 0) + 
                func.coalesce(card_sub.c.verified_card, 0)
            ).label("verified_funds"),
            
            # Day Shift Sales
            func.sum(
                 case(
                     (Shift.shift_type == ShiftType.day, func.coalesce(sales_sub.c.total_sales, 0)),
                     else_=0
                 )
            ).label("day_sales"),

            # Night Shift Sales
             func.sum(
                 case(
                     (Shift.shift_type == ShiftType.night, func.coalesce(sales_sub.c.total_sales, 0)),
                     else_=0
                 )
            ).label("night_sales")
        )
        .outerjoin(sales_sub, Shift.id == sales_sub.c.shift_id)
        .outerjoin(cash_sub, Shift.id == cash_sub.c.shift_id)
        .outerjoin(card_sub, Shift.id == card_sub.c.shift_id)
        .where(
            and_(
                Shift.station_id == station_id,
                Shift.shift_date >= start_date,
                Shift.shift_date <= end_date
            )
        )
        .group_by(Shift.shift_date)
        .order_by(Shift.shift_date)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Build list for chart
    stats = []
    from datetime import timedelta
    
    # Helper to map result date to row
    row_map = {r.shift_date: r for r in rows}
    
    # Fill gaps with zero if needed, or just return existing rows
    # Frontend expects contiguous dates usually, but AreaChart handles gaps by interpolation or missing points.
    # Let's verify if we need to fill gaps. 
    # For now, let's just return what we have, iterating through range could be safer but maybe not needed if DB has data.
    # Actually, if there are no shifts on a day, it won't be returned.
    
    # Iterate from start to end date to ensure all days are present (better for charts)
    current = start_date
    while current <= end_date:
        r = row_map.get(current)
        day_sales = r.day_sales if r else 0
        night_sales = r.night_sales if r else 0
        total_sales = r.total_sales if r else 0
        verified_funds = r.verified_funds if r else 0
        
        stats.append({
            "day": current.strftime("%a"), # e.g. "Mon" (for X-axis short name request)
            "date": current,
            "name": current.strftime("%b %d"), # e.g. "Oct 24"
            "totalSalesAmount": total_sales,
            "verifiedFunds": verified_funds,
            "dayShift": day_sales,
            "nightShift": night_sales
        })
        current += timedelta(days=1)
            
    return stats


async def get_daily_sales_summary(
    station_id: UUID,
    target_date: date,
    db: AsyncSession
) -> dict:
    """
    Get aggregated sales for a specific date.
    Returns totals for day shift, night shift, and combined.
    """
    # Get all shifts for this date at this station
    shifts_query = await db.execute(
        select(Shift).where(
            and_(
                Shift.station_id == station_id,
                Shift.shift_date == target_date
            )
        )
    )
    shifts = shifts_query.scalars().all()
    
    # Initialize result structure
    result = {
        "date": target_date,
        "day_shift_sales": Decimal("0"),
        "day_shift_liters": Decimal("0"),
        "day_shift_count": 0,
        "night_shift_sales": Decimal("0"),
        "night_shift_liters": Decimal("0"),
        "night_shift_count": 0,
        "total_sales": Decimal("0"),
        "total_liters": Decimal("0"),
        "total_count": 0,
    }
    
    if not shifts:
        return result
    
    # Separate shift IDs by type
    day_shift_ids = [s.id for s in shifts if s.shift_type == ShiftType.day]
    night_shift_ids = [s.id for s in shifts if s.shift_type == ShiftType.night]
    
    # Query day shift totals
    if day_shift_ids:
        day_query = await db.execute(
            select(
                func.coalesce(func.sum(Sale.amount_lkr), 0),
                func.coalesce(func.sum(Sale.liters_sold), 0),
                func.count(Sale.id)
            ).where(Sale.shift_id.in_(day_shift_ids))
        )
        day_result = day_query.one()
        result["day_shift_sales"] = Decimal(str(day_result[0]))
        result["day_shift_liters"] = Decimal(str(day_result[1]))
        result["day_shift_count"] = day_result[2]
    
    # Query night shift totals
    if night_shift_ids:
        night_query = await db.execute(
            select(
                func.coalesce(func.sum(Sale.amount_lkr), 0),
                func.coalesce(func.sum(Sale.liters_sold), 0),
                func.count(Sale.id)
            ).where(Sale.shift_id.in_(night_shift_ids))
        )
        night_result = night_query.one()
        result["night_shift_sales"] = Decimal(str(night_result[0]))
        result["night_shift_liters"] = Decimal(str(night_result[1]))
        result["night_shift_count"] = night_result[2]
    
    # Calculate totals
    result["total_sales"] = result["day_shift_sales"] + result["night_shift_sales"]
    result["total_liters"] = result["day_shift_liters"] + result["night_shift_liters"]
    result["total_count"] = result["day_shift_count"] + result["night_shift_count"]
    
    return result


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


async def get_tank_sales(
    tank_id: str,
    sales_date: date,
    station_id: UUID,
    db: AsyncSession
) -> dict:
    """
    Get aggregated nozzle sales for a tank on a specific date.
    Separates day and night shift totals.
    
    Uses nozzle_id prefix matching instead of database relationships,
    since nozzle IDs like 'LSD-1' correspond to tank 'LSD-1'.
    """
    # Get all shifts for this date at this station
    
    shifts_query = await db.execute(
        select(Shift).filter(
            Shift.station_id == station_id,
            Shift.shift_date == sales_date
        )
    )
    shifts = shifts_query.scalars().all()
    
    if not shifts:
        return {
            "tank_id": tank_id,
            "tank_name": tank_id,
            "date": sales_date,
            "nozzles": [],
            "total_liters": Decimal("0")
        }
    
    day_shift_ids = [s.id for s in shifts if s.shift_type == ShiftType.day]
    night_shift_ids = [s.id for s in shifts if s.shift_type == ShiftType.night]
    all_shift_ids = [s.id for s in shifts]
    
    # Extract the base tank prefix (e.g., "LSD" from "LSD-1", "LAD" from "LAD-1")
    # The tank_id passed from frontend is like "LSD-1", "LAD-1", etc.
    tank_prefix = tank_id.rsplit("-", 1)[0] if "-" in tank_id else tank_id
    
    # Query all sales for this date that have a nozzle_id matching the tank
    # Handle both patterns: "LP95-1" (direct) and "N-LP95-1" (N-prefixed)
    # Using contains() to match nozzle IDs like "N-LP95-1" that contain "LP95"
    sales_query = await db.execute(
        select(Sale).filter(
            Sale.shift_id.in_(all_shift_ids),
            Sale.nozzle_id.contains(tank_prefix)
        )
    )
    all_sales = sales_query.scalars().all()
    
    # Group sales by nozzle_id
    nozzle_data: dict[str, dict] = {}
    for sale in all_sales:
        nozzle_id = sale.nozzle_id
        if nozzle_id not in nozzle_data:
            nozzle_data[nozzle_id] = {"day": Decimal("0"), "night": Decimal("0")}
        
        # Check if this sale is from a day or night shift
        if sale.shift_id in day_shift_ids:
            nozzle_data[nozzle_id]["day"] += sale.liters_sold or Decimal("0")
        elif sale.shift_id in night_shift_ids:
            nozzle_data[nozzle_id]["night"] += sale.liters_sold or Decimal("0")
    
    # Build response
    nozzle_sales = []
    total_liters = Decimal("0")
    
    for nozzle_id, data in nozzle_data.items():
        nozzle_total = data["day"] + data["night"]
        total_liters += nozzle_total
        nozzle_sales.append({
            "nozzle_id": nozzle_id,
            "nozzle_name": nozzle_id,
            "day_liters": data["day"],
            "night_liters": data["night"]
        })
    
    return {
        "tank_id": tank_id,
        "tank_name": tank_id,
        "date": sales_date,
        "nozzles": nozzle_sales,
        "total_liters": total_liters
    }


# ============================================================================
# Sales History
# ============================================================================

async def get_sales_history(
    station_id: UUID,
    limit: int,
    offset: int,
    start_date: date | None,
    end_date: date | None,
    nozzle_id: UUID | None,
    product_code: str | None,
    db: AsyncSession
) -> dict:
    """
    Get paginated sales history for a station.
    
    Returns sales records with shift and nozzle details.
    """
    from app.modules.inventory.models import Nozzle, FuelProduct
    from app.modules.employees.models import Employee
    
    # Build base query with joins
    base_query = (
        select(
            Sale.id,
            Sale.nozzle_id,
            Sale.employee_id,
            Sale.liters_sold,
            Sale.price_per_liter,
            Sale.amount_lkr,
            Sale.created_at,
            Shift.shift_date,
            Shift.shift_type,
            Nozzle.nozzle_name,
            FuelProduct.name.label("product_name"),
            FuelProduct.code.label("product_code"),
            Employee.full_name.label("employee_name"),
        )
        .select_from(Sale)
        .join(Shift, Sale.shift_id == Shift.id)
        .outerjoin(Nozzle, Sale.nozzle_id == Nozzle.id)
        .outerjoin(FuelProduct, Nozzle.product_id == FuelProduct.id)
        .outerjoin(Employee, Sale.employee_id == Employee.id)
        .where(Shift.station_id == station_id)
    )
    
    # Apply date filters if provided
    if start_date:
        base_query = base_query.where(Shift.shift_date >= start_date)
    if end_date:
        base_query = base_query.where(Shift.shift_date <= end_date)
    
    # Apply nozzle filter if provided
    if nozzle_id:
        base_query = base_query.where(Sale.nozzle_id == nozzle_id)
    
    # Apply product filter if provided
    if product_code:
        base_query = base_query.where(FuelProduct.code == product_code)
    
    # Count total matching records
    count_query = select(func.count()).select_from(
        base_query.subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get paginated results
    data_query = (
        base_query
        .order_by(Shift.shift_date.desc(), Sale.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(data_query)
    rows = result.all()
    
    # Get card and credit sales totals per sale
    sale_ids = [row[0] for row in rows]  # Sale.id
    
    # Query card sales totals
    card_totals: dict[UUID, Decimal] = {}
    credit_totals: dict[UUID, Decimal] = {}
    
    if sale_ids:
        card_stmt = (
            select(CardSale.sale_id, func.coalesce(func.sum(CardSale.amount), 0))
            .where(CardSale.sale_id.in_(sale_ids))
            .group_by(CardSale.sale_id)
        )
        card_result = await db.execute(card_stmt)
        for sale_id, total_amount in card_result.all():
            if sale_id:
                card_totals[sale_id] = Decimal(str(total_amount))
        
        credit_stmt = (
            select(CreditSale.sale_id, func.coalesce(func.sum(CreditSale.amount), 0))
            .where(CreditSale.sale_id.in_(sale_ids))
            .group_by(CreditSale.sale_id)
        )
        credit_result = await db.execute(credit_stmt)
        for sale_id, total_amount in credit_result.all():
            if sale_id:
                credit_totals[sale_id] = Decimal(str(total_amount))
    
    # Build response items
    items = []
    for row in rows:
        sale_id = row[0]
        card_sale_total = card_totals.get(sale_id, Decimal("0"))
        credit_sale_total = credit_totals.get(sale_id, Decimal("0"))
        amount_lkr = Decimal(str(row[5])) if row[5] else Decimal("0")
        cash_sales = amount_lkr - card_sale_total - credit_sale_total
        
        items.append({
            "id": sale_id,
            "nozzle_id": row[1],
            "employee_id": row[2],
            "liters_sold": row[3],
            "price_per_liter": row[4],
            "amount_lkr": row[5],
            "created_at": row[6],
            "shift_date": row[7],
            "shift_type": row[8],
            "nozzle_name": row[9],
            "product_name": row[10],
            "product_code": row[11],
            "employee_name": row[12],
            "card_sales_total": card_sale_total,
            "credit_sales_total": credit_sale_total,
            "cash_sales": cash_sales,
        })
    
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ============================================================================
# Working Capital Reconciliation
# ============================================================================

from datetime import timedelta
from app.modules.settlements.models import CardSettlement, ShiftSettlement, SettlementStatus

async def get_reconciliation_stats(
    station_id: UUID,
    target_date: date,
    range_type: str,
    db: AsyncSession
) -> dict:
    """
    Get reconciliation stats (Expected vs Verified vs Variance).
    Aggregates data based on the selected time range.
    """
    
    # 1. Determine Date Range
    start_date = target_date
    end_date = target_date
    
    if range_type == "7 Days":
        start_date = target_date - timedelta(days=6)
    elif range_type == "Month":
        start_date = date(target_date.year, target_date.month, 1)
        # End date is last day of month? Or just up to target_date?
        # Usually "This Month" means 1st to Today.
    elif range_type == "Year":
        start_date = date(target_date.year, 1, 1)
    elif range_type == "All Time":
        start_date = date(2000, 1, 1) # Arbitrary past date
    # "Today" and "Specific Date" use start=end=target_date
    
    # 2. Helper to get aggregates
    async def get_aggregates(shift_type_filter=None):
        # Expected Sales (Sum of Sale.amount_lkr) via Shift
        sales_query = (
            select(func.sum(Sale.amount_lkr))
            .join(Shift, Sale.shift_id == Shift.id)
            .where(
                and_(
                    Shift.station_id == station_id,
                    Shift.shift_date >= start_date,
                    Shift.shift_date <= end_date
                )
            )
        )
        
        # Verified Cash (ShiftSettlement) via Shift
        cash_query = (
            select(func.sum(ShiftSettlement.amount))
            .join(Shift, ShiftSettlement.shift_id == Shift.id)
            .where(
                and_(
                    Shift.station_id == station_id,
                    Shift.shift_date >= start_date,
                    Shift.shift_date <= end_date,
                    ShiftSettlement.status == SettlementStatus.verified
                )
            )
        )
        
        # Verified Card (CardSettlement) via Shift
        card_query = (
            select(func.sum(CardSettlement.amount))
            .join(Shift, CardSettlement.shift_id == Shift.id)
            .where(
                and_(
                    Shift.station_id == station_id,
                    Shift.shift_date >= start_date,
                    Shift.shift_date <= end_date,
                    CardSettlement.status == SettlementStatus.verified
                )
            )
        )
        
        if shift_type_filter:
            sales_query = sales_query.where(Shift.shift_type == shift_type_filter)
            cash_query = cash_query.where(Shift.shift_type == shift_type_filter)
            card_query = card_query.where(Shift.shift_type == shift_type_filter)
            
        expected_sales = (await db.execute(sales_query)).scalar() or Decimal(0)
        verified_cash = (await db.execute(cash_query)).scalar() or Decimal(0)
        verified_card = (await db.execute(card_query)).scalar() or Decimal(0)
        
        verified_funds = verified_cash + verified_card
        variance = verified_funds - expected_sales
        
        return {
            "expected_sales": expected_sales,
            "verified_funds": verified_funds,
            "variance": variance
        }

    # 3. Get stats for Day, Night, and Total
    day_stats = await get_aggregates(ShiftType.day)
    night_stats = await get_aggregates(ShiftType.night)
    
    # Total could be day+night, but querying without filter ensures we catch anything weird
    # (though day+night sum is cleaner). Let's sum them to ensure consistency.
    total_stats = {
        "expected_sales": day_stats["expected_sales"] + night_stats["expected_sales"],
        "verified_funds": day_stats["verified_funds"] + night_stats["verified_funds"],
        "variance": day_stats["variance"] + night_stats["variance"]
    }
    
    return {
        "day_shift": day_stats,
        "night_shift": night_stats,
        "total": total_stats
    }
