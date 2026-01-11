"""
Exports module service functions.
Generates CSV content for various data exports.
"""

from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal
from typing import AsyncGenerator
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.employees.models import Employee, Attendance, AttendanceStatus
from app.modules.sales.models import Shift, Sale, ShiftStatus
from app.modules.settlements.models import CardSettlement, ShiftSettlement, SettlementStatus
from app.modules.expenses.models import Expense



async def generate_sales_csv(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession,
) -> str:
    """
    Generate CSV content for sales export.
    
    Columns: Date, Shift Type, Nozzle ID, Employee, Liters Sold, Price/L, Amount (LKR)
    """
    # Query shifts with sales for the date range
    stmt = (
        select(Shift)
        .options(selectinload(Shift.sales))
        .where(
            and_(
                Shift.station_id == station_id,
                Shift.shift_date >= start_date,
                Shift.shift_date <= end_date,
                Shift.status == ShiftStatus.closed,
            )
        )
        .order_by(Shift.shift_date, Shift.shift_type)
    )
    
    result = await db.execute(stmt)
    shifts = result.scalars().all()
    
    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Date",
        "Shift Type",
        "Nozzle ID",
        "Employee ID",
        "Start Meter",
        "End Meter",
        "Liters Sold",
        "Price/L",
        "Amount (LKR)",
        "Notes",
    ])
    
    # Data rows
    for shift in shifts:
        for sale in shift.sales:
            writer.writerow([
                shift.shift_date.isoformat(),
                shift.shift_type.value,
                str(sale.nozzle_id) if sale.nozzle_id else "",
                str(sale.employee_id) if sale.employee_id else "",
                str(sale.start_meter_digital),
                str(sale.end_meter_digital),
                str(sale.liters_sold),
                str(sale.price_per_liter),
                str(sale.amount_lkr),
                sale.notes or "",
            ])
    
    return output.getvalue()


async def generate_attendance_csv(
    station_id: UUID,
    year: int,
    month: int,
    db: AsyncSession,
) -> str:
    """
    Generate CSV content for monthly attendance export.
    
    Columns: Date, Employee Name, Employee ID, Role, Status, Time In, Time Out, Notes
    """
    # Calculate date range for the month
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    # Query attendance with employee info
    stmt = (
        select(Attendance)
        .join(Employee)
        .where(
            and_(
                Employee.station_id == station_id,
                Attendance.attendance_date >= start_date,
                Attendance.attendance_date < end_date,
            )
        )
        .order_by(Attendance.attendance_date, Employee.full_name)
        .options(selectinload(Attendance.employee))
    )
    
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Date",
        "Employee Name",
        "Employee ID",
        "Role",
        "Status",
        "Time In",
        "Time Out",
        "Notes",
    ])
    
    # Data rows
    for record in records:
        emp = record.employee
        writer.writerow([
            record.attendance_date.isoformat(),
            emp.full_name if emp else "",
            str(emp.id) if emp else "",
            emp.role.value if emp else "",
            record.status.value,
            record.time_in.isoformat() if record.time_in else "",
            record.time_out.isoformat() if record.time_out else "",
            record.notes or "",
        ])
    
    return output.getvalue()


async def generate_employees_csv(
    station_id: UUID,
    db: AsyncSession,
    include_inactive: bool = False,
) -> str:
    """
    Generate CSV content for employees export.
    
    Columns: ID, Full Name, Initials, NIC, Phone, Role, Join Date, Daily Wage, Status
    """
    stmt = select(Employee).where(Employee.station_id == station_id)
    if not include_inactive:
        stmt = stmt.where(Employee.is_active == True)
    stmt = stmt.order_by(Employee.full_name)
    
    result = await db.execute(stmt)
    employees = result.scalars().all()
    
    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID",
        "Full Name",
        "Name with Initials",
        "NIC",
        "Phone",
        "Address",
        "Date of Birth",
        "Gender",
        "Role",
        "Join Date",
        "Daily Wage (LKR)",
        "Overtime Bonus (LKR)",
        "Status",
    ])
    
    # Data rows
    for emp in employees:
        writer.writerow([
            str(emp.id),
            emp.full_name,
            emp.name_with_initials or "",
            emp.nic or "",
            emp.phone or "",
            emp.address or "",
            emp.date_of_birth.isoformat() if emp.date_of_birth else "",
            emp.gender or "",
            emp.role.value,
            emp.joined_date.isoformat() if emp.joined_date else "",
            str(emp.daily_wage),
            str(emp.overtime_bonus),
            "Active" if emp.is_active else "Inactive",
        ])
    
    return output.getvalue()


async def generate_card_settlements_csv(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession,
) -> str:
    """Card settlements export."""
    stmt = (
        select(CardSettlement)
        .join(CardSettlement.terminal)
        .where(
            and_(
                CardSettlement.terminal.has(station_id=station_id),
                CardSettlement.settlement_date >= start_date,
                CardSettlement.settlement_date <= end_date,
            )
        )
        .order_by(CardSettlement.settlement_date)
        .options(selectinload(CardSettlement.terminal))
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Time", "Terminal", "Batch ID", "Amount", "Status", "Verified At", "Notes"])

    for r in records:
        writer.writerow([
            r.settlement_date.isoformat(),
            r.settlement_time.isoformat() if r.settlement_time else "",
            r.terminal.terminal_id if r.terminal else "",
            r.batch_id or "",
            str(r.amount),
            r.status.value,
            r.verified_at.isoformat() if r.verified_at else "",
            r.notes or "",
        ])
    return output.getvalue()


async def generate_deposits_csv(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession,
) -> str:
    """Cash deposits (shift settlements) export."""
    stmt = (
        select(ShiftSettlement)
        .join(Shift)
        .where(
            and_(
                Shift.station_id == station_id,
                Shift.shift_date >= start_date,
                Shift.shift_date <= end_date,
            )
        )
        .order_by(Shift.shift_date)
        .options(selectinload(ShiftSettlement.shift))
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Shift Date", "Shift Type", "Bank", "Account", "Method", 
        "Amount", "Reference", "Status", "Notes"
    ])

    for r in records:
        writer.writerow([
            r.shift.shift_date.isoformat(),
            r.shift.shift_type.value,
            r.bank_name,
            r.bank_account or "",
            r.deposit_method,
            str(r.amount),
            r.reference_number or "",
            r.status.value,
            r.notes or "",
        ])
    return output.getvalue()


async def generate_expenses_csv(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession,
) -> str:
    """Expenses export."""
    stmt = (
        select(Expense)
        .where(
            and_(
                Expense.station_id == station_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
        )
        .order_by(Expense.expense_date)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Category", "Payee", "Description", "Invoice #", "Amount"])

    for r in records:
        writer.writerow([
            r.expense_date.isoformat(),
            r.category,
            r.payee,
            r.description or "",
            r.invoice_number or "",
            str(r.amount),
        ])
    return output.getvalue()


async def generate_reconciliation_csv(
    station_id: UUID,
    start_date: date,
    end_date: date,
    db: AsyncSession,
) -> str:
    """Reconciliation export."""
    # Fetch Shifts with Sales
    stmt_shifts = (
        select(Shift)
        .options(selectinload(Shift.sales))
        .where(
            and_(
                Shift.station_id == station_id,
                Shift.shift_date >= start_date,
                Shift.shift_date <= end_date,
                Shift.status == ShiftStatus.closed # Only closed shifts count provided sales
            )
        )
    )
    shifts = (await db.execute(stmt_shifts)).scalars().all()
    
    # Fetch Deposits (ShiftSettlement) verified
    stmt_deposits = (
        select(ShiftSettlement)
        .join(Shift)
        .where(
            and_(
                Shift.station_id == station_id,
                Shift.shift_date >= start_date,
                Shift.shift_date <= end_date,
                ShiftSettlement.status == SettlementStatus.verified
            )
        )
    )
    deposits = (await db.execute(stmt_deposits)).scalars().all()
    
    # Fetch Card Settlements verified
    stmt_cards = (
        select(CardSettlement)
        .join(CardSettlement.terminal)
        .where(
            and_(
                CardSettlement.terminal.has(station_id=station_id),
                CardSettlement.settlement_date >= start_date,
                CardSettlement.settlement_date <= end_date,
                CardSettlement.status == SettlementStatus.verified
            )
        )
    )
    cards = (await db.execute(stmt_cards)).scalars().all()

    # Aggregate by date
    daily_data = {}
    current = start_date
    delta = (end_date - start_date).days
    for i in range(delta + 1):
        d = date.fromordinal(start_date.toordinal() + i)
        daily_data[d] = {"sales": Decimal(0), "verified": Decimal(0)}
        
    for s in shifts:
        if s.shift_date in daily_data:
            total_sales = sum(sale.amount_lkr for sale in s.sales)
            daily_data[s.shift_date]["sales"] += total_sales
            
    for d in deposits:
        # Deposit linked to shift date
        if d.shift.shift_date in daily_data:
            daily_data[d.shift.shift_date]["verified"] += d.amount
            
    for c in cards:
        if c.settlement_date in daily_data:
            daily_data[c.settlement_date]["verified"] += c.amount

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Expected Sales (LKR)", "Verified Funds (LKR)", "Variance (LKR)"])
    
    for d, val in sorted(daily_data.items()):
        variance = val["verified"] - val["sales"]
        writer.writerow([
            d.isoformat(),
            str(val["sales"]),
            str(val["verified"]),
            str(variance)
        ])
        
    return output.getvalue()
