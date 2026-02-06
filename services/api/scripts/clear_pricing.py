"""
Clear all pricing data from database
"""

import asyncio
import os
import sys
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv()

from app.core.database import async_session_factory
from sqlalchemy import delete
from app.modules.pricing.models import DailyMOPSPrice, MonthlyMOPSAverage, ExchangeRate

async def clear_all():
    async with async_session_factory() as db:
        print("🗑️  Clearing all pricing data...")
        
        # Delete all daily prices
        result1 = await db.execute(delete(DailyMOPSPrice))
        print(f"  Deleted {result1.rowcount} daily prices")
        
        # Delete all monthly averages  
        result2 = await db.execute(delete(MonthlyMOPSAverage))
        print(f"  Deleted {result2.rowcount} monthly averages")
        
        # Delete all exchange rates
        result3 = await db.execute(delete(ExchangeRate))
        print(f"  Deleted {result3.rowcount} exchange rates")
        
        await db.commit()
        print("✅ All pricing data cleared!")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(clear_all())
