"""
Accounts module business logic.
CRUD for company accounts and transaction recording.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounts.models import CompanyAccount, CompanyTransaction, TransactionType, BankAccount
from app.modules.accounts.schemas import (
    CompanyAccountCreate, CompanyAccountUpdate,
    TransactionCreate, TransactionWithBalance,
    BankAccountCreate, BankAccountUpdate,
    AccountTrendStat,
)
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


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


# ============================================================================
# Bank Account CRUD
# ============================================================================

async def list_banks(
    station_id: UUID,
    db: AsyncSession,
    active_only: bool = True
) -> list[BankAccount]:
    """List all bank accounts for a station."""
    stmt = select(BankAccount).where(BankAccount.station_id == station_id)
    if active_only:
        stmt = stmt.where(BankAccount.is_active == True)
    stmt = stmt.order_by(BankAccount.bank_name, BankAccount.account_number)
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_bank(bank_id: UUID, db: AsyncSession) -> BankAccount | None:
    """Get a single bank account by ID."""
    stmt = select(BankAccount).where(BankAccount.id == bank_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_bank(
    station_id: UUID,
    data: BankAccountCreate,
    db: AsyncSession
) -> BankAccount:
    """Create a new bank account."""
    bank = BankAccount(
        id=uuid4(),
        station_id=station_id,
        bank_name=data.bank_name,
        account_number=data.account_number,
        account_name=data.account_name,
        branch=data.branch,
        is_active=True,
    )
    db.add(bank)
    await db.flush()
    return bank


async def update_bank(
    bank: BankAccount,
    data: BankAccountUpdate,
    db: AsyncSession
) -> BankAccount:
    """Update a bank account."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bank, field, value)
    await db.flush()
    return bank


async def delete_bank(
    bank: BankAccount,
    db: AsyncSession
) -> None:
    """Soft delete a bank account."""
    bank.is_active = False
    await db.flush()


# ============================================================================
# Analytics
# ============================================================================

async def get_account_trends(
    station_id: UUID,
    range_type: str,
    db: AsyncSession
) -> list[AccountTrendStat]:
    """
    Get trend data for accounts (outstanding vs payments).
    range_type: "6months", "12months", "year"
    """
    # 1. Get current state of all active accounts
    accounts = await list_accounts(station_id, db, active_only=True)
    if not accounts:
        return []
        
    current_total_balance = sum(acc.current_balance for acc in accounts)
    total_credit_limit = sum(acc.credit_limit for acc in accounts)
    
    # 2. Determine date range
    today = datetime.utcnow().date()
    months_count = 6
    if range_type == "12months" or range_type == "year":
        months_count = 12
        
    # Start form 1st of the starting month
    start_date = (today - relativedelta(months=months_count-1)).replace(day=1)
    
    # 3. Fetch all transactions in the range
    stmt = (
        select(CompanyTransaction)
        .join(CompanyAccount)
        .where(CompanyAccount.station_id == station_id)
        .where(CompanyTransaction.created_at >= start_date)
        .order_by(CompanyTransaction.created_at.desc())
    )
    result = await db.execute(stmt)
    transactions = result.scalars().all()
    
    # 4. Group by month
    # type: dict[str, list[CompanyTransaction]]
    tx_by_month = {}  
    
    # Initialize buckets for all requested months
    months = []
    for i in range(months_count):
        d = (today - relativedelta(months=i))
        key = d.strftime("%Y-%m")
        label = d.strftime("%b") # Jan, Feb
        months.append((key, label))
        tx_by_month[key] = []
        
    for tx in transactions:
        key = tx.created_at.strftime("%Y-%m")
        if key in tx_by_month:
            tx_by_month[key].append(tx)
            
    # 5. Walk backwards to calculate historical balance
    # We allow the current month (partial) to show current balance
    
    trend_data = []
    running_balance = float(current_total_balance)
    
    # Iterate from newest (months[0]) to oldest (months[-1])
    # months list generated above is [current, current-1, ...]
    
    for key, label in months:
        month_txs = tx_by_month.get(key, [])
        
        month_credits = sum(float(tx.amount) for tx in month_txs if tx.transaction_type == TransactionType.credit)
        month_debits = sum(float(tx.amount) for tx in month_txs if tx.transaction_type == TransactionType.debit)
        
        # Snapshot at END of this month is running_balance
        stats = AccountTrendStat(
            period=label,
            outstanding=running_balance,
            payments=month_credits,
            credit_limit=float(total_credit_limit)
        )
        trend_data.append(stats)
        
        # Calculate balance at START of this month (end of previous)
        # EndBal = StartBal + Debits - Credits
        # StartBal = EndBal - Debits + Credits
        prev_balance = running_balance - month_debits + month_credits
        running_balance = prev_balance

    # Return chronological order (oldest to newest)
    return list(reversed(trend_data))
