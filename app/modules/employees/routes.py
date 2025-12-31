"""
Employees module API routes.
CRUD for employees, bulk attendance, payroll calculation.
"""

from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.employees import service
from app.modules.employees.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeRead,
    BulkAttendanceCreate, AttendanceRead,
    PayrollResponse,
    AdvancePaymentCreate, AdvancePaymentRead,
)
from app.modules.admin.service import log_audit


router = APIRouter()


# ============================================================================
# Employee CRUD
# ============================================================================

@router.get("", response_model=list[EmployeeRead])
async def list_employees(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    active_only: bool = Query(True, description="Filter to active employees only"),
):
    """List all employees for the current user's station."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    employees = await service.list_employees(
        UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id,
        db,
        active_only=active_only,
    )
    return employees


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new employee. Requires owner or manager role."""
    if current_user.role not in ("owner", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can create employees",
        )
    
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    employee = await service.create_employee(station_id, data, db)
    
    # Audit log: employee creation
    await log_audit(
        db=db,
        actor_id=UUID(current_user.user_id),
        action="employee.create",
        station_id=station_id,
        entity_type="employee",
        entity_id=employee.id,
        details={"name": employee.full_name, "role": data.role.value, "daily_wage": str(data.daily_wage)},
    )
    
    return employee


@router.patch("/{employee_id}", response_model=EmployeeRead)
async def update_employee(
    employee_id: UUID,
    data: EmployeeUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update an employee. Requires owner or manager role."""
    if current_user.role not in ("owner", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can update employees",
        )
    
    employee = await service.get_employee(employee_id, db)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    
    # Track wage changes for audit log
    old_wage = employee.daily_wage
    old_role = employee.role.value if employee.role else None
    
    updated = await service.update_employee(employee, data, db)
    
    # Audit log: employee update (especially wage/role changes)
    changes = data.model_dump(exclude_unset=True)
    if changes:  # Only log if there are actual changes
        details = {"changes": {k: str(v) for k, v in changes.items()}}
        if "daily_wage" in changes:
            details["old_wage"] = str(old_wage)
            details["new_wage"] = str(changes["daily_wage"])
        if "role" in changes:
            details["old_role"] = old_role
            details["new_role"] = changes["role"].value if hasattr(changes["role"], "value") else str(changes["role"])
        
        await log_audit(
            db=db,
            actor_id=UUID(current_user.user_id),
            action="employee.update",
            station_id=updated.station_id,
            entity_type="employee",
            entity_id=employee_id,
            details=details,
        )
    
    return updated


@router.delete("/{employee_id}", response_model=EmployeeRead)
async def delete_employee(
    employee_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Deactivate an employee (soft delete). Requires owner or manager role."""
    if current_user.role not in ("owner", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can delete employees",
        )
    
    employee = await service.get_employee(employee_id, db)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    
    # Audit log: employee deletion (soft delete)
    await log_audit(
        db=db,
        actor_id=UUID(current_user.user_id),
        action="employee.delete",
        station_id=employee.station_id,
        entity_type="employee",
        entity_id=employee_id,
        details={"name": employee.full_name, "role": employee.role.value if employee.role else None},
    )
    
    deactivated = await service.deactivate_employee(employee, db)
    return deactivated


# ============================================================================
# Attendance
# ============================================================================

@router.post("/attendance", response_model=list[AttendanceRead], status_code=status.HTTP_201_CREATED)
async def bulk_mark_attendance(
    data: BulkAttendanceCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Bulk mark attendance for multiple employees on a date."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    attendance_records = await service.bulk_mark_attendance(data, db)
    return attendance_records


@router.get("/attendance", response_model=list[AttendanceRead])
async def get_daily_attendance(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    date: date = Query(..., description="Date to fetch attendance for"),
):
    """
    Get attendance records for a specific date.
    Returns list of employees present on that day.
    """
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    
    records = await service.get_attendance_for_period(
        station_id,
        date,
        date,
        db
    )
    return records


@router.get("/attendance/history")
async def get_monthly_attendance_history(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    year: int = Query(..., description="Year (e.g., 2025)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
):
    """
    Get monthly attendance history for all employees.
    Returns a 31-day grid per employee with status for each day.
    """
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    monthly_data = await service.get_monthly_attendance(station_id, year, month, db)
    return monthly_data


@router.get("/{employee_id}/shifts")
async def get_employee_shifts(
    employee_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, le=200, description="Max shifts to return"),
):
    """
    Get shift history for an employee.
    Returns attendance records with hours worked.
    """
    # Verify employee exists and belongs to user's station
    employee = await service.get_employee(employee_id, db)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    if employee.station_id != station_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    shifts = await service.get_employee_shifts(employee_id, db, limit)
    return shifts


# ============================================================================
# Payroll
# ============================================================================

@router.get("/payroll", response_model=PayrollResponse)
async def get_payroll(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: date = Query(..., description="Start date for payroll period"),
    end_date: date = Query(..., description="End date for payroll period"),
):
    """
    Calculate payroll for all employees in the station.
    
    Formula: (days_worked * daily_wage) + (overtime * bonus) - advances
    """
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    payroll = await service.calculate_payroll(station_id, start_date, end_date, db)
    return payroll


# ============================================================================
# Advance Payments
# ============================================================================

@router.post("/advances", response_model=AdvancePaymentRead, status_code=status.HTTP_201_CREATED)
async def create_advance_payment(
    data: AdvancePaymentCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Record an advance payment for an employee. Requires owner or manager role."""
    if current_user.role not in ("owner", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can give advances",
        )
    
    approved_by = UUID(current_user.user_id) if current_user.user_id else None
    advance = await service.create_advance_payment(data, approved_by, db)
    return advance


@router.get("/{employee_id}/advances", response_model=list[AdvancePaymentRead])
async def get_employee_advances(
    employee_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, le=200, description="Max advances to return"),
):
    """Get advance payments for an employee."""
    advances = await service.get_employee_advances(employee_id, db, limit=limit)
    return advances
