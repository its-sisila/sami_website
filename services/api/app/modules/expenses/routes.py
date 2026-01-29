"""
Expenses module API routes.
CRUD endpoints for operational expenses.
"""

from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.expenses import service
from app.modules.expenses.schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseRead,
    ExpenseCategoryRead, ExpenseCategoryCreate, ExpenseCategoryUpdate
)


router = APIRouter()


def get_station_uuid(user: CurrentUser) -> UUID:
    """Extract and validate station_id from current user."""
    if not user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    return UUID(user.station_id) if isinstance(user.station_id, str) else user.station_id


# ============================================================================
# Category Routes (MUST be before /{expense_id} routes for correct matching)
# ============================================================================

@router.get("/categories", response_model=list[ExpenseCategoryRead])
async def list_categories_db(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List available expense categories (defaults + custom)."""
    station_id = get_station_uuid(current_user)
    return await service.list_categories(station_id, db)


@router.post("/categories", response_model=ExpenseCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: ExpenseCategoryCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new expense category."""
    if current_user.role not in ("owner", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can create categories",
        )
    
    station_id = get_station_uuid(current_user)
    return await service.create_category(station_id, data, db)


@router.patch("/categories/{category_id}", response_model=ExpenseCategoryRead)
async def update_category(
    category_id: UUID,
    data: ExpenseCategoryUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update a custom category."""
    if current_user.role not in ("owner", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can update categories",
        )
    
    station_id = get_station_uuid(current_user)
    category = await service.get_category(category_id, db)
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    if category.is_default:
        raise HTTPException(status_code=403, detail="Cannot modify default categories")
        
    if category.station_id != station_id:
        raise HTTPException(status_code=403, detail="Category does not belong to your station")

    return await service.update_category(category, data, db)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a custom category."""
    if current_user.role not in ("owner", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can delete categories",
        )
    
    station_id = get_station_uuid(current_user)
    category = await service.get_category(category_id, db)
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    if category.is_default:
        raise HTTPException(status_code=403, detail="Cannot delete default categories")
        
    if category.station_id != station_id:
        raise HTTPException(status_code=403, detail="Category does not belong to your station")

    await service.delete_category(category, db)


# ============================================================================
# Expenses CRUD
# ============================================================================

@router.get("", response_model=list[ExpenseRead])
async def list_expenses(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: date | None = Query(None, description="Filter from date"),
    end_date: date | None = Query(None, description="Filter to date"),
    category: str | None = Query(None, description="Filter by category"),
    limit: int = Query(100, le=500, description="Max expenses to return"),
):
    """List expenses for the station with optional filters."""
    station_id = get_station_uuid(current_user)
    expenses = await service.list_expenses(
        station_id, db,
        start_date=start_date,
        end_date=end_date,
        category=category,
        limit=limit,
    )
    return expenses


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new expense. Requires owner, manager, or accountant role."""
    if current_user.role not in ("owner", "manager", "accountant"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners, managers, and accountants can create expenses",
        )
    
    station_id = get_station_uuid(current_user)
    approved_by = UUID(current_user.user_id) if current_user.user_id else None
    
    expense = await service.create_expense(station_id, data, approved_by, db)
    return expense


@router.get("/{expense_id}", response_model=ExpenseRead)
async def get_expense(
    expense_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a single expense by ID."""
    expense = await service.get_expense(expense_id, db)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    
    # Verify expense belongs to user's station
    station_id = get_station_uuid(current_user)
    if expense.station_id != station_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expense does not belong to your station",
        )
    
    return expense


@router.patch("/{expense_id}", response_model=ExpenseRead)
async def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update an expense. Requires owner or manager role."""
    if current_user.role not in ("owner", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and managers can update expenses",
        )
    
    expense = await service.get_expense(expense_id, db)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    
    # Verify expense belongs to user's station
    station_id = get_station_uuid(current_user)
    if expense.station_id != station_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expense does not belong to your station",
        )
    
    updated = await service.update_expense(expense, data, db)
    return updated


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete an expense. Requires owner role only."""
    if current_user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can delete expenses",
        )
    
    expense = await service.get_expense(expense_id, db)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    
    # Verify expense belongs to user's station
    station_id = get_station_uuid(current_user)
    if expense.station_id != station_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expense does not belong to your station",
        )
    
    await service.delete_expense(expense_id, db)
