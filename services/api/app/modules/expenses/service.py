"""
Expenses module business logic.
CRUD operations for expenses.
"""

from __future__ import annotations

from datetime import date
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.expenses.models import Expense
from app.modules.expenses.schemas import ExpenseCreate, ExpenseUpdate


# ============================================================================
# CRUD Operations
# ============================================================================

async def list_expenses(
    station_id: UUID,
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    limit: int = 100,
) -> list[Expense]:
    """List expenses for a station with optional filters."""
    stmt = select(Expense).where(Expense.station_id == station_id)
    
    if start_date:
        stmt = stmt.where(Expense.expense_date >= start_date)
    if end_date:
        stmt = stmt.where(Expense.expense_date <= end_date)
    if category:
        stmt = stmt.where(Expense.category == category)
    
    stmt = stmt.order_by(Expense.expense_date.desc(), Expense.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_expense(expense_id: UUID, db: AsyncSession) -> Expense | None:
    """Get a single expense by ID."""
    stmt = select(Expense).where(Expense.id == expense_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_expense(
    station_id: UUID,
    data: ExpenseCreate,
    approved_by: UUID | None,
    db: AsyncSession,
) -> Expense:
    """Create a new expense."""
    expense = Expense(
        id=uuid4(),
        station_id=station_id,
        shift_id=data.shift_id,
        category=data.category,
        payee=data.payee,
        description=data.description,
        invoice_number=data.invoice_number,
        amount=data.amount,
        expense_date=data.expense_date or date.today(),
        approved_by=approved_by,
        notes=data.notes,
    )
    db.add(expense)
    await db.flush()
    return expense


async def update_expense(
    expense: Expense,
    data: ExpenseUpdate,
    db: AsyncSession,
) -> Expense:
    """Update an existing expense."""
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(expense, key, value)
    await db.flush()
    return expense


async def delete_expense(expense_id: UUID, db: AsyncSession) -> bool:
    """Delete an expense by ID."""
    expense = await get_expense(expense_id, db)
    if expense:
        await db.delete(expense)
        await db.flush()
        return True
    return False


# ============================================================================
# Summary/Stats
# ============================================================================

async def get_expenses_by_category(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession,
) -> dict[str, float]:
    """Get expense totals grouped by category."""
    stmt = (
        select(Expense.category, Expense.amount)
        .where(
            Expense.station_id == station_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
        )
    )
    result = await db.execute(stmt)
    
    totals: dict[str, float] = {}
    for category, amount in result.all():
        totals[category] = totals.get(category, 0) + float(amount)
    return totals


# ============================================================================
# Category Operations
# ============================================================================

from app.modules.expenses.models import ExpenseCategory
from app.modules.expenses.schemas import ExpenseCategoryCreate, ExpenseCategoryUpdate, DEFAULT_EXPENSE_CATEGORIES

async def list_categories(station_id: UUID, db: AsyncSession) -> list[ExpenseCategory]:
    """
    List expense categories available for a station.
    Includes global defaults and station-specific categories.
    """
    # Initialize defaults if table is empty (simple seeding strategy)
    # Check if we have any defaults
    params = {"true_val": True}
    stmt_check = select(ExpenseCategory).where(ExpenseCategory.is_default == params["true_val"]).limit(1)
    result_check = await db.execute(stmt_check)
    if not result_check.scalar_one_or_none():
        # Seed defaults
        for cat_name in DEFAULT_EXPENSE_CATEGORIES:
            db.add(ExpenseCategory(id=uuid4(), name=cat_name, is_default=True))
        await db.flush()

    # Fetch custom for station OR defaults
    stmt = select(ExpenseCategory).where(
        (ExpenseCategory.station_id == station_id) | (ExpenseCategory.is_default == params["true_val"])
    ).order_by(ExpenseCategory.name)
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_category(
    station_id: UUID,
    data: ExpenseCategoryCreate,
    db: AsyncSession
) -> ExpenseCategory:
    """Create a new custom category for the station."""
    category = ExpenseCategory(
        id=uuid4(),
        station_id=station_id,
        name=data.name,
        description=data.description,
        is_default=False
    )
    db.add(category)
    await db.flush()
    return category


async def get_category(category_id: UUID, db: AsyncSession) -> ExpenseCategory | None:
    """Get a category by ID."""
    stmt = select(ExpenseCategory).where(ExpenseCategory.id == category_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_category(
    category: ExpenseCategory,
    data: ExpenseCategoryUpdate,
    db: AsyncSession
) -> ExpenseCategory:
    """Update a category."""
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)
    await db.flush()
    return category


async def delete_category(category: ExpenseCategory, db: AsyncSession) -> None:
    """Delete a category."""
    await db.delete(category)
    await db.flush()

