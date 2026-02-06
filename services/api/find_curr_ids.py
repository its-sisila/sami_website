"""
Helper script to find curr_id values from Investing.com pages
Run this script to extract the product IDs needed for the scraper

Usage:
    python find_curr_ids.py
"""

import requests
from bs4 import BeautifulSoup
import json
import re

def find_curr_id_from_url(url, product_name):
    """
    Fetch the page and try to extract curr_id from the HTML
    """
    print(f"\n{'='*60}")
    print(f"Searching for {product_name}")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    try:
        # Fetch the page
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Method 1: Look for __NEXT_DATA__ script tag
        soup = BeautifulSoup(response.text, 'html.parser')
        script = soup.find('script', {'id': '__NEXT_DATA__'})
        
        if script:
            try:
                data = json.loads(script.string)
                # Try to find instrument_id or pairId in the data
                data_str = json.dumps(data)
                
                # Search for common patterns
                patterns = [
                    r'"pairId":(\d+)',
                    r'"instrument_id":(\d+)',
                    r'"curr_id":(\d+)',
                    r'"id":(\d+)'
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, data_str)
                    if matches:
                        print(f"✓ Found potential ID using pattern '{pattern}': {matches[0]}")
                        return matches[0]
            except:
                pass
        
        # Method 2: Search for curr_id in the raw HTML
        curr_id_match = re.search(r'curr_id["\s:=]+(\d+)', response.text)
        if curr_id_match:
            print(f"✓ Found curr_id in HTML: {curr_id_match.group(1)}")
            return curr_id_match.group(1)
        
        # Method 3: Search for pairId
        pair_id_match = re.search(r'pairId["\s:=]+(\d+)', response.text)
        if pair_id_match:
            print(f"✓ Found pairId in HTML: {pair_id_match.group(1)}")
            return pair_id_match.group(1)
        
        print("✗ Could not find curr_id automatically")
        print("  → Try searching the page source manually for 'pairId' or 'curr_id'")
        return None
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return None


def main():
    print("\n" + "="*60)
    print("Investing.com curr_id Finder")
    print("="*60)
    
    # URLs to check (you may need to find the correct URLs first)
    products = [
        {
            "name": "Singapore Mogas 92",
            "search_terms": ["singapore mogas 92", "singapore mogas unleaded 92", "mogas 92 platts"],
            "url": None  # Will be filled in
        },
        {
            "name": "Singapore Gasoil",
            "search_terms": ["singapore gasoil", "gasoil platts", "singapore gasoil platts"],
            "url": "https://www.investing.com/commodities/singapore-gasoil-platts-futures"
        }
    ]
    
    # Try to find the URLs first by searching
    print("\nStep 1: Finding product pages...")
    print("Note: You may need to manually navigate to investing.com and find the correct URLs")
    print("\nSuggested searches on Investing.com:")
    for product in products:
        if not product["url"]:
            print(f"\n  {product['name']}:")
            for term in product["search_terms"]:
                print(f"    - Search: '{term}'")
    
    print("\n\nStep 2: Once you have the URLs, update this script and run again.")
    print("\nOr, manually find curr_id:")
    print("  1. Go to the product page on Investing.com")
    print("  2. Open DevTools (F12) → Network tab")
    print("  3. Refresh the page")
    print("  4. Look for requests to 'api.investing.com/api/financialdata'")
    print("  5. The number in the URL is the curr_id")
    
    # Try the Gasoil URL if we have it
    result = {}
    for product in products:
        if product["url"]:
            curr_id = find_curr_id_from_url(product["url"], product["name"])
            if curr_id:
                result[product["name"]] = curr_id
    
    # Print results
    if result:
        print("\n" + "="*60)
        print("RESULTS")
        print("="*60)
        for name, curr_id in result.items():
            print(f"{name}: {curr_id}")
        
        print("\n" + "="*60)
        print("Next steps:")
        print("="*60)
        print("Update the file: services/api/app/modules/pricing/scrapers/investing_scraper.py")
        print("\nReplace these lines (around line 23-24):")
        for name, curr_id in result.items():
            if "Mogas" in name:
                print(f'MOGAS_92_CURR_ID = "{curr_id}"')
            elif "Gasoil" in name:
                print(f'GASOIL_CURR_ID = "{curr_id}"')
    else:
        print("\n✗ No IDs found automatically. Please find them manually.")


if __name__ == "__main__":
    main()
