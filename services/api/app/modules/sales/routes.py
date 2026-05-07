"""
Sales module API routes.
Shift management and sales entry endpoints.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.sales import service
from app.modules.sales.schemas import (
    ShiftStart, ShiftEnd, ShiftRead, ShiftSummary,
    SaleEntryCreate, SaleRead, WeeklySalesStat,
    ShiftCompletePayload,
    TankSalesResponse,
    SalesHistoryResponse,
    ReconciliationStats,
    DailySalesSummary,
)
from app.modules.sales.models import ShiftType
from datetime import date as DateType


router = APIRouter()


# ============================================================================
# Shifts
# ============================================================================

@router.post("/shifts/start", response_model=ShiftRead, status_code=status.HTTP_201_CREATED)
async def start_shift(
    data: ShiftStart,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Start a new shift (day or night)."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    opened_by = UUID(current_user.user_id) if current_user.user_id else None
    
    try:
        shift = await service.start_shift(station_id, data, opened_by, db)
        return shift
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/shifts/end", response_model=ShiftRead)
async def end_shift(
    data: ShiftEnd,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """End/close the current shift."""
    closed_by = UUID(current_user.user_id) if current_user.user_id else None
    
    try:
        shift = await service.end_shift(data.shift_id, closed_by, data.notes, db)
        return shift
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/shifts/current", response_model=ShiftRead | None)
async def get_current_shift(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the current open shift."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    shift = await service.get_current_shift(station_id, db)
    return shift


@router.get("/shifts/latest", response_model=ShiftRead | None)
async def get_latest_shift(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the most recently closed shift for dashboard fallback."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    shift = await service.get_latest_closed_shift(station_id, db)
    return shift



@router.get("/tank-sales", response_model=TankSalesResponse)
async def get_tank_sales(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    tank_id: str = Query(..., description="Tank name/ID like 'LSD-1'"),
    sales_date: DateType = Query(..., description="Date for sales"),
):
    """
    Get aggregated nozzle sales for a tank on a specific date.
    Returns day and night shift totals for each nozzle connected to the tank.
    """
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    result = await service.get_tank_sales(tank_id, sales_date, station_id, db)
    return result

@router.get("/shifts/{shift_id}", response_model=ShiftSummary)
async def get_shift_summary(
    shift_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get shift with sales summary."""
    shift = await service.get_shift(shift_id, db)
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    
    sales = await service.get_shift_sales(shift_id, db)
    
    total_liters = sum(s.liters_sold for s in sales)
    total_amount = sum(s.amount_lkr for s in sales)
    
    return ShiftSummary(
        shift=ShiftRead.model_validate(shift),
        total_liters=total_liters,
        total_amount=total_amount,
        sales_count=len(sales),
    )


# ============================================================================
# Sales Entries
# ============================================================================

@router.post("/entry", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
async def record_sale_entry(
    data: SaleEntryCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Record meter readings for a nozzle.
    
    Auto-calculates:
    - liters_sold = end_meter - start_meter
    - amount = liters * price_per_liter
    """
    try:
        sale = await service.record_sale_entry(data, db)
        return sale
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/shifts/{shift_id}/sales", response_model=list[SaleRead])
async def get_shift_sales(
    shift_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all sales for a shift."""
    sales = await service.get_shift_sales(shift_id, db)
    return sales


@router.get("/nozzles/last-readings")
async def get_last_meter_readings(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get the last end meter reading for each nozzle.
    Returns a dict of nozzle_id -> last_end_meter value.
    Used to auto-populate start meter for new shifts.
    """
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    readings = await service.get_last_meter_readings(station_id, db)
    
    # Convert Decimal to float for JSON serialization
    return {k: float(v) for k, v in readings.items()}


from fastapi import BackgroundTasks

@router.post("/shifts/{shift_id}/complete")
async def complete_shift(
    shift_id: UUID,
    payload: ShiftCompletePayload,
    background_tasks: BackgroundTasks,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Complete a shift by saving all sales data transactionally.
    
    This endpoint accepts:
    - sale_entries: Nozzle meter readings
    - card_sales: Card payment entries
    - credit_sales: Company credit entries
    - cash_collected: Total cash collected
    - notes: Optional shift notes
    
    All data is saved in a single transaction.
    """
    completed_by = UUID(current_user.user_id) if current_user.user_id else None
    
    try:
        result = await service.complete_shift(shift_id, payload, completed_by, db, background_tasks)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))




@router.get("/chart/weekly", response_model=list[WeeklySalesStat])
async def get_weekly_sales_chart(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: DateType = Query(..., description="Start date"),
    end_date: DateType = Query(..., description="End date"),
):
    """Get weekly sales stats for chart."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    stats = await service.get_weekly_sales(station_id, start_date, end_date, db)
    return stats


@router.get("/daily-summary", response_model=DailySalesSummary)
async def get_daily_sales_summary(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    date: DateType = Query(..., description="Date for summary (YYYY-MM-DD)"),
):
    """Get sales summary for a specific date with day/night breakdown."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    summary = await service.get_daily_sales_summary(station_id, date, db)
    return summary


# ============================================================================
# Sales History
# ============================================================================

@router.get("/history", response_model=SalesHistoryResponse)
async def get_sales_history(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, ge=1, le=200, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    start_date: DateType | None = Query(None, description="Filter by start date"),
    end_date: DateType | None = Query(None, description="Filter by end date"),
    nozzle_id: UUID | None = Query(None, description="Filter by nozzle ID"),
    product_code: str | None = Query(None, description="Filter by product code"),
):
    """
    Get paginated sales history for the station.
    
    Returns sales records with shift date, nozzle details, product info,
    and card/credit sales breakdown.
    """
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    result = await service.get_sales_history(station_id, limit, offset, start_date, end_date, nozzle_id, product_code, db)
    return result


# ============================================================================
# Reconciliation
# ============================================================================

@router.get("/reconciliation", response_model=ReconciliationStats)
async def get_reconciliation_stats(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: DateType = Query(..., alias="date", description="Target date"),
    range_type: str = Query(..., alias="range", description="Range type (Today, 7 Days, Month, Year, All Time)"),
):
    """
    Get working capital reconciliation stats.
    Calculates Expected Sales vs Verified Funds (Cash+Card) and Variance.
    """
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    stats = await service.get_reconciliation_stats(station_id, target_date, range_type, db)
    return stats
