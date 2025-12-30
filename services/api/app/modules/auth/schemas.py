"""
Auth module Pydantic schemas.
Response models for auth endpoints.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.modules.auth.models import UserRole


class ProfileBase(BaseModel):
    """Base profile schema."""
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    role: UserRole


class ProfileRead(ProfileBase):
    """Profile response schema."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class StationInfo(BaseModel):
    """Minimal station info for auth response."""
    id: UUID
    name: str | None = None


class UserWithStation(BaseModel):
    """Current user with station info - response for /me endpoint."""
    user_id: UUID
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    role: UserRole
    station_id: UUID | None = None
    station_name: str | None = None
    
    model_config = {"from_attributes": True}


class TokenPayload(BaseModel):
    """JWT token payload from Supabase."""
    sub: str  # user_id
    email: str | None = None
    role: str | None = None
    aud: str | None = None
    exp: int | None = None
