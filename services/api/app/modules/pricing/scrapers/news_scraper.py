import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import logging
import json
import os
import time
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 15-minute TTL Cache
# ---------------------------------------------------------------------------
_news_cache: dict = {"data": None, "ts": 0}
_CACHE_TTL = 900  # 15 minutes in seconds


def _get_cached_news() -> Optional[dict]:
    """Return cached news if fresh, else None."""
    if _news_cache["data"] and (time.time() - _news_cache["ts"]) < _CACHE_TTL:
        logger.info("Returning cached market news (age: %.0fs)", time.time() - _news_cache["ts"])
        return _news_cache["data"]
    return None


def _set_cache(data: dict) -> None:
    _news_cache["data"] = data
    _news_cache["ts"] = time.time()


# ---------------------------------------------------------------------------
# Image extraction helper
# ---------------------------------------------------------------------------
def _extract_image_url(description_html: str) -> Optional[str]:
    """Pull first <img src> from RSS description HTML."""
    if not description_html:
        return None
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(description_html, "html.parser")
        img = soup.find("img")
        if img and img.get("src"):
            return img["src"]
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# AI Sentiment Analysis
# ---------------------------------------------------------------------------
def _analyse_sentiments(headlines: list[str]) -> list[str]:
    """
    Batch-analyse headlines via Gemini. Returns list of sentiments
    ('likely increase', 'likely decrease', 'neutral') matching the input order.
    Falls back to all-neutral on any failure.
    """
    fallback = ["neutral"] * len(headlines)
    if not headlines:
        return fallback

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("No Gemini API key found — skipping sentiment analysis")
        return fallback

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        numbered = "\n".join(f"{i}. {h}" for i, h in enumerate(headlines))
        prompt = (
            "You are analysing energy/fuel market news headlines for a fuel station owner.\n"
            "For EACH headline below, classify the sentiment as:\n"
            '- "likely increase" if it suggests fuel/oil prices are RISING or supply is tightening\n'
            '- "likely decrease" if it suggests fuel/oil prices are FALLING or supply is increasing\n'
            '- "neutral" if unclear or unrelated to price direction\n\n'
            f"Headlines:\n{numbered}\n\n"
            "Respond with ONLY a valid JSON array of strings in the same order, e.g.:\n"
            '["likely increase","neutral","likely decrease"]\n'
            "No explanation, no markdown — just the JSON array."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        raw = response.text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        sentiments = json.loads(raw)
        if isinstance(sentiments, list) and len(sentiments) == len(headlines):
            return [s if s in ("likely increase", "likely decrease", "neutral") else "neutral" for s in sentiments]

        logger.warning("Sentiment array length mismatch, falling back to neutral")
        return fallback

    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        return fallback


def fetch_gnews(query: str, api_key: str, max_items: int = 5) -> list[dict]:
    """
    Fetch structured news from GNews API.
    Works in production without bot blocks.
    """
    news_items = []
    
    # URL encode the query
    encoded_query = urllib.parse.quote(query)
    url = f"https://gnews.io/api/v4/search?q={encoded_query}&lang=en&max={max_items}&apikey={api_key}"

    try:
        import httpx
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            response.raise_for_status()
            data = response.json()

        articles = data.get("articles", [])
        logger.info(f"GNews API SUCCESS: Fetched {len(articles)} articles.")

        for article in articles:
            news_items.append({
                "title": article.get("title", "No Title"),
                "link": article.get("url", ""),
                "pubDate": article.get("publishedAt", ""),
                "source": article.get("source", {}).get("name", "GNews API"),
                "image_url": article.get("image"),
                "sentiment": None,  # filled later by AI
            })

    except Exception as e:
        error_msg = str(e)
        if hasattr(e, 'response') and e.response is not None:
            error_msg = f"{e} - Response Body: {e.response.text}"
        logger.error(f"GNews API ERROR for query '{query}': {error_msg}")

    return news_items


    return news_items


# ---------------------------------------------------------------------------
# RSS Fallback (No API Key Required)
# ---------------------------------------------------------------------------
def fetch_official_rss(url: str, keywords: list[str], source_name: str) -> list[dict]:
    """
    Fetch and parse a standard RSS feed as a fallback.
    Filters items based on keywords in title or description.
    """
    news_items = []
    try:
        import httpx
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
        }
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            xml_data = response.text

        root = ET.fromstring(xml_data)  # nosec B314

        for item in root.findall('.//item'):
            title_el = item.find('title')
            desc_el = item.find('description')
            
            title = title_el.text if title_el is not None and title_el.text else ""
            desc = desc_el.text if desc_el is not None and desc_el.text else ""
            
            # Check keywords (case-insensitive)
            content = (title + " " + desc).lower()
            if not any(kw.lower() in content for kw in keywords):
                continue
                
            link_el = item.find('link')
            link = link_el.text if link_el is not None and link_el.text else ""
            
            pub_date_el = item.find('pubDate')
            pub_date_str = pub_date_el.text if pub_date_el is not None and pub_date_el.text else ""
            
            image_url = _extract_image_url(desc)

            news_items.append({
                "title": title,
                "link": link,
                "pubDate": pub_date_str,
                "source": source_name,
                "image_url": image_url,
                "sentiment": None,
            })
    except Exception as e:
        logger.error(f"Error fetching fallback RSS from {url}: {e}")

    return news_items

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def get_latest_market_news() -> dict:
    """
    Fetches both global and Sri Lanka specific energy news,
    with AI sentiment analysis and 15-min caching.
    """
    # Check cache first
    cached = _get_cached_news()
    if cached:
        return cached

    api_key = os.getenv("GNEWS_API_KEY")
    all_news = []

    if api_key:
        # Wrap phrases in quotes so GNews doesn't treat spaces as AND operators, 
        # which breaks the OR precedence and results in 0 matches.
        query = '"Crude Oil" OR Petrol OR Diesel OR OPEC OR CEYPETCO OR LIOC OR "Sri Lanka Fuel"'
        all_news = fetch_gnews(query, api_key, max_items=10)

    # Fallback to official RSS if GNews failed or API key missing
    if not all_news:
        logger.warning("GNews failed or missing key. Falling back to Official RSS feeds.")
        keywords = ["oil", "crude", "petrol", "diesel", "opec", "energy", "fuel", "ceypetco", "lioc", "cpc"]
        
        # We wrap in try/except because some feeds might fail due to bot protection
        try:
            all_news.extend(fetch_official_rss("https://search.cnbc.com/rs/search/combinedcms/view.xml?id=10000846", keywords, "CNBC Energy"))
        except Exception:
            pass
        try:
            all_news.extend(fetch_official_rss("http://feeds.bbci.co.uk/news/business/rss.xml", keywords, "BBC Business"))
        except Exception:
            pass

        # Limit fallback news to top 10
        all_news = all_news[:10]

    # Batch AI sentiment for all headlines
    all_headlines = [n["title"] for n in all_news]
    all_sentiments = _analyse_sentiments(all_headlines)

    # Assign sentiments back
    for i, item in enumerate(all_news):
        item["sentiment"] = all_sentiments[i]

    result = {
        "news": all_news
    }

    _set_cache(result)
    return result
