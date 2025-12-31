"""
Inventory module SQLAlchemy models.
Maps to fuel_products, tanks, pumps, nozzles, tank_readings tables.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, String, Date, Numeric, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FuelProduct(Base):
    """Fuel product types per station."""
    
    __tablename__ = "fuel_products"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    code: Mapped[str] = mapped_column(String(20), nullable=False)  # LP92, LP95, LAD, LSD
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_per_liter: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tanks: Mapped[list["Tank"]] = relationship("Tank", back_populates="product")


class Tank(Base):
    """Fuel storage tanks at the station."""
    
    __tablename__ = "tanks"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    product_id: Mapped[UUID] = mapped_column(ForeignKey("fuel_products.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # LAD-1, LP92-2
    tank_type: Mapped[str | None] = mapped_column(String(50))  # 3000G, 5000G
    capacity_liters: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    color: Mapped[str | None] = mapped_column(String(50))  # blue, red, yellow, white
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product: Mapped["FuelProduct"] = relationship("FuelProduct", back_populates="tanks")
    readings: Mapped[list["TankReading"]] = relationship("TankReading", back_populates="tank")
    nozzles: Mapped[list["Nozzle"]] = relationship("Nozzle", back_populates="tank")


class Pump(Base):
    """Fuel dispensing pumps at the station."""
    
    __tablename__ = "pumps"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    nozzles: Mapped[list["Nozzle"]] = relationship("Nozzle", back_populates="pump")


class Nozzle(Base):
    """Nozzles linked to pumps, tanks, and products."""
    
    __tablename__ = "nozzles"
    
    nozzle_id: Mapped[UUID] = mapped_column("nozzle_id", primary_key=True)
    pump_id: Mapped[UUID] = mapped_column(ForeignKey("pumps.id", ondelete="CASCADE"))
    tank_id: Mapped[UUID] = mapped_column(ForeignKey("tanks.id", ondelete="RESTRICT"))
    product_id: Mapped[UUID] = mapped_column(ForeignKey("fuel_products.id", ondelete="RESTRICT"))
    nozzle_name: Mapped[str | None] = mapped_column("nozzle_name", String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pump: Mapped["Pump"] = relationship("Pump", back_populates="nozzles")
    tank: Mapped["Tank"] = relationship("Tank", back_populates="nozzles")


class TankReading(Base):
    """Daily tank level readings (dip readings)."""
    
    __tablename__ = "tank_readings"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    tank_id: Mapped[UUID] = mapped_column(ForeignKey("tanks.id", ondelete="CASCADE"))
    reading_date: Mapped[date] = mapped_column("date", Date, nullable=False)
    height_cm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    volume_liters: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reading_type: Mapped[str | None] = mapped_column(String(50), default="manual")
    recorded_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    # Staff fields - stored as JSON arrays of employee IDs
    staff_responsible_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    monitored_by_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tank: Mapped["Tank"] = relationship("Tank", back_populates="readings")


class FuelDelivery(Base):
    """Fuel deliveries received into tanks."""
    
    __tablename__ = "fuel_deliveries"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    order_id: Mapped[UUID | None] = mapped_column(ForeignKey("fuel_orders.id", ondelete="SET NULL"))
    tank_id: Mapped[UUID] = mapped_column(ForeignKey("tanks.id", ondelete="RESTRICT"))
    liters_received: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    delivery_date: Mapped[date] = mapped_column(Date, default=date.today)
    delivery_time: Mapped[str | None] = mapped_column(String(20))
    delivery_slip_number: Mapped[str | None] = mapped_column(String(100))
    vehicle_number: Mapped[str | None] = mapped_column(String(50))
    driver_name: Mapped[str | None] = mapped_column(String(255))
    recorded_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
