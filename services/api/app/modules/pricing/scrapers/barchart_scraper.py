"""
Scraper for Barchart.com
Fetches futures/swap prices for Singapore Mogas 92

Uses auto-rolling contract month codes so the URL never expires.
Barchart contract format: J1N{month_code}{year_2digit}
Month codes: F=Jan, G=Feb, H=Mar, J=Apr, K=May, M=Jun,
             N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec
"""

import cloudscraper
from bs4 import BeautifulSoup
import logging
import re
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# Barchart futures month codes
_MONTH_CODES = {
    1: "F", 2: "G", 3: "H", 4: "J", 5: "K", 6: "M",
    7: "N", 8: "Q", 9: "U", 10: "V", 11: "X", 12: "Z",
}


def _get_active_contract_url() -> str:
    """
    Build the Barchart URL for the nearest active (front-month) contract.

    Futures contracts typically expire near the start of the contract month,
    so we target the NEXT month's contract to avoid expired tickers.
    """
    now = datetime.utcnow()
    # Target next month's contract (current month may have already expired)
    month = now.month + 1
    year = now.year
    if month > 12:
        month = 1
        year += 1

    code = _MONTH_CODES[month]
    year_2 = str(year)[-2:]
    ticker = f"J1N{code}{year_2}"
    url = f"https://www.barchart.com/futures/quotes/{ticker}"
    logger.info(f"Using Barchart contract ticker: {ticker} (url: {url})")
    return url


def scrape_barchart_price(url: str | None = None) -> float:
    """
    Scrape Singapore Mogas 92 price from Barchart.com

    If no URL is given, automatically builds the URL for the current
    front-month futures contract.

    Args:
        url: Optional override URL. If None, auto-detects active contract.

    Returns:
        Price per barrel (float)

    Raises:
        ValueError: If the price cannot be extracted.
    """
    if url is None:
        url = _get_active_contract_url()

    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.get(url)

        if response.status_code != 200:
            raise ValueError(f"Failed to fetch Barchart page: {response.status_code}")

        soup = BeautifulSoup(response.text, 'lxml')

        # Method 1: Extraction from data-ng-init attribute (most robust)
        header_div = soup.find('div', attrs={'data-ng-controller': 'symbolHeaderCtrl'})

        if header_div and header_div.has_attr('data-ng-init'):
            init_str = header_div['data-ng-init']

            match = re.search(r'init\((.*)\)', init_str)
            if match:
                json_str = match.group(1)
                try:
                    data = json.loads(json_str)
                    price_val = data.get('lastPrice')

                    # Guard against 'N/A' or empty/null values
                    if price_val is None or str(price_val).strip().upper() == 'N/A':
                        logger.warning(
                            f"Barchart returned lastPrice='{price_val}' — "
                            f"contract may be expired or not yet trading"
                        )
                        raise ValueError(
                            f"Barchart lastPrice is '{price_val}' (contract may be expired). "
                            f"URL: {url}"
                        )

                    # Remove 's' suffix if present (settlement marker)
                    clean_price = str(price_val).replace('s', '').replace(',', '')
                    price = float(clean_price)
                    logger.info(f"Successfully scraped Barchart price from ng-init: {price}")
                    return price
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse ng-init JSON: {e}")
                except ValueError as e:
                    # Re-raise ValueError from float() or our explicit N/A check
                    raise

        # Method 2: Try the previous month's contract (maybe next-month hasn't started)
        # This is only attempted if the caller used auto-detection (url was None originally)
        # We avoid infinite recursion by not retrying a second time.

        raise ValueError(f"Could not find valid price on Barchart page. URL: {url}")

    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error scraping Barchart: {e}")
        raise


if __name__ == "__main__":
    # Test the scraper
    logging.basicConfig(level=logging.INFO)
    try:
        price = scrape_barchart_price()
        print(f"Scraped Price: {price}")
    except Exception as e:
        print(f"Failed: {e}")
