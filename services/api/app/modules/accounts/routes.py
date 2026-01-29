"""
Accounts module API routes.
CRUD for company accounts, transaction recording.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.accounts import service
from app.modules.accounts.schemas import (
    CompanyAccountCreate, CompanyAccountUpdate, CompanyAccountRead,
    TransactionCreate, TransactionRead, TransactionWithBalance,
)


router = APIRouter()


# ============================================================================
# Company Account CRUD
# ============================================================================

@router.get("", response_model=list[CompanyAccountRead])
async def list_accounts(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    active_only: bool = Query(True, description="Filter to active accounts only"),
):
    """List all company accounts for the current user's station."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    accounts = await service.list_accounts(station_id, db, active_only=active_only)
    return accounts


@router.post("", response_model=CompanyAccountRead, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: CompanyAccountCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new company account."""
    if not current_user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    account = await service.create_account(station_id, data, db)
    return account


# ============================================================================
# Bank Accounts
# ============================================================================

from app.modules.accounts.schemas import BankAccountRead, BankAccountCreate, BankAccountUpdate

@router.get("/banks", response_model=list[BankAccountRead])
async def list_banks(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    active_only: bool = Query(True, description="Filter to active banks only"),
):
    """List all bank accounts for the current user's station."""
    if not current_user.station_id:
        raise HTTPException(status_code=400, detail="User is not assigned to a station")
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    banks = await service.list_banks(station_id, db, active_only=active_only)
    return banks


@router.post("/banks", response_model=BankAccountRead, status_code=status.HTTP_201_CREATED)
async def create_bank(
    data: BankAccountCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new bank account."""
    if not current_user.station_id:
        raise HTTPException(status_code=400, detail="User is not assigned to a station")
    
    station_id = UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    bank = await service.create_bank(station_id, data, db)
    return bank


@router.get("/banks/{bank_id}", response_model=BankAccountRead)
async def get_bank(
    bank_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a single bank account."""
    bank = await service.get_bank(bank_id, db)
    if not bank:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return bank


@router.patch("/banks/{bank_id}", response_model=BankAccountRead)
async def update_bank(
    bank_id: UUID,
    data: BankAccountUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update a bank account."""
    bank = await service.get_bank(bank_id, db)
    if not bank:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    updated = await service.update_bank(bank, data, db)
    return updated


@router.delete("/banks/{bank_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bank(
    bank_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Soft delete a bank account."""
    bank = await service.get_bank(bank_id, db)
    if not bank:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    await service.delete_bank(bank, db)
    return None


@router.get("/{account_id}", response_model=CompanyAccountRead)
async def get_account(
    account_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a single company account."""
    account = await service.get_account(account_id, db)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return account


@router.patch("/{account_id}", response_model=CompanyAccountRead)
async def update_account(
    account_id: UUID,
    data: CompanyAccountUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update a company account."""
    account = await service.get_account(account_id, db)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    
    updated = await service.update_account(account, data, db)
    return updated


# ============================================================================
# Transactions
# ============================================================================

@router.post("/transaction", response_model=TransactionWithBalance, status_code=status.HTTP_201_CREATED)
async def record_transaction(
    data: TransactionCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Record a transaction (credit sale or payment).
    
    - **debit**: Company purchased on credit (balance increases)
    - **credit**: Company made a payment (balance decreases)
    """
    recorded_by = UUID(current_user.user_id) if current_user.user_id else None
    
    try:
        result = await service.record_transaction(data, recorded_by, db)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get("/{account_id}/transactions", response_model=list[TransactionRead])
async def get_transactions(
    account_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, le=200, description="Max transactions to return"),
):
    """Get transaction history for a company account."""
    # Verify account exists
    account = await service.get_account(account_id, db)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    
    transactions = await service.get_transactions(account_id, db, limit=limit)
    return transactions



