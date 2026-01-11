"""
Settlements module SQLAlchemy models.
Maps to card_terminals, card_settlements, shift_settlements tables.
"""

from __future__ import annotations

import enum
from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, String, Date, Time, Numeric, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SettlementStatus(str, enum.Enum):
    """Settlement status types."""
    pending = "pending"
    settled = "settled"
    verified = "verified"


class CardProvider(str, enum.Enum):
    """Card provider types."""
    visa_master = "visa_master"
    amex = "amex"


class TerminalStatus(str, enum.Enum):
    """Terminal status types."""
    active = "active"
    offline = "offline"


class CardTerminal(Base):
    """Card payment terminals (VISA/Master, AMEX)."""
    
    __tablename__ = "card_terminals"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    provider: Mapped[CardProvider] = mapped_column(
        SQLEnum(CardProvider, name="card_provider", create_type=False)
    )
    terminal_id: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 40203510
    label: Mapped[str | None] = mapped_column(String(255))  # e.g., VISA/MASTER ID-11345671
    bank_account: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[TerminalStatus] = mapped_column(
        SQLEnum(TerminalStatus, name="terminal_status", create_type=False),
        default=TerminalStatus.active
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    settlements: Mapped[list["CardSettlement"]] = relationship("CardSettlement", back_populates="terminal")


class CardSettlement(Base):
    """Card terminal batch settlements."""
    
    __tablename__ = "card_settlements"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    terminal_id: Mapped[UUID] = mapped_column(ForeignKey("card_terminals.id", ondelete="CASCADE"))
    shift_id: Mapped[UUID | None] = mapped_column(ForeignKey("shifts.id", ondelete="SET NULL"))
    batch_id: Mapped[str | None] = mapped_column(String(100))
    # Avoid 'date' naming conflict - use settlement_date as Python attr, mapped to 'date' column
    settlement_date: Mapped[date] = mapped_column("date", Date, nullable=False)
    settlement_time: Mapped[time | None] = mapped_column("time", Time)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    status: Mapped[SettlementStatus] = mapped_column(
        SQLEnum(SettlementStatus, name="settlement_status", create_type=False),
        default=SettlementStatus.pending
    )
    verified_at: Mapped[datetime | None] = mapped_column()
    verified_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    terminal: Mapped["CardTerminal"] = relationship("CardTerminal", back_populates="settlements")


class ShiftSettlement(Base):
    """Cash deposits from shift sales."""
    
    __tablename__ = "shift_settlements"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    shift_id: Mapped[UUID] = mapped_column(ForeignKey("shifts.id", ondelete="CASCADE"))
    bank_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bank_account: Mapped[str | None] = mapped_column(String(100))
    deposit_method: Mapped[str] = mapped_column(String(50), nullable=False)  # CDM, Slip, Online
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    reference_number: Mapped[str | None] = mapped_column(String(100))
    deposit_time: Mapped[datetime | None] = mapped_column()
    proof_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[SettlementStatus] = mapped_column(
        SQLEnum(SettlementStatus, name="settlement_status", create_type=False),
        default=SettlementStatus.pending
    )
    verified_at: Mapped[datetime | None] = mapped_column()
    verified_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    shift: Mapped["Shift"] = relationship("Shift")
