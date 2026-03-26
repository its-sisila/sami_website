import sys
import os
sys.path.append(os.getcwd())

from app.modules.pricing.scrapers.investing_scraper import scrape_investing_historical_prices

try:
    prices = scrape_investing_historical_prices('gasoil', days=30)
    print(f"\n✅ SUCCESS! Fetched {len(prices)} prices")
    if prices:
        print(f"First price: {prices[0]}")
        print(f"Last price: {prices[-1]}")
except Exception as e:
    print(f"\n❌ FAILED: {e}")
    import traceback
    traceback.print_exc()
