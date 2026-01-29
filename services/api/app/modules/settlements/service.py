"""
Settlements module business logic.
CRUD operations for card terminals, card settlements, and shift settlements.
"""

from __future__ import annotations

from datetime import date, time, datetime
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.settlements.models import CardTerminal, CardSettlement, ShiftSettlement
from app.modules.settlements.schemas import (
    CardTerminalCreate, CardTerminalUpdate,
    CardSettlementCreate, ShiftSettlementCreate
)


# ============================================================================
# Card Terminals
# ============================================================================

async def list_card_terminals(
    station_id: UUID,
    db: AsyncSession,
) -> list[CardTerminal]:
    """List all card terminals for a station."""
    stmt = (
        select(CardTerminal)
        .where(CardTerminal.station_id == station_id)
        .order_by(CardTerminal.provider, CardTerminal.terminal_id)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_card_terminal(terminal_id: UUID, db: AsyncSession) -> CardTerminal | None:
    """Get a single card terminal by ID."""
    stmt = select(CardTerminal).where(CardTerminal.id == terminal_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_card_terminal(
    station_id: UUID,
    data: CardTerminalCreate,
    db: AsyncSession,
) -> CardTerminal:
    """Create a new card terminal."""
    terminal = CardTerminal(
        id=uuid4(),
        station_id=station_id,
        provider=data.provider,
        terminal_id=data.terminal_id,
        label=data.label,
        bank_account=data.bank_account,
    )
    db.add(terminal)
    await db.flush()
    return terminal


async def update_card_terminal(
    terminal_id: UUID,
    data: CardTerminalUpdate,
    db: AsyncSession,
) -> CardTerminal | None:
    """Update a card terminal."""
    terminal = await get_card_terminal(terminal_id, db)
    if not terminal:
        return None
    
    # Update only provided fields
    if data.provider is not None:
        terminal.provider = data.provider
    if data.terminal_id is not None:
        terminal.terminal_id = data.terminal_id
    if data.label is not None:
        terminal.label = data.label
    if data.bank_account is not None:
        terminal.bank_account = data.bank_account
    if data.status is not None:
        terminal.status = data.status
    
    await db.flush()
    return terminal


async def delete_card_terminal(
    terminal_id: UUID,
    db: AsyncSession,
) -> bool:
    """Delete a card terminal."""
    terminal = await get_card_terminal(terminal_id, db)
    if not terminal:
        return False
    
    await db.delete(terminal)
    await db.flush()
    return True


# ============================================================================
# Card Settlements
# ============================================================================

async def list_card_settlements(
    station_id: UUID,
    db: AsyncSession,
) -> list[CardSettlement]:
    """List all card settlements for a station (via terminal -> station join)."""
    stmt = (
        select(CardSettlement)
        .join(CardTerminal, CardSettlement.terminal_id == CardTerminal.id)
        .where(CardTerminal.station_id == station_id)
        .order_by(CardSettlement.settlement_date.desc(), CardSettlement.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_card_settlement(settlement_id: UUID, db: AsyncSession) -> CardSettlement | None:
    """Get a single card settlement by ID."""
    stmt = select(CardSettlement).where(CardSettlement.id == settlement_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_card_settlement(
    data: CardSettlementCreate,
    db: AsyncSession,
) -> CardSettlement:
    """Record a new card settlement."""
    # Parse time string to time object if provided
    settlement_time = None
    if data.settlement_time:
        try:
            parts = data.settlement_time.split(":")
            settlement_time = time(int(parts[0]), int(parts[1]))
        except (ValueError, IndexError):
            pass  # Invalid format, leave as None
    
    settlement = CardSettlement(
        id=uuid4(),
        terminal_id=data.terminal_id,
        shift_id=data.shift_id,
        batch_id=data.batch_id,
        settlement_date=data.settlement_date,
        settlement_time=settlement_time,
        amount=data.amount,
        notes=data.notes,
    )
    db.add(settlement)
    await db.flush()
    return settlement


async def update_card_settlement(
    settlement_id: UUID,
    data: "CardSettlementUpdate",
    verified_by_user_id: UUID | None,
    db: AsyncSession,
) -> CardSettlement | None:
    """Update a card settlement (e.g., verify it)."""
    from app.modules.settlements.schemas import CardSettlementUpdate
    from app.modules.settlements.models import SettlementStatus
    
    settlement = await get_card_settlement(settlement_id, db)
    if not settlement:
        return None
    
    # Update status if provided
    if data.status is not None:
        settlement.status = data.status
        # If verifying, set verified_at and verified_by
        if data.status == SettlementStatus.verified:
            settlement.verified_at = datetime.utcnow()
            settlement.verified_by = verified_by_user_id
    
    # Update notes if provided
    if data.notes is not None:
        settlement.notes = data.notes
    
    await db.flush()
    return settlement


# ============================================================================
# Shift Settlements
# ============================================================================

async def list_shift_settlements(
    station_id: UUID,
    db: AsyncSession,
) -> list[ShiftSettlement]:
    """List all shift settlements for a station (via shift -> station join)."""
    # Import here to avoid circular imports
    from app.modules.sales.models import Shift
    
    stmt = (
        select(ShiftSettlement)
        .join(Shift, ShiftSettlement.shift_id == Shift.id)
        .where(Shift.station_id == station_id)
        .order_by(ShiftSettlement.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_shift_settlement(settlement_id: UUID, db: AsyncSession) -> ShiftSettlement | None:
    """Get a single shift settlement by ID."""
    stmt = select(ShiftSettlement).where(ShiftSettlement.id == settlement_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_shift_settlement(
    data: ShiftSettlementCreate,
    db: AsyncSession,
) -> ShiftSettlement:
    """Record a new shift settlement (cash deposit)."""
    settlement = ShiftSettlement(
        id=uuid4(),
        shift_id=data.shift_id,
        bank_name=data.bank_name,
        bank_account=data.bank_account,
        deposit_method=data.deposit_method,
        amount=data.amount,
        reference_number=data.reference_number,
        deposit_time=data.deposit_time,
        proof_url=data.proof_url,
        notes=data.notes,
    )
    db.add(settlement)
    await db.flush()
    return settlement


async def update_shift_settlement(
    settlement_id: UUID,
    data: "ShiftSettlementUpdate",
    verified_by_user_id: UUID | None,
    db: AsyncSession,
) -> ShiftSettlement | None:
    """Update a shift settlement (e.g., verify it)."""
    from app.modules.settlements.schemas import ShiftSettlementUpdate
    from app.modules.settlements.models import SettlementStatus
    
    settlement = await get_shift_settlement(settlement_id, db)
    if not settlement:
        return None
    
    # Update status if provided
    if data.status is not None:
        settlement.status = data.status
        # If verifying, set verified_at and verified_by
        if data.status == SettlementStatus.verified:
            settlement.verified_at = datetime.utcnow()
            settlement.verified_by = verified_by_user_id
    
    # Update notes if provided
    if data.notes is not None:
        settlement.notes = data.notes
    
    await db.flush()
    return settlement
