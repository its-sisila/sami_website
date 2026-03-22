"""
Ceypetco Scraper — Fetches current gazette fuel prices from ceypetco.gov.lk

Scrapes the historical-prices page which contains an HTML table with
columns: Date | LP 95 | LP 92 | LAD | LSD | LK | LIK | ...

The first data row is the *latest* gazette revision, which gives us
the current Maximum Retail Price (MRP) for each product.
"""

import logging
from typing import Dict, Optional

import cloudscraper
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

CEYPETCO_HISTORICAL_URL = "https://ceypetco.gov.lk/historical-prices/"

# Column-index mapping (0-indexed, skipping the Date column)
# Date(0) | LP 95(1) | LP 92(2) | LAD(3) | LSD(4) | LK(5) | LIK(6) | ...
_COL_MAP = {
    "petrol_95": 1,
    "petrol_92": 2,
    "diesel":    3,   # LAD = Lanka Auto Diesel
    "super_diesel": 4,  # LSD = Lanka Super Diesel 4-Star
    "kerosene":  5,
}


def scrape_ceypetco_prices() -> Dict[str, float]:
    """Scrape the latest gazette fuel prices from Ceypetco.

    Returns:
        Dictionary mapping product keys to their current MRP (LKR/litre).
        Example: {"petrol_92": 292.0, "diesel": 277.0, ...}

    Raises:
        ValueError: If the page structure is unexpected or no data is found.
        Exception: On network or parsing errors.
    """
    scraper = cloudscraper.create_scraper()
    response = scraper.get(CEYPETCO_HISTORICAL_URL)

    if response.status_code != 200:
        raise ValueError(f"Ceypetco returned HTTP {response.status_code}")

    soup = BeautifulSoup(response.text, "html.parser")
    tables = soup.find_all("table")

    if not tables:
        raise ValueError("No tables found on Ceypetco historical-prices page")

    # First table is the main price table
    table = tables[0]
    rows = table.find_all("tr")

    if len(rows) < 2:
        raise ValueError("Price table has no data rows")

    # First data row (index 1) = latest gazette revision
    latest_row = rows[1]
    cells = [td.get_text(strip=True) for td in latest_row.find_all("td")]

    if len(cells) < 6:
        raise ValueError(f"Expected ≥6 columns, got {len(cells)}: {cells}")

    prices: Dict[str, float] = {}
    for product, col_idx in _COL_MAP.items():
        try:
            raw = cells[col_idx].replace(",", "")
            prices[product] = float(raw)
        except (IndexError, ValueError) as exc:
            logger.warning("Could not parse %s (col %d): %s", product, col_idx, exc)

    effective_date = cells[0] if cells else "unknown"
    logger.info(
        "Ceypetco prices (effective %s): %s",
        effective_date,
        {k: f"Rs.{v:.0f}" for k, v in prices.items()},
    )

    return prices


def get_current_mrp(product: str) -> Optional[float]:
    """Convenience wrapper — get the current MRP for a single product.

    Args:
        product: One of 'petrol_92', 'diesel', 'petrol_95', etc.

    Returns:
        Current MRP in LKR/litre, or None if unavailable.
    """
    try:
        prices = scrape_ceypetco_prices()
        return prices.get(product)
    except Exception as exc:
        logger.error("Failed to scrape Ceypetco: %s", exc)
        return None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    prices = scrape_ceypetco_prices()
    for name, price in prices.items():
        print(f"  {name}: Rs. {price:.2f}/L")
