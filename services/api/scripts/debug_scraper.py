"""
Debug script to test cloudscraper with detailed logging
"""

import cloudscraper
import logging
from datetime import datetime, timedelta

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

url = "https://www.investing.com/instruments/HistoricalDataAjax"

end_date = datetime.now()
start_date = end_date - timedelta(days=30)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.investing.com/commodities/nymex-singapore-gasoil-platts-c1-futures-historical-data",
    "Accept": "text/plain, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
}

payload = {
    "curr_id": "959209",  # Gasoil
    "st_date": start_date.strftime("%m/%d/%Y"),
    "end_date": end_date.strftime("%m/%d/%Y"),
    "interval_sec": "Daily",
    "action": "historical_data"
}

try:
    logger.info("Creating cloudscraper...")
    scraper = cloudscraper.create_scraper()
    
    logger.info(f"Sending request to {url}")
    logger.info(f"Payload: {payload}")
    
    response = scraper.post(url, data=payload, headers=headers, timeout=10)
    
    logger.info(f"Response status: {response.status_code}")
    logger.info(f"Response length: {len(response.text)}")
    
    if response.status_code == 200:
        logger.info("✅ SUCCESS!")
        # Try to parse JSON
        try:
            data = response.json()
            logger.info(f"JSON keys: {data.keys() if isinstance(data, dict) else 'Not a dict'}")
            if isinstance(data, dict) and 'text' in data:
                logger.info(f"HTML content preview: {data['text'][:200]}")
        except Exception as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.info(f"Raw content preview: {response.text[:500]}")
    else:
        logger.error(f"❌ FAILED with status {response.status_code}")
        logger.error(f"Response: {response.text[:500]}")
        
except Exception as e:
    logger.error(f"❌ Exception occurred: {e}", exc_info=True)
