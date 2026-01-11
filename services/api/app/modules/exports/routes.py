"""
Exports module API routes.
CSV data export endpoints with rate limiting.
"""

from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.core.rate_limit import check_rate_limit
from app.modules.exports import service


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
# Sales Export
# ============================================================================

@router.get("/sales")
async def export_sales(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end: date = Query(..., description="End date (YYYY-MM-DD)"),
):
    """
    Export sales data as CSV.
    
    Rate limited to 10 exports per minute per user.
    """
    # Rate limit check (10 per minute)
    check_rate_limit(
        user_id=str(current_user.user_id),
        max_requests=10,
        window_seconds=60,
    )
    
    station_id = get_station_uuid(current_user)
    
    if start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before or equal to end date",
        )
    
    csv_content = await service.generate_sales_csv(station_id, start, end, db)
    
    filename = f"sales_{start.isoformat()}_to_{end.isoformat()}.csv"
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ============================================================================
# Attendance Export
# ============================================================================

@router.get("/attendance")
async def export_attendance(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    month: str = Query(..., description="Month in YYYY-MM format"),
):
    """
    Export attendance data as CSV for a specific month.
    
    Rate limited to 10 exports per minute per user.
    """
    # Rate limit check (10 per minute)
    check_rate_limit(
        user_id=str(current_user.user_id),
        max_requests=10,
        window_seconds=60,
    )
    
    station_id = get_station_uuid(current_user)
    
    # Parse month parameter
    try:
        year, month_num = map(int, month.split("-"))
        if not (1 <= month_num <= 12):
            raise ValueError("Month must be between 1 and 12")
    except (ValueError, AttributeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid month format. Use YYYY-MM (e.g., 2024-12). Error: {e}",
        )
    
    csv_content = await service.generate_attendance_csv(station_id, year, month_num, db)
    
    filename = f"attendance_{month}.csv"
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ============================================================================
# Employees Export
# ============================================================================

@router.get("/employees")
async def export_employees(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    include_inactive: bool = Query(False, description="Include inactive employees"),
):
    """
    Export employees list as CSV.
    
    Rate limited to 10 exports per minute per user.
    """
    # Rate limit check (10 per minute)
    check_rate_limit(
        user_id=str(current_user.user_id),
        max_requests=10,
        window_seconds=60,
    )
    
    station_id = get_station_uuid(current_user)
    
    csv_content = await service.generate_employees_csv(station_id, db, include_inactive)
    
    today = date.today().isoformat()
    filename = f"employees_{today}.csv"
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ============================================================================
# Settlement & Reconciliation Exports
# ============================================================================

@router.get("/settlements/card")
async def export_card_settlements(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end: date = Query(..., description="End date (YYYY-MM-DD)"),
):
    """Export card settlements as CSV."""
    check_rate_limit(
        user_id=str(current_user.user_id),
        max_requests=10,
        window_seconds=60,
    )
    station_id = get_station_uuid(current_user)
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")
    
    csv_content = await service.generate_card_settlements_csv(station_id, start, end, db)
    filename = f"card_settlements_{start.isoformat()}_to_{end.isoformat()}.csv"
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/settlements/deposits")
async def export_deposits(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end: date = Query(..., description="End date (YYYY-MM-DD)"),
):
    """Export cash deposits (shift settlements) as CSV."""
    check_rate_limit(
        user_id=str(current_user.user_id),
        max_requests=10,
        window_seconds=60,
    )
    station_id = get_station_uuid(current_user)
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")
    
    csv_content = await service.generate_deposits_csv(station_id, start, end, db)
    filename = f"deposits_{start.isoformat()}_to_{end.isoformat()}.csv"
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/expenses")
async def export_expenses(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end: date = Query(..., description="End date (YYYY-MM-DD)"),
):
    """Export expenses as CSV."""
    check_rate_limit(
        user_id=str(current_user.user_id),
        max_requests=10,
        window_seconds=60,
    )
    station_id = get_station_uuid(current_user)
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")
    
    csv_content = await service.generate_expenses_csv(station_id, start, end, db)
    filename = f"expenses_{start.isoformat()}_to_{end.isoformat()}.csv"
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/reconciliation")
async def export_reconciliation(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end: date = Query(..., description="End date (YYYY-MM-DD)"),
):
    """Export reconciliation report as CSV."""
    check_rate_limit(
        user_id=str(current_user.user_id),
        max_requests=10,
        window_seconds=60,
    )
    station_id = get_station_uuid(current_user)
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")
    
    csv_content = await service.generate_reconciliation_csv(station_id, start, end, db)
    filename = f"reconciliation_{start.isoformat()}_to_{end.isoformat()}.csv"
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
