"""
Exchange rate scraper using Yahoo Finance
Fetches USD/LKR exchange rate for pricing calculations
"""

import yfinance as yf
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def scrape_exchange_rate() -> float:
    """
    Fetch current USD/LKR exchange rate from Yahoo Finance
    
    Returns:
        Current exchange rate (LKR per 1 USD)
    
    Raises:
        Exception if scraping fails
    """
    try:
        # Fetch USD/LKR ticker from Yahoo Finance
        ticker = yf.Ticker("LKR=X")
        
        # Get the most recent data
        hist = ticker.history(period="1d")
        
        if hist.empty:
            raise ValueError("No exchange rate data available from Yahoo Finance")
        
        # Get the closing price (most recent)
        rate = hist['Close'].iloc[-1]
        
        logger.info(f"Successfully fetched USD/LKR rate: {rate:.2f}")
        return float(rate)
        
    except Exception as e:
        logger.error(f"Failed to scrape exchange rate from Yahoo Finance: {e}")
        raise


def get_exchange_rate_with_fallback(fallback_rate: float = 300.0) -> float:
    """
    Fetch exchange rate with fallback to default value
    
    Args:
        fallback_rate: Default rate to use if scraping fails
    
    Returns:
        Exchange rate (scraped or fallback)
    """
    try:
        return scrape_exchange_rate()
    except Exception as e:
        logger.warning(f"Using fallback exchange rate {fallback_rate}: {e}")
        return fallback_rate
