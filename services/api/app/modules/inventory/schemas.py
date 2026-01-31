"""
Inventory module Pydantic schemas.
Request/response models for inventory endpoints.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# Fuel Product Schemas
# ============================================================================

class FuelProductBase(BaseModel):
    """Base fuel product schema."""
    code: str
    name: str
    price_per_liter: Decimal = Decimal("0")


class FuelProductCreate(FuelProductBase):
    """Schema for creating a fuel product."""
    pass


class FuelProductRead(FuelProductBase):
    """Fuel product response schema."""
    id: UUID
    station_id: UUID
    is_active: bool
    
    model_config = {"from_attributes": True}


# ============================================================================
# Tank Schemas
# ============================================================================

class TankBase(BaseModel):
    """Base tank schema."""
    name: str
    product_id: UUID
    tank_type: str | None = None
    capacity_liters: Decimal
    color: str | None = None


class TankCreate(TankBase):
    """Schema for creating a tank."""
    pass


class TankRead(TankBase):
    """Tank response schema."""
    id: UUID
    station_id: UUID
    is_active: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


class TankWithLevel(TankRead):
    """Tank with current level from latest reading."""
    current_volume: Decimal | None = None
    product_name: str | None = None
    product_code: str | None = None


# ============================================================================
# Tank Reading Schemas
# ============================================================================

class NozzleReadingEntry(BaseModel):
    """Schema for a single nozzle meter reading."""
    nozzle_id: UUID
    end_meter: Decimal


class TankReadingEntry(BaseModel):
    """Single tank reading entry."""
    tank_id: UUID
    height_cm: Decimal | None = None
    volume_liters: Decimal
    staff_responsible_ids: list[str] | None = None
    monitored_by_ids: list[str] | None = None
    meter_readings: list[NozzleReadingEntry] | None = None


class TankReadingCreate(BaseModel):
    """Schema for submitting daily dip readings."""
    reading_date: date
    readings: list[TankReadingEntry] = Field(..., min_length=1)
    # Optional: global staff fields that apply to all readings
    staff_responsible_ids: list[str] | None = None
    monitored_by_ids: list[str] | None = None


class TankReadingRead(BaseModel):
    """Tank reading response schema."""
    id: UUID
    tank_id: UUID
    reading_date: date
    height_cm: Decimal | None = None
    volume_liters: Decimal
    reading_type: str | None = None
    staff_responsible_ids: list[str] | None = None
    monitored_by_ids: list[str] | None = None
    meter_readings: list[NozzleReadingEntry] | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Fuel Delivery Schemas
# ============================================================================

class FuelDeliveryCreate(BaseModel):
    """Schema for recording a fuel delivery."""
    tank_id: UUID
    order_id: UUID | None = None
    liters_received: Decimal
    delivery_date: date | None = None
    delivery_time: str | None = None
    delivery_slip_number: str | None = None
    vehicle_number: str | None = None
    driver_name: str | None = None
    notes: str | None = None


class FuelDeliveryRead(BaseModel):
    """Fuel delivery response schema."""
    id: UUID
    tank_id: UUID
    order_id: UUID | None = None
    liters_received: Decimal
    delivery_date: date
    delivery_time: str | None = None
    delivery_slip_number: str | None = None
    vehicle_number: str | None = None
    driver_name: str | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Pump and Nozzle Schemas
# ============================================================================

class PumpCreate(BaseModel):
    """Schema for creating a new pump."""
    name: str
    location: str | None = None


class PumpRead(BaseModel):
    """Pump response schema."""
    id: UUID
    station_id: UUID
    name: str
    location: str | None = None
    is_active: bool
    
    model_config = {"from_attributes": True}


class NozzleCreate(BaseModel):
    """Schema for creating a new nozzle."""
    nozzle_code: str  # User input text ID (e.g., N-LAD-1) - REQUIRED
    nozzle_name: str  # Display name (e.g., LAD-1)
    tank_id: UUID
    product_id: UUID
    pump_id: UUID  # Pump UUID
    digital_meter: Decimal = Decimal("0")
    analog_meter: Decimal = Decimal("0")


class NozzleRead(BaseModel):
    """Nozzle response schema with related data."""
    id: UUID  # Primary key
    nozzle_code: str | None = None  # Human-readable ID (e.g., N-LAD-1)
    nozzle_name: str | None = None
    pump_id: UUID
    tank_id: UUID
    product_id: UUID
    is_active: bool
    # Joined fields for UI convenience
    pump_name: str | None = None
    product_name: str | None = None
    product_code: str | None = None
    price_per_liter: Decimal | None = None
    
    model_config = {"from_attributes": True}

