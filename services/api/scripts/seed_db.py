"""
Database Seed Script for SAMI
Populates the database with realistic mock data matching the dashboard's frontend mock data.

Usage:
    cd services/api
    python -m scripts.seed_db
"""

import asyncio
import sys
import os
import random
from datetime import date, datetime, timedelta, time
from decimal import Decimal
from uuid import uuid4, UUID

# Add parent directory to path to allow importing app
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.modules.stations.models import Station, StationStatus
from app.modules.auth.models import Profile, UserStationRole, UserRole
from app.modules.sales.models import Shift, ShiftType, ShiftStatus
from app.modules.expenses.models import Expense
from app.modules.settlements.models import (
    CardTerminal, CardSettlement, ShiftSettlement, 
    CardProvider, TerminalStatus, SettlementStatus
)
from app.modules.inventory.models import FuelProduct, Tank, TankReading

# =============================================================================
# MOCK DATA - Matching Dashboard Frontend
# =============================================================================

STATION_NAME = "SAMI Demo Station"

# Fuel Products (matching inventory page)
FUEL_PRODUCTS = [
    {"name": "Auto Diesel", "code": "LAD", "price": 366.00, "color": "blue"},
    {"name": "Super Diesel", "code": "LSD", "price": 430.00, "color": "white"},
    {"name": "Petrol 92", "code": "LP92", "price": 355.00, "color": "yellow"},
    {"name": "Petrol 95", "code": "LP95", "price": 420.00, "color": "red"},
]

# Tanks - matching TANKS_CONFIG from inventory/page.tsx
TANKS_DATA = [
    {"name": "LSD-1", "product_code": "LSD", "current": 8800, "max": 13638.27, "color": "white", "type": "3000G"},
    {"name": "LP95-1", "product_code": "LP95", "current": 9100, "max": 13638.27, "color": "red", "type": "3000G"},
    {"name": "LAD-1", "product_code": "LAD", "current": 19500, "max": 22730.45, "color": "blue", "type": "5000G"},
    {"name": "LAD-2", "product_code": "LAD", "current": 18000, "max": 22730.45, "color": "blue", "type": "5000G"},
    {"name": "LAD-3", "product_code": "LAD", "current": 12000, "max": 22730.45, "color": "blue", "type": "5000G"},
    {"name": "LAD-4", "product_code": "LAD", "current": 9000, "max": 22730.45, "color": "blue", "type": "5000G"},
    {"name": "LP92-1", "product_code": "LP92", "current": 8200, "max": 13638.27, "color": "yellow", "type": "3000G"},
    {"name": "LP92-2", "product_code": "LP92", "current": 6000, "max": 13638.27, "color": "yellow", "type": "3000G"},
]

# Card Terminals - matching accounts/page.tsx
TERMINALS_DATA = [
    {"provider": "visa_master", "tid": "40203510", "bank": "DFCC - 4035", "label": "VISA/MASTER 1"},
    {"provider": "visa_master", "tid": "40203511", "bank": "DFCC - 4035", "label": "VISA/MASTER 2"},
    {"provider": "visa_master", "tid": "40203512", "bank": "DFCC - 4035", "label": "VISA/MASTER 3"},
    {"provider": "amex", "tid": "93501476", "bank": "DFCC - 1102", "label": "AMEX 1"},
    {"provider": "amex", "tid": "93501484", "bank": "DFCC - 1102", "label": "AMEX 2"},
    {"provider": "amex", "tid": "93501492", "bank": "DFCC - 1102", "label": "AMEX 3"},
]

# Expense Categories and Payees - matching accounts/page.tsx
EXPENSE_CATEGORIES = {
    "Salary": ["K. Perera", "S. Silva", "N. Fernando", "C. De Silva"],
    "Transport": ["Threewheeler", "Bike"],
    "Bowser": ["Bowser Highway", "Bowser Repair"],
    "Bills": ["Dialog", "SLT", "Credit Card Payment", "Chairman Vehicle Fuel"],
    "Utilities": ["CEB", "LECO", "Water Board", "Tax", "Generator Fuel"],
    "Refreshments": ["Soft Drinks", "Lunch", "Snacks", "Bottled Water"],
    "Maintenance": ["Electrician", "Plumber", "AC Technician", "Pump Technician", "General Repair"],
    "Office Supplies": ["Stationery", "Printing", "Computer Accessories", "Cleaning Supplies"],
}

# Bank options for deposits - matching accounts/page.tsx bankOptions
BANKS = [
    {"name": "DFCC Bank", "account": "102005373457"},
    {"name": "DFCC Bank", "account": "101001020208"},
    {"name": "DFCC Bank", "account": "10100120039"},
    {"name": "BOC", "account": "85763347"},
    {"name": "BOC", "account": "75941669"},
]

DEPOSIT_METHODS = ["CDM", "Slip", "Online"]


async def seed_data():
    async with async_session_factory() as db:
        print("🌱 Starting database seed with dashboard mock data...")
        print("=" * 60)

        # 1. Create/Get Station
        print("\n[1/8] Setting up Station...")
        result = await db.execute(select(Station).where(Station.name == STATION_NAME))
        station = result.scalar_one_or_none()
        
        if not station:
            station = Station(
                id=uuid4(),
                name=STATION_NAME,
                location="Colombo, Sri Lanka",
                address="123 Demo Road, Colombo 03",
                phone="+94 11 234 5678",
                email="info@sami-demo.com",
                status=StationStatus.active,
            )
            db.add(station)
            await db.commit()
            print(f"  ✅ Created Station: {station.name} (ID: {station.id})")
        else:
            print(f"  ℹ️  Station exists: {station.name} (ID: {station.id})")

        # 2. Create Fuel Products
        print("\n[2/8] Setting up Fuel Products...")
        product_map = {}  # code -> product object
        for prod in FUEL_PRODUCTS:
            result = await db.execute(
                select(FuelProduct).where(
                    FuelProduct.code == prod["code"],
                    FuelProduct.station_id == station.id
                )
            )
            existing = result.scalar_one_or_none()
            if not existing:
                product = FuelProduct(
                    id=uuid4(),
                    station_id=station.id,
                    name=prod["name"],
                    code=prod["code"],
                    price_per_liter=Decimal(str(prod["price"])),
                )
                db.add(product)
                product_map[prod["code"]] = product
                print(f"  ✅ Created Product: {prod['name']} ({prod['code']}) - LKR {prod['price']}")
            else:
                product_map[prod["code"]] = existing
                print(f"  ℹ️  Product exists: {prod['name']} ({prod['code']})")
        await db.commit()

        # 3. Create Tanks
        print("\n[3/8] Setting up Tanks...")
        for tank_data in TANKS_DATA:
            result = await db.execute(
                select(Tank).where(
                    Tank.name == tank_data["name"],
                    Tank.station_id == station.id
                )
            )
            existing = result.scalar_one_or_none()
            if not existing:
                product = product_map.get(tank_data["product_code"])
                if product:
                    tank = Tank(
                        id=uuid4(),
                        station_id=station.id,
                        product_id=product.id,
                        name=tank_data["name"],
                        tank_type=tank_data["type"],
                        capacity_liters=Decimal(str(tank_data["max"])),
                        color=tank_data["color"],
                    )
                    db.add(tank)
                    print(f"  ✅ Created Tank: {tank_data['name']} ({tank_data['product_code']}) - {tank_data['max']}L")
                else:
                    print(f"  ⚠️  Skipped Tank {tank_data['name']}: Product {tank_data['product_code']} not found")
            else:
                print(f"  ℹ️  Tank exists: {tank_data['name']}")
        await db.commit()

        # 4. Create Card Terminals
        print("\n[4/8] Setting up Card Terminals...")
        terminals = []
        for term_data in TERMINALS_DATA:
            result = await db.execute(
                select(CardTerminal).where(CardTerminal.terminal_id == term_data["tid"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                provider = CardProvider.visa_master if term_data["provider"] == "visa_master" else CardProvider.amex
                terminal = CardTerminal(
                    id=uuid4(),
                    station_id=station.id,
                    provider=provider,
                    terminal_id=term_data["tid"],
                    label=term_data["label"],
                    bank_account=term_data["bank"],
                    status=TerminalStatus.active,
                )
                db.add(terminal)
                terminals.append(terminal)
                print(f"  ✅ Created Terminal: {term_data['tid']} ({term_data['provider'].upper()})")
            else:
                terminals.append(existing)
                print(f"  ℹ️  Terminal exists: {term_data['tid']}")
        await db.commit()

        # 5. Create/Get Active Shift (may fail if shifts table doesn't exist)
        print("\n[5/8] Setting up Active Shift...")
        shift = None
        try:
            today = date.today()
            result = await db.execute(
                select(Shift).where(
                    Shift.station_id == station.id, 
                    Shift.shift_date == today,
                    Shift.status == ShiftStatus.open
                )
            )
            shift = result.scalar_one_or_none()

            if not shift:
                shift = Shift(
                    id=uuid4(),
                    station_id=station.id,
                    shift_type=ShiftType.day,
                    shift_date=today,
                    status=ShiftStatus.open,
                    opened_at=datetime.utcnow(),
                )
                db.add(shift)
                await db.commit()
                print(f"  ✅ Created Open Shift for {today}")
            else:
                print(f"  ℹ️  Open Shift exists for {today}")
        except Exception as e:
            print(f"  ⚠️  Skipped: shifts table not in database ({type(e).__name__})")
            await db.rollback()

        # 6. Create Sample Expenses (last 30 days) - skip if shifts table missing
        print("\n[6/8] Setting up Sample Expenses...")
        try:
            result = await db.execute(select(Expense).where(Expense.station_id == station.id))
            existing_count = len(result.scalars().all())
            
            if existing_count < 30:
                expenses_added = 0
                for days_ago in range(30):
                    exp_date = today - timedelta(days=days_ago)
                    # Add 1-3 expenses per day
                    for _ in range(random.randint(1, 3)):
                        category = random.choice(list(EXPENSE_CATEGORIES.keys()))
                        payee = random.choice(EXPENSE_CATEGORIES[category])
                        
                        # Different amounts for different categories
                        if category == "Salary":
                            amount = Decimal(random.randint(35000, 65000))
                        elif category == "Utilities":
                            amount = Decimal(random.randint(50000, 150000))
                        else:
                            amount = Decimal(random.randint(500, 15000))
                        
                        exp = Expense(
                            id=uuid4(),
                            station_id=station.id,
                            shift_id=shift.id if shift and days_ago == 0 else None,
                            category=category,
                            payee=payee,
                            description=f"{category} payment to {payee}",
                            amount=amount,
                            expense_date=exp_date,
                        )
                        db.add(exp)
                        expenses_added += 1
                await db.commit()
                print(f"  ✅ Added {expenses_added} sample expenses (last 30 days)")
            else:
                print(f"  ℹ️  Expenses already exist ({existing_count} records)")
        except Exception as e:
            print(f"  ⚠️  Skipped: expenses table issue ({type(e).__name__})")
            await db.rollback()

        # 7. Create Sample Card Settlements - skip if dependent tables missing
        print("\n[7/8] Setting up Sample Card Settlements...")
        try:
            result = await db.execute(select(CardSettlement))
            existing_settlements = len(result.scalars().all())
            
            if existing_settlements < 20 and terminals:
                settlements_added = 0
                for days_ago in range(14):
                    settlement_date = today - timedelta(days=days_ago)
                    # Random settlements for random terminals
                    for term in random.sample(terminals, k=min(3, len(terminals))):
                        if random.random() > 0.3:  # 70% chance
                            amt = Decimal(random.randint(50000, 300000))
                            settlement = CardSettlement(
                                id=uuid4(),
                                terminal_id=term.id,
                                shift_id=shift.id if shift and days_ago == 0 else None,
                                batch_id=f"B-{random.randint(1000, 9999)}",
                                settlement_date=settlement_date,
                                settlement_time=time(18, 30),
                                amount=amt,
                                status=SettlementStatus.verified if days_ago > 1 else SettlementStatus.pending,
                            )
                            db.add(settlement)
                            settlements_added += 1
                await db.commit()
                print(f"  ✅ Added {settlements_added} sample card settlements")
            else:
                print(f"  ℹ️  Card settlements already exist ({existing_settlements} records)")
        except Exception as e:
            print(f"  ⚠️  Skipped: card_settlements table issue ({type(e).__name__})")
            await db.rollback()

        # 8. Create Sample Deposits (Shift Settlements) - skip if shifts table missing
        print("\n[8/8] Setting up Sample Deposits...")
        if shift:
            try:
                result = await db.execute(select(ShiftSettlement))
                existing_deposits = len(result.scalars().all())
                
                if existing_deposits < 20:
                    deposits_added = 0
                    for days_ago in range(14):
                        deposit_date = today - timedelta(days=days_ago)
                        # 1-2 deposits per day
                        for _ in range(random.randint(1, 2)):
                            bank = random.choice(BANKS)
                            method = random.choice(DEPOSIT_METHODS)
                            amt = Decimal(random.randint(100000, 800000))
                            
                            dep = ShiftSettlement(
                                id=uuid4(),
                                shift_id=shift.id,
                                bank_name=bank["name"],
                                bank_account=bank["account"],
                                deposit_method=method,
                                amount=amt,
                                reference_number=f"REF-{random.randint(100000, 999999)}",
                                deposit_time=datetime.combine(deposit_date, time(18, 0)),
                                status=SettlementStatus.verified if days_ago > 1 else SettlementStatus.pending,
                            )
                            db.add(dep)
                            deposits_added += 1
                    await db.commit()
                    print(f"  ✅ Added {deposits_added} sample deposits")
                else:
                    print(f"  ℹ️  Deposits already exist ({existing_deposits} records)")
            except Exception as e:
                print(f"  ⚠️  Skipped: shift_settlements table issue ({type(e).__name__})")
                await db.rollback()
        else:
            print("  ⚠️  Skipped: No shift available (shifts table missing)")

        # Summary
        print("\n" + "=" * 60)
        print("🌱 Database seed complete!")
        print(f"\n📋 Station ID: {station.id}")
        print(f"   Station Name: {station.name}")
        print("\n⚠️  IMPORTANT: To use the app, link your Supabase user to this station:")
        print(f"""
   1. Go to Supabase SQL Editor
   2. Find your user ID: SELECT id, email FROM profiles;
   3. Link to station:
      INSERT INTO user_station_roles (id, user_id, station_id, role)
      VALUES (gen_random_uuid(), 'YOUR_USER_ID', '{station.id}', 'owner');
""")


if __name__ == "__main__":
    asyncio.run(seed_data())
