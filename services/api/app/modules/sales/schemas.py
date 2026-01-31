"""
Sales module Pydantic schemas.
Request/response models for shifts and sales endpoints.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.modules.sales.models import ShiftType, ShiftStatus


# ============================================================================
# Shift Schemas
# ============================================================================

class ShiftStart(BaseModel):
    """Schema for starting a shift."""
    shift_type: ShiftType
    shift_date: date | None = None  # Defaults to today
    notes: str | None = None


class ShiftEnd(BaseModel):
    """Schema for ending a shift."""
    shift_id: UUID
    notes: str | None = None


class ShiftRead(BaseModel):
    """Shift response schema."""
    id: UUID
    station_id: UUID
    shift_type: ShiftType
    shift_date: date
    status: ShiftStatus
    opened_at: datetime | None = None
    closed_at: datetime | None = None
    notes: str | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Sale Entry Schemas
# ============================================================================

class SaleCardEntry(BaseModel):
    terminal_id: UUID
    amount: Decimal
    batch_number: str | None = None
    invoice_number: str | None = None
    invoice_datetime: datetime | None = None

class SaleCreditEntry(BaseModel):
    account_id: UUID
    amount: Decimal
    liters: Decimal | None = None
    po_number: str | None = None
    vehicle_number: str | None = None
    notes: str | None = None

class SaleEntryCreate(BaseModel):
    """Schema for recording nozzle meter readings."""
    shift_id: UUID | None = None  # Optional - can be provided via URL path in complete_shift
    nozzle_id: UUID  # UUID nozzle ID
    employee_id: UUID | None = None  # Pumper assigned
    start_meter_digital: Decimal
    end_meter_digital: Decimal
    start_meter_analog: Decimal | None = None
    end_meter_analog: Decimal | None = None
    price_per_liter: Decimal
    notes: str | None = None
    
    # Optional nested entries to save with the sale
    card_entries: list[SaleCardEntry] | None = None
    credit_entries: list[SaleCreditEntry] | None = None


class CardSaleRead(BaseModel):
    id: UUID
    terminal_id: UUID
    amount: Decimal
    batch_number: str | None = None
    invoice_number: str | None = None
    invoice_datetime: datetime | None = None
    model_config = {"from_attributes": True}

class CreditSaleRead(BaseModel):
    id: UUID
    account_id: UUID
    amount: Decimal
    liters: Decimal | None = None
    po_number: str | None = None
    vehicle_number: str | None = None
    model_config = {"from_attributes": True}

class SaleRead(BaseModel):
    """Sale response schema - includes calculated fields."""
    id: UUID
    shift_id: UUID
    nozzle_id: UUID  # UUID nozzle ID
    employee_id: UUID | None = None
    start_meter_digital: Decimal
    end_meter_digital: Decimal
    start_meter_analog: Decimal | None = None
    end_meter_analog: Decimal | None = None
    liters_sold: Decimal
    price_per_liter: Decimal
    amount_lkr: Decimal
    is_submitted: bool
    notes: str | None = None
    
    # Nested relations
    card_sales: list[CardSaleRead] = []
    credit_sales: list[CreditSaleRead] = []

    model_config = {"from_attributes": True}


class ShiftSummary(BaseModel):
    """Shift with sales summary."""
    shift: ShiftRead
    total_liters: Decimal
    total_amount: Decimal
    sales_count: int


# ============================================================================
# Shift Assignment Schemas (Scheduling)
# ============================================================================

class ShiftAssignmentCreate(BaseModel):
    """Schema for assigning an employee to a shift."""
    shift_date: date
    shift_type: ShiftType
    employee_id: UUID


class ShiftAssignmentRead(BaseModel):
    """Shift assignment response schema."""
    id: UUID
    station_id: UUID
    shift_date: date
    shift_type: ShiftType
    employee_id: UUID
    assigned_by: UUID | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class ScheduledEmployeesResponse(BaseModel):
    """Response for scheduled employees."""
    shift_date: date
    shift_type: ShiftType
    employee_ids: list[UUID]


class WeeklySalesStat(BaseModel):
    """Weekly sales stats for chart."""
    date: date
    day: str # e.g. "Mon"
    name: str # Label "Oct 24"
    totalSalesAmount: Decimal
    verifiedFunds: Decimal
    dayShift: Decimal = Decimal(0)
    nightShift: Decimal = Decimal(0)


class DailySalesSummary(BaseModel):
    """Daily sales summary for dashboard."""
    date: date
    day_shift_sales: Decimal
    day_shift_liters: Decimal
    day_shift_count: int
    night_shift_sales: Decimal
    night_shift_liters: Decimal
    night_shift_count: int
    total_sales: Decimal
    total_liters: Decimal
    total_count: int


# ============================================================================
# Card Sale Schemas
# ============================================================================

class CardSaleCreate(BaseModel):
    """Schema for creating a card sale entry."""
    sale_id: UUID | None = None  # Optional: links to specific nozzle sale
    nozzle_id: UUID | None = None  # Optional - can be global or per-nozzle
    terminal_id: UUID
    batch_number: str | None = None
    settlement_datetime: datetime | None = None
    amount: Decimal


class CardSaleRead(BaseModel):
    """Card sale response schema."""
    id: UUID
    shift_id: UUID
    sale_id: UUID | None = None
    nozzle_id: UUID | None = None
    terminal_id: UUID
    batch_number: str | None = None
    settlement_datetime: datetime | None = None
    amount: Decimal
    notes: str | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Credit Sale Schemas
# ============================================================================

class CreditSaleCreate(BaseModel):
    """Schema for creating a credit sale entry."""
    sale_id: UUID | None = None  # Optional: links to specific nozzle sale
    nozzle_id: UUID | None = None  # Optional - can be global or per-nozzle
    account_id: UUID  # Company account
    po_number: str | None = None
    vehicle_number: str | None = None
    liters: Decimal = Decimal("0")
    amount: Decimal
    notes: str | None = None


class CreditSaleRead(BaseModel):
    """Credit sale response schema."""
    id: UUID
    shift_id: UUID
    sale_id: UUID | None = None
    nozzle_id: UUID | None = None
    account_id: UUID
    po_number: str | None = None
    vehicle_number: str | None = None
    liters: Decimal
    amount: Decimal
    notes: str | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ============================================================================
# Complete Shift Schema (Composite payload for shift completion)
# ============================================================================

class ShiftCompletePayload(BaseModel):
    """Composite payload for completing a shift with all sales data."""
    cash_collected: Decimal = Decimal("0")
    sale_entries: list[SaleEntryCreate] = []
    card_sales: list[CardSaleCreate] = []
    credit_sales: list[CreditSaleCreate] = []
    notes: str | None = None


# ============================================================================
# Tank Sales Aggregation Schemas
# ============================================================================

class TankNozzleSales(BaseModel):
    """Sales for a single nozzle in day/night shifts."""
    nozzle_id: UUID
    nozzle_name: str
    day_liters: Decimal
    night_liters: Decimal


class TankSalesResponse(BaseModel):
    """Aggregated nozzle sales for a tank on a specific date."""
    tank_id: str
    tank_name: str
    date: date
    nozzles: list[TankNozzleSales]
    total_liters: Decimal


# ============================================================================
# Sales History Schemas
# ============================================================================

class SalesHistoryItem(BaseModel):
    """Schema for a single sale in the sales history."""
    id: UUID
    shift_date: date
    shift_type: ShiftType
    nozzle_id: UUID
    nozzle_name: str | None = None
    product_name: str | None = None
    product_code: str | None = None
    employee_id: UUID | None = None
    employee_name: str | None = None
    liters_sold: Decimal
    price_per_liter: Decimal
    amount_lkr: Decimal
    card_sales_total: Decimal = Decimal("0")
    credit_sales_total: Decimal = Decimal("0")
    cash_sales: Decimal = Decimal("0")  # amount - card - credit
    created_at: datetime

    model_config = {"from_attributes": True}


class SalesHistoryResponse(BaseModel):
    """Paginated response for sales history."""
    items: list[SalesHistoryItem]
    total: int
    limit: int
    offset: int


# ============================================================================
# Reconciliation Schemas
# ============================================================================

class ReconciliationShiftStats(BaseModel):
    """Stats for a single shift type."""
    expected_sales: Decimal
    verified_funds: Decimal
    variance: Decimal

class ReconciliationStats(BaseModel):
    """Working capital reconciliation stats."""
    day_shift: ReconciliationShiftStats
    night_shift: ReconciliationShiftStats
    total: ReconciliationShiftStats

