"""
Employees module SQLAlchemy models.
Maps to employees, attendance, and advance_payments tables.
"""

from __future__ import annotations

import enum
from datetime import date, time, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, String, Date, Time, Numeric, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EmployeeRole(str, enum.Enum):
    """Employee roles (non-login employees)."""
    staff = "staff"
    pumper = "pumper"
    bowser_driver = "bowser_driver"
    bowser_helper = "bowser_helper"


class AttendanceStatus(str, enum.Enum):
    """Attendance status types."""
    present = "present"
    absent = "absent"
    half_day = "half_day"
    overtime = "overtime"


class Employee(Base):
    """Station employees (staff/pumper) - do not have login accounts."""
    
    __tablename__ = "employees"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    employee_code: Mapped[str | None] = mapped_column(String(50))
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_with_initials: Mapped[str | None] = mapped_column(String(255))
    nic: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[EmployeeRole] = mapped_column(
        SQLEnum(EmployeeRole, name="employee_role", create_type=False),
        default=EmployeeRole.pumper
    )
    joined_date: Mapped[date] = mapped_column(Date, default=date.today)
    daily_wage: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    overtime_bonus: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    attendance_records: Mapped[list["Attendance"]] = relationship(
        "Attendance", back_populates="employee", cascade="all, delete-orphan"
    )
    advance_payments: Mapped[list["AdvancePayment"]] = relationship(
        "AdvancePayment", back_populates="employee", cascade="all, delete-orphan"
    )


class Attendance(Base):
    """Daily attendance records for employees."""
    
    __tablename__ = "attendance"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    employee_id: Mapped[UUID] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    shift_id: Mapped[UUID | None] = mapped_column(ForeignKey("shifts.id", ondelete="SET NULL"))
    attendance_date: Mapped[date] = mapped_column("date", Date, nullable=False)  # Maps to 'date' column in DB
    status: Mapped[AttendanceStatus] = mapped_column(
        SQLEnum(AttendanceStatus, name="attendance_status", create_type=False),
        default=AttendanceStatus.present
    )
    time_in: Mapped[time | None] = mapped_column(Time)
    time_out: Mapped[time | None] = mapped_column(Time)
    marked_at: Mapped[datetime | None] = mapped_column()
    marked_out_at: Mapped[datetime | None] = mapped_column()
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", back_populates="attendance_records")


class AdvancePayment(Base):
    """Advance payments given to employees."""
    
    __tablename__ = "advance_payments"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    employee_id: Mapped[UUID] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    shift_id: Mapped[UUID | None] = mapped_column(ForeignKey("shifts.id", ondelete="SET NULL"))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column("date", Date, default=date.today)  # Maps to 'date' column in DB
    payment_time: Mapped[time | None] = mapped_column("time", Time)  # Maps to 'time' column in DB
    reason: Mapped[str | None] = mapped_column(Text)
    approved_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", back_populates="advance_payments")


class PayrollPayment(Base):
    """Records of payroll payments made to employees."""
    
    __tablename__ = "payroll_payments"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    employee_id: Mapped[UUID] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    advances_deducted: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    paid_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    paid_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
