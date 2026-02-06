import sys
import os
sys.path.append(os.getcwd())

from app.modules.pricing.scrapers.investing_scraper import scrape_investing_historical_prices

try:
    # Temporarily modify to show raw prices
    import cloudscraper
    from bs4 import BeautifulSoup
    from datetime import datetime, timedelta
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.investing.com/commodities/nymex-singapore-gasoil-platts-c1-futures-historical-data",
    }
    
    payload = {
        "curr_id": "959209",
        "st_date": start_date.strftime("%m/%d/%Y"),
        "end_date": end_date.strftime("%m/%d/%Y"),
        "interval_sec": "Daily",
        "action": "historical_data"
    }
    
    scraper = cloudscraper.create_scraper()
    response = scraper.post("https://www.investing.com/instruments/HistoricalDataAjax", 
                           data=payload, headers=headers, timeout=10)
    
    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table')
    rows = table.find_all('tr')[1:3]  # Get first 2 data rows
    
    for row in rows:
        cols = row.find_all('td')
        if len(cols) >= 2:
            date_str = cols[0].get_text(strip=True)
            price_str = cols[1].get_text(strip=True)
            print(f"Date: {date_str}")
            print(f"Raw price text: '{price_str}'")
            price_clean = price_str.replace(',', '')
            price_num = float(price_clean)
            print(f"Raw numeric: {price_num}")
            print(f"Divided by 42: {price_num / 42:.2f}")
            print(f"Divided by 100: {price_num / 100:.2f}")
            print(f"Times 42 / 100: {price_num * 42 / 100:.2f}")
            print()
            
except Exception as e:
    print(f"\n❌ FAILED: {e}")
    import traceback
    traceback.print_exc()
