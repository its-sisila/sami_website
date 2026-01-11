"""
Orders module Pydantic schemas.
Request/response models for orders endpoints.
"""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.orders.models import OrderStatus


# ============================================================================
# Fuel Order Schemas
# ============================================================================

class FuelOrderBase(BaseModel):
    """Base fuel order schema."""
    product_id: UUID
    order_number: str | None = None
    liters_ordered: Decimal = Field(..., gt=0)
    supplier: str
    expected_date: date | None = None
    notes: str | None = None


class FuelOrderCreate(FuelOrderBase):
    """Schema for creating a fuel order."""
    placed_at: datetime | None = None  # Optional, defaults to now


class FuelOrderUpdate(BaseModel):
    """Schema for updating a fuel order status."""
    status: OrderStatus | None = None
    received_at: datetime | None = None
    payment_made: bool | None = None
    notes: str | None = None


class FuelOrderRead(FuelOrderBase):
    """Fuel order response schema."""
    id: UUID
    station_id: UUID
    status: OrderStatus
    placed_at: datetime
    received_at: datetime | None = None
    payment_made: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Fuel Delivery Schemas
# ============================================================================

class FuelDeliveryBase(BaseModel):
    """Base fuel delivery schema."""
    tank_id: UUID
    order_id: UUID | None = None
    liters_received: Decimal = Field(..., gt=0)
    delivery_date: date | None = None
    delivery_time: str | time | None = None  # HH:MM format
    delivery_slip_number: str | None = None
    vehicle_number: str | None = None
    driver_name: str | None = None
    notes: str | None = None


class FuelDeliveryCreate(FuelDeliveryBase):
    """Schema for recording a fuel delivery."""
    pass


class FuelDeliveryRead(FuelDeliveryBase):
    """Fuel delivery response schema."""
    id: UUID
    recorded_by: UUID | None = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Regulatory Return Schemas
# ============================================================================

class RegulatoryReturnBase(BaseModel):
    """Base regulatory return schema."""
    tank_id: UUID
    shift_id: UUID | None = None
    staff_id: UUID | None = None
    liters_returned: Decimal = Field(..., gt=0)
    reason: str | None = None
    return_date: date | None = None


class RegulatoryReturnCreate(RegulatoryReturnBase):
    """Schema for recording a regulatory return."""
    pass


class RegulatoryReturnRead(RegulatoryReturnBase):
    """Regulatory return response schema."""
    id: UUID
    recorded_by: UUID | None = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}
