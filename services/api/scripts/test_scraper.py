import cloudscraper
import logging

logging.basicConfig(level=logging.INFO)

url = "https://www.investing.com/instruments/HistoricalDataAjax"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.investing.com/commodities/nymex-singapore-gasoil-platts-c1-futures-historical-data",
}
payload = {
    "curr_id": "959209",
    "st_date": "01/01/2026",
    "end_date": "02/01/2026",
    "interval_sec": "Daily",
    "action": "historical_data"
}

try:
    scraper = cloudscraper.create_scraper()
    response = scraper.post(url, data=payload, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Content length: {len(response.text)}")
    if response.status_code == 200:
        print("Success!")
        print(response.text[:200])
    else:
        print("Failed.")
except Exception as e:
    print(f"Error: {e}")
