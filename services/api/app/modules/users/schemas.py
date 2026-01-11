"""
Users module Pydantic schemas.
Request/response models for user management and invites.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.modules.auth.models import UserRole


# ============================================================================
# Invite Schemas
# ============================================================================

class InviteCreate(BaseModel):
    """Schema for inviting a new user."""
    email: EmailStr
    full_name: str | None = None
    role: UserRole
    station_id: UUID | None = None  # Required except for system_admin invites


class InviteResponse(BaseModel):
    """Response after successful invite."""
    user_id: UUID
    email: str
    role: UserRole
    station_id: UUID | None = None
    message: str = "User invited successfully"


# ============================================================================
# User Schemas
# ============================================================================

class UserRead(BaseModel):
    """User response schema with station info."""
    id: UUID
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    role: UserRole
    station_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class UserRemoveResponse(BaseModel):
    """Response after removing user from station."""
    user_id: UUID
    message: str = "User removed from station"


class UserPasswordUpdate(BaseModel):
    """Schema for updating user password."""
    password: str


class UserStationAssignment(BaseModel):
    """Schema for assigning user to a station."""
    station_id: UUID
    role: UserRole = UserRole.owner
