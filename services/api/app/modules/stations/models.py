"""
Stations module SQLAlchemy models.
Maps to stations table.
"""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import String, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StationStatus(str, enum.Enum):
    """Station status types."""
    setup = "setup"
    active = "active"
    suspended = "suspended"
    archived = "archived"


class Station(Base):
    """Fuel stations (tenants) in the SAMI system."""
    
    __tablename__ = "stations"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(500))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[StationStatus] = mapped_column(
        SQLEnum(StationStatus, name="station_status", create_type=False),
        default=StationStatus.setup
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class StationSettings(Base):
    """Station-specific settings for alerts and configuration."""
    
    __tablename__ = "station_settings"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(nullable=False, unique=True)
    
    # Alert thresholds (in minutes)
    late_arrival_threshold: Mapped[int] = mapped_column(default=10)  # Minutes after shift start
    early_departure_threshold: Mapped[int] = mapped_column(default=30)  # Minutes before shift end
    
    # Future: Add more settings as needed
    # low_stock_threshold: Mapped[int] = mapped_column(default=30)  # Percent
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
