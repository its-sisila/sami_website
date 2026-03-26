"""
Search script to find the correct MOPS pricing instruments on Investing.com
"""

import cloudscraper
from bs4 import BeautifulSoup

scraper = cloudscraper.create_scraper()

# Search for MOPS related products
search_terms = [
    "Singapore MOPS Gasoil",
    "Singapore Gasoil Platts",
    "MOPS 92 Unleaded",
    "Singapore Mogas 92"
]

print("Searching Investing.com for MOPS products...")
print("=" * 60)

for term in search_terms:
    try:
        # Try to search
        url = f"https://www.investing.com/search/?q={term.replace(' ', '+')}"
        response = scraper.get(url, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            print(f"\n🔍 Search: {term}")
            print(f"Response length: {len(response.text)}")
            
            # Look for commodity links
            links = soup.find_all('a', href=lambda x: x and 'commodities' in x if x else False)
            if links:
                print(f"Found {len(links[:5])} commodity links")
                for link in links[:3]:
                    print(f"  - {link.get_text(strip=True)} -> {link.get('href')}")
        else:
            print(f"❌ {term}: Status {response.status_code}")
            
    except Exception as e:
        print(f"❌ {term}: {e}")

print("\n" + "=" * 60)
print("Manual search recommendation:")
print("1. Visit https://www.investing.com")
print("2. Search for 'Singapore Gasoil Platts' or 'MOPS'")
print("3. Find the historical data page")
print("4. Inspect the AJAX request to get the correct curr_id")
