"""
Expenses module SQLAlchemy models.
Maps to expenses table.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, String, Date, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Expense(Base):
    """Operational expenses for the station."""
    
    __tablename__ = "expenses"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    shift_id: Mapped[UUID | None] = mapped_column(ForeignKey("shifts.id", ondelete="SET NULL"))
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # Transport, Bowser, Bills, etc.
    payee: Mapped[str] = mapped_column(String(255), nullable=False)  # Threewheeler, CEB, Dialog, etc.
    description: Mapped[str | None] = mapped_column(Text)
    invoice_number: Mapped[str | None] = mapped_column(String(100))
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    expense_date: Mapped[date] = mapped_column("date", Date, default=date.today)
    approved_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class ExpenseCategory(Base):
    """Customizable expense categories."""
    
    __tablename__ = "expense_categories"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID | None] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_default: Mapped[bool] = mapped_column(default=False)  # If True, available to all stations
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
