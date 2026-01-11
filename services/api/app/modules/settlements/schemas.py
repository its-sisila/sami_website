from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer

from app.modules.settlements.models import SettlementStatus, CardProvider, TerminalStatus


# ============================================================================
# Card Terminal Schemas
# ============================================================================

class CardTerminalRead(BaseModel):
    """Card terminal response schema."""
    id: UUID
    station_id: UUID
    provider: CardProvider
    terminal_id: str
    label: str | None = None
    bank_account: str | None = None
    status: TerminalStatus
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class CardTerminalBase(BaseModel):
    """Base card terminal schema."""
    provider: CardProvider
    terminal_id: str
    label: str | None = None
    bank_account: str | None = None


class CardTerminalCreate(CardTerminalBase):
    """Schema for creating a card terminal."""
    pass


class CardTerminalUpdate(BaseModel):
    """Schema for updating a card terminal."""
    provider: CardProvider | None = None
    terminal_id: str | None = None
    label: str | None = None
    bank_account: str | None = None
    status: TerminalStatus | None = None


# ============================================================================
# Card Settlement Schemas
# ============================================================================

class CardSettlementBase(BaseModel):
    """Base card settlement schema."""
    terminal_id: UUID
    shift_id: UUID | None = None
    batch_id: str | None = None
    settlement_date: date
    settlement_time: str | None = None  # HH:MM format for input
    amount: Decimal = Field(..., gt=0)
    notes: str | None = None


class CardSettlementCreate(CardSettlementBase):
    """Schema for recording a card settlement."""
    pass


class CardSettlementRead(BaseModel):
    """Card settlement response schema."""
    id: UUID
    terminal_id: UUID
    shift_id: UUID | None = None
    batch_id: str | None = None
    settlement_date: date
    settlement_time: time | None = None  # time type from database
    amount: Decimal
    notes: str | None = None
    status: SettlementStatus
    verified_at: datetime | None = None
    verified_by: UUID | None = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}
    
    @field_serializer('settlement_time')
    def serialize_time(self, v: time | None) -> str | None:
        """Convert time to HH:MM string format."""
        if v is None:
            return None
        return v.strftime("%H:%M")


class CardSettlementUpdate(BaseModel):
    """Schema for updating/verifying a card settlement."""
    status: SettlementStatus | None = None
    notes: str | None = None


# ============================================================================
# Shift Settlement Schemas
# ============================================================================

class ShiftSettlementBase(BaseModel):
    """Base shift settlement schema."""
    shift_id: UUID
    bank_name: str
    bank_account: str | None = None
    deposit_method: str  # CDM, Slip, Online
    amount: Decimal = Field(..., gt=0)
    reference_number: str | None = None
    deposit_time: datetime | None = None
    proof_url: str | None = None
    notes: str | None = None


class ShiftSettlementCreate(ShiftSettlementBase):
    """Schema for recording a shift settlement (cash deposit)."""
    pass


class ShiftSettlementRead(ShiftSettlementBase):
    """Shift settlement response schema."""
    id: UUID
    status: SettlementStatus
    verified_at: datetime | None = None
    verified_by: UUID | None = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class ShiftSettlementUpdate(BaseModel):
    """Schema for updating/verifying a shift settlement."""
    status: SettlementStatus | None = None
    notes: str | None = None
