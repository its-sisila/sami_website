"""
Accounts module SQLAlchemy models.
Maps to company_accounts and company_transactions tables.
"""

from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, String, Numeric, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TransactionType(str, enum.Enum):
    """Transaction type for company accounts."""
    debit = "debit"    # Company owes more (purchase)
    credit = "credit"  # Company owes less (payment received)


class CompanyAccount(Base):
    """Credit accounts for company/business customers."""
    
    __tablename__ = "company_accounts"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(255))
    contact_number: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    credit_limit: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)  # positive = owes
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transactions: Mapped[list["CompanyTransaction"]] = relationship(
        "CompanyTransaction", back_populates="account", cascade="all, delete-orphan"
    )


class CompanyTransaction(Base):
    """Debit/credit transactions for company accounts."""
    
    __tablename__ = "company_transactions"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    account_id: Mapped[UUID] = mapped_column(ForeignKey("company_accounts.id", ondelete="CASCADE"))
    shift_id: Mapped[UUID | None] = mapped_column(ForeignKey("shifts.id", ondelete="SET NULL"))
    transaction_type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType, name="transaction_type", create_type=False)
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    reference_number: Mapped[str | None] = mapped_column(String(100))
    recorded_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    account: Mapped["CompanyAccount"] = relationship("CompanyAccount", back_populates="transactions")


class BankAccount(Base):
    """Bank accounts for the station/business."""
    
    __tablename__ = "bank_accounts"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint for account number per station is good practice but optional here

