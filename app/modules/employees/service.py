"""
Employees module business logic.
CRUD operations, attendance marking, and payroll calculation.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.employees.models import Employee, Attendance, AdvancePayment, AttendanceStatus, PayrollPayment
from app.modules.employees.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeRead,
    BulkAttendanceCreate, AttendanceRead,
    PayrollEntry, PayrollResponse, PayrollPaymentCreate,
)


# ============================================================================
# Employee CRUD
# ============================================================================

async def list_employees(
    station_id: UUID,
    db: AsyncSession,
    active_only: bool = True
) -> list[Employee]:
    """List all employees for a station."""
    stmt = select(Employee).where(Employee.station_id == station_id)
    if active_only:
        stmt = stmt.where(Employee.is_active == True)
    stmt = stmt.order_by(Employee.full_name)
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_employee(employee_id: UUID, db: AsyncSession) -> Employee | None:
    """Get a single employee by ID."""
    stmt = select(Employee).where(Employee.id == employee_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_employee(
    station_id: UUID,
    data: EmployeeCreate,
    db: AsyncSession
) -> Employee:
    """Create a new employee."""
    employee = Employee(
        id=uuid4(),
        station_id=station_id,
        full_name=data.full_name,
        name_with_initials=data.name_with_initials,
        nic=data.nic,
        address=data.address,
        phone=data.phone,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        role=data.role,
        joined_date=data.joined_date or date.today(),
        daily_wage=data.daily_wage,
        overtime_bonus=data.overtime_bonus,
    )
    db.add(employee)
    await db.flush()
    return employee


async def update_employee(
    employee: Employee,
    data: EmployeeUpdate,
    db: AsyncSession
) -> Employee:
    """Update an employee."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    await db.flush()
    return employee


async def deactivate_employee(employee: Employee, db: AsyncSession) -> Employee:
    """Deactivate (soft-delete) an employee."""
    employee.is_active = False
    await db.flush()
    return employee


# ============================================================================
# Attendance
# ============================================================================

async def bulk_mark_attendance(
    data: BulkAttendanceCreate,
    db: AsyncSession
) -> list[Attendance]:
    """Bulk create/update attendance records for a date."""
    created = []
    
    for entry in data.entries:
        # Check if attendance already exists for this employee+date
        stmt = select(Attendance).where(
            and_(
                Attendance.employee_id == entry.employee_id,
                Attendance.attendance_date == data.attendance_date
            )
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update existing
            existing.status = entry.status
            if entry.time_in:
                existing.time_in = entry.time_in
            if entry.time_out:
                existing.time_out = entry.time_out
            if entry.notes:
                existing.notes = entry.notes
            existing.shift_id = data.shift_id
            created.append(existing)
        else:
            # Create new
            attendance = Attendance(
                id=uuid4(),
                employee_id=entry.employee_id,
                shift_id=data.shift_id,
                attendance_date=data.attendance_date,
                status=entry.status,
                time_in=entry.time_in,
                time_out=entry.time_out,
                notes=entry.notes,
            )
            db.add(attendance)
            created.append(attendance)
    
    await db.flush()
    return created


async def get_attendance_for_period(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession
) -> list[Attendance]:
    """Get attendance records for a station within a period."""
    stmt = (
        select(Attendance)
        .join(Employee)
        .where(
            and_(
                Employee.station_id == station_id,
                Attendance.attendance_date >= start_date,
                Attendance.attendance_date <= end_date,
            )
        )
        .order_by(Attendance.attendance_date, Employee.full_name)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_employee_shifts(
    employee_id: UUID,
    db: AsyncSession,
    limit: int = 50
) -> list[dict]:
    """
    Get shift history for an employee.
    Returns attendance records with calculated hours worked.
    """
    stmt = (
        select(Attendance)
        .where(Attendance.employee_id == employee_id)
        .order_by(Attendance.attendance_date.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    shifts = []
    for record in records:
        # Calculate hours worked if time_in and time_out exist
        hours_worked = None
        if record.time_in and record.time_out:
            from datetime import datetime as dt, timedelta
            # Combine with a dummy date for calculation
            t_in = dt.combine(date.today(), record.time_in)
            t_out = dt.combine(date.today(), record.time_out)
            # Handle overnight shifts
            if t_out < t_in:
                t_out += timedelta(days=1)
            diff = t_out - t_in
            hours_worked = round(diff.total_seconds() / 3600, 1)
        
        # Determine shift type from time_in
        shift_type = None
        if record.time_in:
            if record.time_in.hour < 12:
                shift_type = "day"
            else:
                shift_type = "night"
        
        shifts.append({
            "id": record.id,
            "attendance_date": record.attendance_date,
            "shift_type": shift_type,
            "status": record.status,
            "time_in": record.time_in,
            "time_out": record.time_out,
            "hours_worked": hours_worked,
        })
    
    return shifts



async def get_monthly_attendance(
    station_id: UUID,
    year: int,
    month: int,
    db: AsyncSession
) -> list[dict]:
    """
    Get monthly attendance grid for all employees.
    Returns attendance status for each day (1-31) per employee.
    """
    from calendar import monthrange
    from app.modules.employees.schemas import DayAttendance, MonthlyAttendanceRead
    
    # Get all active employees for the station
    employees = await list_employees(station_id, db, active_only=True)
    
    # Calculate date range for the month
    _, last_day = monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)
    
    # Fetch all attendance records for the month
    stmt = (
        select(Attendance)
        .join(Employee)
        .where(
            and_(
                Employee.station_id == station_id,
                Attendance.attendance_date >= start_date,
                Attendance.attendance_date <= end_date,
            )
        )
    )
    result = await db.execute(stmt)
    attendance_records = list(result.scalars().all())
    
    # Create a lookup: employee_id -> {day: record}
    attendance_lookup: dict[UUID, dict[int, Attendance]] = {}
    for record in attendance_records:
        if record.employee_id not in attendance_lookup:
            attendance_lookup[record.employee_id] = {}
        attendance_lookup[record.employee_id][record.attendance_date.day] = record
    
    # Build response for each employee
    monthly_data = []
    for emp in employees:
        emp_attendance = attendance_lookup.get(emp.id, {})
        
        # Create 31-day grid (some days may not exist in the month)
        days = []
        for day in range(1, 32):
            if day <= last_day:
                record = emp_attendance.get(day)
                if record:
                    days.append(DayAttendance(
                        day=day,
                        status=record.status,
                        time_in=record.time_in,
                        time_out=record.time_out,
                    ))
                else:
                    days.append(DayAttendance(day=day, status=None))
            else:
                # Day doesn't exist in this month
                days.append(DayAttendance(day=day, status=None))
        
        monthly_data.append(MonthlyAttendanceRead(
            employee_id=emp.id,
            employee_name=emp.name_with_initials or emp.full_name,
            attendance=days,
        ))
    
    return monthly_data


# ============================================================================
# Payroll
# ============================================================================

async def calculate_payroll(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession
) -> PayrollResponse:
    """
    Calculate payroll for all employees in a station for a period.
    Formula: (days_worked * daily_wage) + (overtime_days * overtime_bonus) - advances
    """
    # Get active employees
    employees = await list_employees(station_id, db, active_only=True)
    
    payroll_entries = []
    total_gross = Decimal("0")
    total_advances = Decimal("0")
    total_net = Decimal("0")
    
    for emp in employees:
        # Count attendance by status
        stmt = select(
            Attendance.status,
            func.count(Attendance.id).label("count")
        ).where(
            and_(
                Attendance.employee_id == emp.id,
                Attendance.attendance_date >= start_date,
                Attendance.attendance_date <= end_date,
            )
        ).group_by(Attendance.status)
        
        result = await db.execute(stmt)
        status_counts = {row.status: row.count for row in result}
        
        days_present = status_counts.get(AttendanceStatus.present, 0)
        days_half = status_counts.get(AttendanceStatus.half_day, 0)
        days_overtime = status_counts.get(AttendanceStatus.overtime, 0)
        
        # Calculate total days worked
        # Present = 1 day, Half-day = 0.5 day, Overtime = 1 day
        total_days = Decimal(days_present) + Decimal(days_half) * Decimal("0.5") + Decimal(days_overtime)
        
        # Calculate gross wage
        gross = total_days * emp.daily_wage + Decimal(days_overtime) * emp.overtime_bonus
        
        # Sum advances for period
        advance_stmt = select(func.coalesce(func.sum(AdvancePayment.amount), 0)).where(
            and_(
                AdvancePayment.employee_id == emp.id,
                AdvancePayment.payment_date >= start_date,
                AdvancePayment.payment_date <= end_date,
            )
        )
        advance_result = await db.execute(advance_stmt)
        advances = Decimal(str(advance_result.scalar_one()))
        
        net = gross - advances
        
        # Check if payment already recorded for this period
        payment_stmt = select(PayrollPayment).where(
            and_(
                PayrollPayment.employee_id == emp.id,
                PayrollPayment.period_start == start_date,
                PayrollPayment.period_end == end_date,
            )
        )
        payment_result = await db.execute(payment_stmt)
        payment = payment_result.scalar_one_or_none()
        
        payroll_entries.append(PayrollEntry(
            employee_id=emp.id,
            employee_name=emp.full_name,
            role=emp.role,
            daily_wage=emp.daily_wage,
            days_present=days_present,
            days_half=days_half,
            days_overtime=days_overtime,
            total_days_worked=total_days,
            gross_wage=gross,
            total_advances=advances,
            net_payable=net,
            is_paid=payment is not None,
            paid_at=payment.paid_at if payment else None,
        ))
        
        total_gross += gross
        total_advances += advances
        total_net += net
    
    return PayrollResponse(
        start_date=start_date,
        end_date=end_date,
        employees=payroll_entries,
        total_gross=total_gross,
        total_advances=total_advances,
        total_net=total_net,
    )


# ============================================================================
# Advance Payments
# ============================================================================

async def create_advance_payment(
    data,  # AdvancePaymentCreate
    approved_by: UUID | None,
    db: AsyncSession
) -> AdvancePayment:
    """Record an advance payment for an employee."""
    advance = AdvancePayment(
        id=uuid4(),
        employee_id=data.employee_id,
        amount=data.amount,
        payment_date=data.date or date.today(),
        payment_time=data.time,
        reason=data.reason,
        notes=data.notes,
        approved_by=approved_by,
    )
    db.add(advance)
    await db.flush()
    return advance


async def get_employee_advances(
    employee_id: UUID,
    db: AsyncSession,
    limit: int = 50
) -> list[AdvancePayment]:
    """Get advance payments for an employee."""
    stmt = (
        select(AdvancePayment)
        .where(AdvancePayment.employee_id == employee_id)
        .order_by(AdvancePayment.payment_date.desc(), AdvancePayment.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ============================================================================
# Payroll Payments
# ============================================================================

async def record_payroll_payment(
    data: PayrollPaymentCreate,
    paid_by: UUID | None,
    db: AsyncSession
) -> PayrollPayment:
    """Record a payroll payment for an employee."""
    # Check if already paid for this period
    stmt = select(PayrollPayment).where(
        and_(
            PayrollPayment.employee_id == data.employee_id,
            PayrollPayment.period_start == data.period_start,
            PayrollPayment.period_end == data.period_end,
        )
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        raise ValueError("Payment already recorded for this employee and period")
    
    # Include paid_by name in notes if provided
    notes_text = data.notes or ""
    if data.paid_by:
        notes_text = f"Paid by: {data.paid_by}\n{notes_text}".strip()
    
    payment = PayrollPayment(
        id=uuid4(),
        employee_id=data.employee_id,
        period_start=data.period_start,
        period_end=data.period_end,
        gross_amount=data.gross_amount,
        advances_deducted=data.advances_deducted,
        net_amount=data.net_amount,
        paid_by=paid_by,  # UUID of current user
        notes=notes_text if notes_text else None,
    )
    db.add(payment)
    await db.flush()
    return payment


async def get_payroll_payments(
    station_id: UUID,
    period_start: date,
    period_end: date,
    db: AsyncSession
) -> list[PayrollPayment]:
    """Get all payroll payments for a station's employees in a period."""
    stmt = (
        select(PayrollPayment)
        .join(Employee)
        .where(
            and_(
                Employee.station_id == station_id,
                PayrollPayment.period_start == period_start,
                PayrollPayment.period_end == period_end,
            )
        )
        .order_by(PayrollPayment.paid_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
