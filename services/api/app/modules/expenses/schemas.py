"""
Expenses module Pydantic schemas.
Request/response models for expenses endpoints.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# Expense Schemas
# ============================================================================

class ExpenseBase(BaseModel):
    """Base expense schema."""
    category: str = Field(..., min_length=1, max_length=100)
    payee: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0)
    description: str | None = None
    invoice_number: str | None = None
    expense_date: date | None = None
    shift_id: UUID | None = None
    notes: str | None = None


class ExpenseCreate(ExpenseBase):
    """Schema for creating an expense."""
    pass


class ExpenseUpdate(BaseModel):
    """Schema for updating an expense (all fields optional)."""
    category: str | None = None
    payee: str | None = None
    amount: Decimal | None = None
    description: str | None = None
    invoice_number: str | None = None
    expense_date: date | None = None
    notes: str | None = None


class ExpenseRead(ExpenseBase):
    """Expense response schema."""
    id: UUID
    station_id: UUID
    approved_by: UUID | None = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Expense Categories
# ============================================================================

# ============================================================================
# Expense Categories
# ============================================================================

class ExpenseCategoryBase(BaseModel):
    """Base expense category schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None


class ExpenseCategoryCreate(ExpenseCategoryBase):
    """Schema for creating a category."""
    pass


class ExpenseCategoryUpdate(BaseModel):
    """Schema for updating a category."""
    name: str | None = None
    description: str | None = None


class ExpenseCategoryRead(ExpenseCategoryBase):
    """Category response schema."""
    id: UUID
    station_id: UUID | None = None
    is_default: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


# Deprecate the hardcoded list in favor of DB-driven categories, 
# but keep for backward compat / seeding / types if needed.
DEFAULT_EXPENSE_CATEGORIES = [
    "Transport",
    "Bowser",
    "Bills",
    "Utilities",
    "Refreshments",
    "Maintenance",
    "Office Supplies",
    "Fuel",
    "Wages",
    "Other",
]
