"""
Script to seed pricing data by triggering a full refresh
"""

import asyncio
import sys
import os
import logging
from datetime import date, timedelta
from sqlalchemy import select, delete

# Add parent directory to path to allow importing app
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv()

from app.core.database import async_session_factory
from app.modules.pricing.service import refresh_all_pricing_data
from app.modules.pricing.models import MonthlyMOPSAverage, ExchangeRate, ProductType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_pricing():
    async with async_session_factory() as db:
        echo = logger.info
        echo("🌱 Starting pricing data seed...")
        echo("=" * 60)
        
        echo("Clearing existing data...")
        today = date.today()
        
        # Delete today's exchange rate if exists
        await db.execute(delete(ExchangeRate).where(ExchangeRate.date == today))
        
        # Delete today's averages if exist
        await db.execute(delete(MonthlyMOPSAverage).where(MonthlyMOPSAverage.calculation_date == today))
        
        await db.commit()
        echo("  ✅ Cleared existing data for today")
        
        echo("Fetching live data...")
        results = await refresh_all_pricing_data(db)
        
        if results['success']:
            echo(f"  ✅ Mogas Records: {results['mogas_records']}")
            echo(f"  ✅ Gasoil Records: {results['gasoil_records']}")
            
            # Exchange Rate
            exchange_rate = results.get('exchange_rate')
            if exchange_rate is not None:
                echo(f"  ✅ Exchange Rate: {exchange_rate:.2f} LKR/USD")
            else:
                echo(f"  ⚠️ Exchange Rate: No data")
            
            mogas_avg = results.get('mogas_average')
            gasoil_avg = results.get('gasoil_average')
            
            if mogas_avg is not None:
                echo(f"  ✅ Mogas Average: ${mogas_avg:.2f}")
            else:
                echo(f"  ⚠️ Mogas Average: No data")
                
            if gasoil_avg is not None:
                echo(f"  ✅ Gasoil Average: ${gasoil_avg:.2f}")
            else:
                echo(f"  ⚠️ Gasoil Average: No data")
                
            echo("\n✅ Pricing data seeded successfully!")
        else:
            echo("  ❌ Live fetch failed. No data seeded.")
            echo(f"  Errors: {results.get('errors', [])}")
            
if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_pricing())
