"""
Accounts module business logic.
CRUD for company accounts and transaction recording.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounts.models import CompanyAccount, CompanyTransaction, TransactionType
from app.modules.accounts.schemas import (
    CompanyAccountCreate, CompanyAccountUpdate,
    TransactionCreate, TransactionWithBalance,
)


# ============================================================================
# Company Account CRUD
# ============================================================================

async def list_accounts(
    station_id: UUID,
    db: AsyncSession,
    active_only: bool = True
) -> list[CompanyAccount]:
    """List all company accounts for a station."""
    stmt = select(CompanyAccount).where(CompanyAccount.station_id == station_id)
    if active_only:
        stmt = stmt.where(CompanyAccount.is_active == True)
    stmt = stmt.order_by(CompanyAccount.name)
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_account(account_id: UUID, db: AsyncSession) -> CompanyAccount | None:
    """Get a single company account by ID."""
    stmt = select(CompanyAccount).where(CompanyAccount.id == account_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_account(
    station_id: UUID,
    data: CompanyAccountCreate,
    db: AsyncSession
) -> CompanyAccount:
    """Create a new company account."""
    account = CompanyAccount(
        id=uuid4(),
        station_id=station_id,
        name=data.name,
        contact_person=data.contact_person,
        contact_number=data.contact_number,
        email=data.email,
        address=data.address,
        credit_limit=data.credit_limit,
        current_balance=Decimal("0"),
    )
    db.add(account)
    await db.flush()
    return account


async def update_account(
    account: CompanyAccount,
    data: CompanyAccountUpdate,
    db: AsyncSession
) -> CompanyAccount:
    """Update a company account."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    await db.flush()
    return account


# ============================================================================
# Transactions
# ============================================================================

async def record_transaction(
    data: TransactionCreate,
    recorded_by: UUID | None,
    db: AsyncSession
) -> TransactionWithBalance:
    """
    Record a transaction and update account balance.
    
    - Debit: increases balance (company owes more)
    - Credit: decreases balance (company paid)
    """
    # Get the account
    account = await get_account(data.account_id, db)
    if not account:
        raise ValueError(f"Account {data.account_id} not found")
    
    # Create transaction
    transaction = CompanyTransaction(
        id=uuid4(),
        account_id=data.account_id,
        shift_id=data.shift_id,
        transaction_type=data.transaction_type,
        amount=data.amount,
        description=data.description,
        reference_number=data.reference_number,
        recorded_by=recorded_by,
    )
    db.add(transaction)
    
    # Update balance
    if data.transaction_type == TransactionType.debit:
        account.current_balance += data.amount
    else:  # credit
        account.current_balance -= data.amount
    
    await db.flush()
    
    return TransactionWithBalance(
        id=transaction.id,
        account_id=transaction.account_id,
        transaction_type=transaction.transaction_type,
        amount=transaction.amount,
        description=transaction.description,
        reference_number=transaction.reference_number,
        created_at=transaction.created_at,
        new_balance=account.current_balance,
    )


async def get_transactions(
    account_id: UUID,
    db: AsyncSession,
    limit: int = 50
) -> list[CompanyTransaction]:
    """Get transaction history for an account."""
    stmt = (
        select(CompanyTransaction)
        .where(CompanyTransaction.account_id == account_id)
        .order_by(CompanyTransaction.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
