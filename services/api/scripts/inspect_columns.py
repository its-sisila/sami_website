import cloudscraper
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

scraper = cloudscraper.create_scraper()

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

response = scraper.post("https://www.investing.com/instruments/HistoricalDataAjax", 
                       data=payload, headers=headers, timeout=10)

soup = BeautifulSoup(response.text, 'html.parser')
table = soup.find('table')

print("First 3 rows with ALL columns:")
print("=" * 80)

rows = table.find_all('tr')[:4]  # Header + 3 data rows

for i, row in enumerate(rows):
    cols = row.find_all(['th', 'td'])
    print(f"\nRow {i}:")
    for j, col in enumerate(cols):
        text = col.get_text(strip=True)
        print(f"  Column {j}: '{text}'")
