"""
Investing.com Scraper for Singapore MOPS Prices

Scrapes historical Singapore Mogas 92 and Gasoil futures prices from Investing.com
using the internal AJAX API endpoint.

Based on: docs/stage_3_price_formula.md Section 4.2.2
"""

import cloudscraper
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


# Product ID mapping (extracted from Investing.com __NEXT_DATA__)
PRODUCT_IDS = {
    'mogas_92': '960594',  # Singapore Mogas 92 Unleaded - May need verification
    'gasoil': '1187562',   # NYMEX Singapore GASOIL (SGBc1) - Verified 2026-02-06
}

AJAX_URL = "https://www.investing.com/instruments/HistoricalDataAjax"


def scrape_investing_historical_prices(
    product: str,
    days: int = 30
) -> List[Dict[str, any]]:
    """
    Scrape historical prices from Investing.com
    
    Args:
        product: 'mogas_92' or 'gasoil'
        days: Number of days to fetch (default 30)
        
    Returns:
        List of {date: datetime, price: float} dicts
        
    Raises:
        ValueError: If product not recognized
        requests.RequestException: If scraping fails
    """
    if product not in PRODUCT_IDS:
        raise ValueError(f"Unknown product: {product}. Must be 'mogas_92' or 'gasoil'")
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Headers to mimic browser request (CRITICAL for bypassing blocks)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": f"https://www.investing.com/commodities/nymex-singapore-gasoil-platts-c1-futures-historical-data",
        "Accept": "text/plain, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
    }
    
    payload = {
        "curr_id": PRODUCT_IDS[product],
        "st_date": start_date.strftime("%m/%d/%Y"),
        "end_date": end_date.strftime("%m/%d/%Y"),
        "interval_sec": "Daily",
        "action": "historical_data"
    }
    
    logger.info(f"Scraping {product} from {start_date.date()} to {end_date.date()}")
    
    try:
        # Use cloudscraper to bypass Cloudflare protection
        scraper = cloudscraper.create_scraper()
        response = scraper.post(AJAX_URL, data=payload, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse response - could be JSON with HTML in 'text' field or HTML directly
        html_table = ''
        try:
            data = response.json()
            html_table = data.get('text', '')
        except Exception:
            # Response is HTML directly, not JSON
            html_table = response.text
        
        if not html_table:
            logger.error("No data returned from Investing.com")
            return []
        
        soup = BeautifulSoup(html_table, 'html.parser')
        prices = []
        
        # Parse table rows
        table = soup.find('table')
        if not table:
            logger.error("No table found in response")
            return []
        
        rows = table.find_all('tr')[1:]  # Skip header row
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 2:
                try:
                    # Extract date and price
                    date_str = cols[0].get_text(strip=True)
                    price_str = cols[1].get_text(strip=True).replace(',', '')
                    
                    # Parse date (format: "Jan 28, 2026" or similar)
                    date_obj = datetime.strptime(date_str, "%b %d, %Y")
                    price_usd_per_barrel = float(price_str)
                    
                    prices.append({
                        'date': date_obj,
                        'price': price_usd_per_barrel
                    })
                except (ValueError, IndexError) as e:
                    logger.warning(f"Failed to parse row: {e}")
                    continue
        
        logger.info(f"Successfully scraped {len(prices)} price records for {product}")
        return prices
        
    except Exception as e:
        logger.error(f"Request failed: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during scraping: {e}")
        raise


def calculate_average_price(prices: List[Dict[str, any]]) -> Optional[float]:
    """
    Calculate the average price from a list of price records
    
    Args:
        prices: List of {date, price} dicts
        
    Returns:
        Average price or None if empty list
    """
    if not prices:
        return None
    
    total = sum(p['price'] for p in prices)
    average = total / len(prices)
    
    logger.info(f"Calculated average from {len(prices)} records: {average:.2f}")
    return average


# Test function for manual verification
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Test scraping
    try:
        gasoil_prices = scrape_investing_historical_prices('gasoil', days=30)
        if gasoil_prices:
            avg = calculate_average_price(gasoil_prices)
            print(f"Gasoil 30-day average: ${avg:.2f}/barrel")
            print(f"Sample data: {gasoil_prices[:3]}")
    except Exception as e:
        print(f"Error: {e}")
