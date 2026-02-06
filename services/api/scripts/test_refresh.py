import sys
import os
import asyncio
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv()

from app.core.database import async_session_factory
from app.modules.pricing.service import refresh_all_pricing_data

async def test():
    async with async_session_factory() as db:
        print("Testing refresh_all_pricing_data...")
        try:
            results = await refresh_all_pricing_data(db)
            print(f"Results: {results}")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test())
