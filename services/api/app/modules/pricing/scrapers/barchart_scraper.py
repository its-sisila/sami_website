"""
Scraper for Barchart.com
Fetches futures/swap prices for Singapore Mogas 92
"""

import cloudscraper
from bs4 import BeautifulSoup
import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)

import json

def scrape_barchart_price(url: str = "https://www.barchart.com/futures/quotes/J1NG26") -> float:
    """
    Scrape price from Barchart.com
    
    Args:
        url: URL of the quote page
        
    Returns:
        Price per barrel (float)
    """
    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.get(url)
        
        if response.status_code != 200:
            raise ValueError(f"Failed to fetch Barchart page: {response.status_code}")
            
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Method 1: Extraction from data-ng-init attribute (most robust for this site)
        # The price is passed to the Angular controller init method
        header_div = soup.find('div', attrs={'data-ng-controller': 'symbolHeaderCtrl'})
        
        if header_div and header_div.has_attr('data-ng-init'):
            init_str = header_div['data-ng-init']
            
            # format is: init({...json...})
            # Extract the JSON part
            match = re.search(r'init\((.*)\)', init_str)
            if match:
                json_str = match.group(1)
                try:
                    data = json.loads(json_str)
                    price_val = data.get('lastPrice')
                    
                    if price_val:
                        # Remove 's' suffix if present (settlement)
                        clean_price = str(price_val).replace('s', '').replace(',', '')
                        price = float(clean_price)
                        logger.info(f"Successfully scraped Barchart price from ng-init: {price}")
                        return price
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Failed to parse ng-init JSON: {e}")
        
        # Method 2: Fallback to page title or meta tags
        # <meta name="description" content="Singapore Mogas 92 ... price quote with latest real-time prices..." />
        # Sometimes title has price: "73.786 - Singapore Mogas 92..."
        
        raise ValueError("Could not find price element on Barchart page using any method")

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
