"""
Employees module Pydantic schemas.
Request/response models for employee endpoints.
"""

from __future__ import annotations

from datetime import date, time, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.employees.models import EmployeeRole, AttendanceStatus


# ============================================================================
# Employee Schemas
# ============================================================================

class EmployeeBase(BaseModel):
    """Base employee schema."""
    full_name: str
    name_with_initials: str | None = None
    nic: str | None = None
    address: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    role: EmployeeRole = EmployeeRole.pumper
    joined_date: date | None = None
    daily_wage: Decimal = Decimal("0")
    overtime_bonus: Decimal = Decimal("0")


class EmployeeCreate(EmployeeBase):
    """Schema for creating an employee."""
    pass


class EmployeeUpdate(BaseModel):
    """Schema for updating an employee (all fields optional)."""
    full_name: str | None = None
    name_with_initials: str | None = None
    nic: str | None = None
    address: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    role: EmployeeRole | None = None
    daily_wage: Decimal | None = None
    overtime_bonus: Decimal | None = None
    is_active: bool | None = None


class EmployeeRead(EmployeeBase):
    """Employee response schema."""
    id: UUID
    station_id: UUID
    employee_code: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Attendance Schemas
# ============================================================================

class AttendanceEntry(BaseModel):
    """Single attendance entry for bulk marking."""
    employee_id: UUID
    status: AttendanceStatus
    time_in: time | None = None
    time_out: time | None = None
    notes: str | None = None


class BulkAttendanceCreate(BaseModel):
    """Schema for bulk attendance marking."""
    attendance_date: date
    shift_id: UUID | None = None
    entries: list[AttendanceEntry] = Field(..., min_length=1)


class AttendanceRead(BaseModel):
    """Attendance response schema."""
    id: UUID
    employee_id: UUID
    attendance_date: date
    status: AttendanceStatus
    time_in: time | None = None
    time_out: time | None = None
    notes: str | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class DayAttendance(BaseModel):
    """Attendance status for a single day."""
    day: int = Field(..., ge=1, le=31)
    status: AttendanceStatus | None = None
    time_in: time | None = None
    time_out: time | None = None


class MonthlyAttendanceRead(BaseModel):
    """Monthly attendance for a single employee."""
    employee_id: UUID
    employee_name: str
    attendance: list[DayAttendance]  # List of 31 days


class ShiftHistoryEntry(BaseModel):
    """Single shift record for an employee."""
    id: UUID
    attendance_date: date
    shift_type: str | None = None  # 'day' or 'night'
    status: AttendanceStatus
    time_in: time | None = None
    time_out: time | None = None
    hours_worked: Decimal | None = None
    
    model_config = {"from_attributes": True}

# ============================================================================
# Advance Payment Schemas
# ============================================================================

class AdvancePaymentCreate(BaseModel):
    """Schema for creating an advance payment."""
    employee_id: UUID
    amount: Decimal
    payment_date: date | None = None
    payment_time: time | None = None
    reason: str | None = None
    notes: str | None = None


class AdvancePaymentRead(BaseModel):
    """Advance payment response schema."""
    id: UUID
    employee_id: UUID
    amount: Decimal
    payment_date: date
    payment_time: time | None = None
    reason: str | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Payroll Schemas
# ============================================================================

class PayrollEntry(BaseModel):
    """Single employee payroll calculation."""
    employee_id: UUID
    employee_name: str
    role: EmployeeRole
    daily_wage: Decimal
    days_present: int
    days_half: int
    days_overtime: int
    total_days_worked: Decimal  # present + 0.5*half + 1.5*overtime (or similar)
    gross_wage: Decimal
    total_advances: Decimal
    net_payable: Decimal
    is_paid: bool = False
    paid_at: datetime | None = None


class PayrollResponse(BaseModel):
    """Payroll calculation response."""
    start_date: date
    end_date: date
    employees: list[PayrollEntry]
    total_gross: Decimal
    total_advances: Decimal
    total_net: Decimal


# ============================================================================
# Payroll Payment Schemas
# ============================================================================

class PayrollPaymentCreate(BaseModel):
    """Schema for recording a payroll payment."""
    employee_id: UUID
    period_start: date
    period_end: date
    gross_amount: Decimal
    advances_deducted: Decimal = Decimal("0")
    net_amount: Decimal
    paid_by: str | None = None  # Name of person who made the payment
    notes: str | None = None


class PayrollPaymentRead(BaseModel):
    """Payroll payment response schema."""
    id: UUID
    employee_id: UUID
    period_start: date
    period_end: date
    gross_amount: Decimal
    advances_deducted: Decimal
    net_amount: Decimal
    paid_at: datetime
    paid_by: UUID | None = None
    notes: str | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}
