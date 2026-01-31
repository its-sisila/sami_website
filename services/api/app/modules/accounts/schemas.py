"""
Accounts module Pydantic schemas.
Request/response models for company account endpoints.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.modules.accounts.models import TransactionType


# ============================================================================
# Company Account Schemas
# ============================================================================

class CompanyAccountBase(BaseModel):
    """Base company account schema."""
    name: str
    contact_person: str | None = None
    contact_number: str | None = None
    email: str | None = None
    address: str | None = None
    credit_limit: Decimal = Decimal("0")


class CompanyAccountCreate(CompanyAccountBase):
    """Schema for creating a company account."""
    pass


class CompanyAccountUpdate(BaseModel):
    """Schema for updating a company account (all fields optional)."""
    name: str | None = None
    contact_person: str | None = None
    contact_number: str | None = None
    email: str | None = None
    address: str | None = None
    credit_limit: Decimal | None = None
    is_active: bool | None = None


class CompanyAccountRead(CompanyAccountBase):
    """Company account response schema."""
    id: UUID
    station_id: UUID
    current_balance: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class CompanyAccountWithBalance(CompanyAccountRead):
    """Company account with balance status."""
    is_over_limit: bool
    available_credit: Decimal


# ============================================================================
# Transaction Schemas
# ============================================================================

class TransactionCreate(BaseModel):
    """Schema for creating a transaction."""
    account_id: UUID
    transaction_type: TransactionType
    amount: Decimal
    description: str | None = None
    reference_number: str | None = None
    shift_id: UUID | None = None


class TransactionRead(BaseModel):
    """Transaction response schema."""
    id: UUID
    account_id: UUID
    transaction_type: TransactionType
    amount: Decimal
    description: str | None = None
    reference_number: str | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class TransactionWithBalance(TransactionRead):
    """Transaction with updated balance."""
    new_balance: Decimal


# ============================================================================
# Bank Account Schemas
# ============================================================================

class BankAccountBase(BaseModel):
    """Base bank account schema."""
    bank_name: str
    account_number: str
    account_name: str
    branch: str | None = None


class BankAccountCreate(BankAccountBase):
    """Schema for creating a bank account."""
    pass


class BankAccountUpdate(BaseModel):
    """Schema for updating a bank account."""
    bank_name: str | None = None
    account_number: str | None = None
    account_name: str | None = None
    branch: str | None = None
    is_active: bool | None = None


class BankAccountRead(BankAccountBase):
    """Bank account response schema."""
    id: UUID
    station_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class AccountTrendStat(BaseModel):
    """Account trend statistics for a period."""
    period: str
    outstanding: float
    payments: float
    credit_limit: float
