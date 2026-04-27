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
    ('bullish', 'bearish', 'neutral') matching the input order.
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
            '- "bullish" if it suggests fuel/oil prices are RISING or supply is tightening\n'
            '- "bearish" if it suggests fuel/oil prices are FALLING or supply is increasing\n'
            '- "neutral" if unclear or unrelated to price direction\n\n'
            f"Headlines:\n{numbered}\n\n"
            "Respond with ONLY a valid JSON array of strings in the same order, e.g.:\n"
            '["bullish","neutral","bearish"]\n'
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
            return [s if s in ("bullish", "bearish", "neutral") else "neutral" for s in sentiments]

        logger.warning("Sentiment array length mismatch, falling back to neutral")
        return fallback

    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        return fallback


# ---------------------------------------------------------------------------
# RSS Fetching
# ---------------------------------------------------------------------------
def fetch_google_news_rss(query: str, max_items: int = 5) -> list[dict]:
    """
    Fetch and parse Google News RSS for a specific query.
    Returns a list of dicts with title, link, pubDate, source, and image_url.
    """
    encoded_query = urllib.parse.quote(f"{query} when:7d")
    url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"

    news_items = []

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)

        for item in root.findall('.//item')[:max_items]:
            title = item.find('title').text if item.find('title') is not None else "No Title"
            link = item.find('link').text if item.find('link') is not None else ""
            pub_date_str = item.find('pubDate').text if item.find('pubDate') is not None else ""
            source = item.find('source').text if item.find('source') is not None else "Google News"

            # Try to extract image from description
            desc_el = item.find('description')
            desc_html = desc_el.text if desc_el is not None else ""
            image_url = _extract_image_url(desc_html)

            # Clean up title
            if f" - {source}" in title:
                title = title.replace(f" - {source}", "")

            news_items.append({
                "title": title,
                "link": link,
                "pubDate": pub_date_str,
                "source": source,
                "image_url": image_url,
                "sentiment": None,  # filled later by AI
            })

    except Exception as e:
        logger.error(f"Error fetching news for {query}: {e}")

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

    global_query = "Crude Oil OR Petrol Price OR Diesel Price OR OPEC"
    local_query = "Sri Lanka Petrol Price OR Sri Lanka Diesel Price OR CEYPETCO OR LIOC"

    global_news = fetch_google_news_rss(global_query, max_items=5)
    local_news = fetch_google_news_rss(local_query, max_items=5)

    # Batch AI sentiment for all headlines
    all_headlines = [n["title"] for n in global_news] + [n["title"] for n in local_news]
    all_sentiments = _analyse_sentiments(all_headlines)

    # Assign sentiments back
    for i, item in enumerate(global_news):
        item["sentiment"] = all_sentiments[i]
    offset = len(global_news)
    for i, item in enumerate(local_news):
        item["sentiment"] = all_sentiments[offset + i]

    result = {
        "global_news": global_news,
        "local_news": local_news,
    }

    _set_cache(result)
    return result
