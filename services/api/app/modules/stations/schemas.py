"""
Stations module Pydantic schemas.
Request/response models for station CRUD.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.modules.stations.models import StationStatus


class StationBase(BaseModel):
    """Base station schema."""
    name: str
    location: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None


class StationCreate(StationBase):
    """Schema for creating a station."""
    pass


class StationUpdate(BaseModel):
    """Schema for updating a station."""
    name: str | None = None
    location: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    status: StationStatus | None = None


class StationRead(StationBase):
    """Station response schema."""
    id: UUID
    status: StationStatus
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class StationSettingsRead(BaseModel):
    """Station settings response schema."""
    id: UUID
    station_id: UUID
    late_arrival_threshold: int
    early_departure_threshold: int
    shift_report_emails: str | None = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class StationSettingsUpdate(BaseModel):
    """Schema for updating station settings."""
    late_arrival_threshold: int | None = None
    early_departure_threshold: int | None = None
    shift_report_emails: str | None = None
