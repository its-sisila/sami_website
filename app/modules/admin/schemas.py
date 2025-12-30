"""
Admin module Pydantic schemas.
Request/response models for admin endpoints.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


# ============================================================================
# Support Access Schemas
# ============================================================================

class SupportAccessToggle(BaseModel):
    """Schema for toggling support access."""
    enabled: bool
    reason: str | None = None
    expires_in_hours: int | None = 24  # Default 24 hour expiry


class SupportAccessRead(BaseModel):
    """Support access response schema."""
    id: UUID
    station_id: UUID
    enabled: bool
    reason: str | None = None
    enabled_by: UUID | None = None
    enabled_at: datetime | None = None
    expires_at: datetime | None = None
    
    model_config = {"from_attributes": True}


# ============================================================================
# Audit Log Schemas
# ============================================================================

class AuditLogRead(BaseModel):
    """Audit log entry response schema."""
    id: UUID
    actor_id: UUID | None = None
    station_id: UUID | None = None
    action: str
    entity_type: str | None = None
    entity_id: UUID | None = None
    details: dict | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}
