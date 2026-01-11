"""
Orders module SQLAlchemy models.
Maps to fuel_orders and regulatory_returns tables.
Note: FuelDelivery is defined in inventory.models to avoid duplication.
"""

from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, String, Date, Numeric, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OrderStatus(str, enum.Enum):
    """Fuel order status types."""
    pending = "pending"
    delivered = "delivered"
    cancelled = "cancelled"


class FuelOrder(Base):
    """Fuel orders to suppliers."""
    
    __tablename__ = "fuel_orders"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    product_id: Mapped[UUID] = mapped_column(ForeignKey("fuel_products.id", ondelete="RESTRICT"))
    order_number: Mapped[str | None] = mapped_column(String(50))
    liters_ordered: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    supplier: Mapped[str] = mapped_column(String(255), nullable=False)  # CPC, Badulla, Kolonnawa
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus, name="order_status", create_type=False),
        default=OrderStatus.pending
    )
    placed_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    expected_date: Mapped[date | None] = mapped_column(Date)
    received_at: Mapped[datetime | None] = mapped_column()
    payment_made: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class RegulatoryReturn(Base):
    """Fuel returned to tanks (regulatory/adjustment)."""
    
    __tablename__ = "regulatory_returns"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    tank_id: Mapped[UUID] = mapped_column(ForeignKey("tanks.id", ondelete="CASCADE"))
    shift_id: Mapped[UUID | None] = mapped_column(ForeignKey("shifts.id", ondelete="SET NULL"))
    staff_id: Mapped[UUID | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    liters_returned: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    # Column named 'date' in schema, mapped via Column name argument
    return_date: Mapped[date] = mapped_column("date", Date, default=date.today)
    recorded_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

