"""
Sales module SQLAlchemy models.
Maps to shifts and sales tables.
"""

from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, String, Date, Numeric, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ShiftType(str, enum.Enum):
    """Shift types."""
    day = "day"
    night = "night"


class ShiftStatus(str, enum.Enum):
    """Shift status."""
    open = "open"
    closed = "closed"
    reconciled = "reconciled"


class Shift(Base):
    """Day/Night shifts per station."""
    
    __tablename__ = "shifts"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    shift_type: Mapped[ShiftType] = mapped_column(
        SQLEnum(ShiftType, name="shift_type", create_type=False)
    )
    shift_date: Mapped[date] = mapped_column("date", Date, nullable=False)
    status: Mapped[ShiftStatus] = mapped_column(
        SQLEnum(ShiftStatus, name="shift_status", create_type=False),
        default=ShiftStatus.open
    )
    opened_at: Mapped[datetime | None] = mapped_column()
    closed_at: Mapped[datetime | None] = mapped_column()
    opened_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    closed_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="shift")
    card_sales: Mapped[list["CardSale"]] = relationship("CardSale", back_populates="shift")
    credit_sales: Mapped[list["CreditSale"]] = relationship("CreditSale", back_populates="shift")


class Sale(Base):
    """Sales records per nozzle per shift (meter readings)."""
    
    __tablename__ = "sales"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    shift_id: Mapped[UUID] = mapped_column(ForeignKey("shifts.id", ondelete="CASCADE"))
    nozzle_id: Mapped[UUID] = mapped_column(ForeignKey("nozzles.id", ondelete="RESTRICT"))
    employee_id: Mapped[UUID | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    start_meter_digital: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    end_meter_digital: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    start_meter_analog: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    end_meter_analog: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    liters_sold: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    price_per_liter: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    amount_lkr: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    is_submitted: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shift: Mapped["Shift"] = relationship("Shift", back_populates="sales")
    card_sales: Mapped[list["CardSale"]] = relationship("CardSale", back_populates="sale")
    credit_sales: Mapped[list["CreditSale"]] = relationship("CreditSale", back_populates="sale")


class ShiftAssignment(Base):
    """Pre-scheduled employee assignments for upcoming shifts."""
    
    __tablename__ = "shift_assignments"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    shift_date: Mapped[date] = mapped_column(Date, nullable=False)
    shift_type: Mapped[ShiftType] = mapped_column(
        SQLEnum(ShiftType, name="shift_type", create_type=False)
    )
    employee_id: Mapped[UUID] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    assigned_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    __table_args__ = (
        # One assignment per employee per shift date/type
        {"sqlite_autoincrement": True},
    )


class CardSale(Base):
    """Card sales recorded per nozzle per shift."""
    
    __tablename__ = "card_sales"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    shift_id: Mapped[UUID] = mapped_column(ForeignKey("shifts.id", ondelete="CASCADE"))
    sale_id: Mapped[UUID | None] = mapped_column(ForeignKey("sales.id", ondelete="SET NULL"))
    nozzle_id: Mapped[UUID | None] = mapped_column(ForeignKey("nozzles.id", ondelete="RESTRICT"))
    terminal_id: Mapped[UUID] = mapped_column(ForeignKey("card_terminals.id", ondelete="RESTRICT"))
    batch_number: Mapped[str | None] = mapped_column(String(100))
    settlement_datetime: Mapped[datetime | None] = mapped_column()
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shift: Mapped["Shift"] = relationship("Shift", back_populates="card_sales")
    sale: Mapped["Sale"] = relationship("Sale", back_populates="card_sales")


class CreditSale(Base):
    """Credit sales to company accounts per nozzle per shift."""
    
    __tablename__ = "credit_sales"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    shift_id: Mapped[UUID] = mapped_column(ForeignKey("shifts.id", ondelete="CASCADE"))
    sale_id: Mapped[UUID | None] = mapped_column(ForeignKey("sales.id", ondelete="SET NULL"))
    nozzle_id: Mapped[UUID | None] = mapped_column(ForeignKey("nozzles.id", ondelete="RESTRICT"))
    account_id: Mapped[UUID] = mapped_column(ForeignKey("company_accounts.id", ondelete="RESTRICT"))
    po_number: Mapped[str | None] = mapped_column(String(100))
    vehicle_number: Mapped[str | None] = mapped_column(String(50))
    liters: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shift: Mapped["Shift"] = relationship("Shift", back_populates="credit_sales")
    sale: Mapped["Sale"] = relationship("Sale", back_populates="credit_sales")

