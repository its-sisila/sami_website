import asyncio
import os
import sys
sys.path.append(os.getcwd())

from app.core.database import async_session_factory
from sqlalchemy import select
from app.modules.pricing.models import MonthlyMOPSAverage, DailyMOPSPrice

async def check():
    async with async_session_factory() as db:
        # Check monthly averages
        result = await db.execute(select(MonthlyMOPSAverage))
        avgs = result.scalars().all()
        print('Monthly Averages:')
        for a in avgs:
            print(f'  {a.product_type}: ${a.average_price_usd_per_barrel:.2f}')
        
        # Check daily prices
        result2 = await db.execute(select(DailyMOPSPrice).limit(5))
        daily = result2.scalars().all()
        print('\nDaily Prices (first 5):')
        for d in daily:
            print(f'  {d.date} {d.product_type}: ${d.price_usd_per_barrel:.2f}')

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
