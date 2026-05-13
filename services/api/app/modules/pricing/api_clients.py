import os
import httpx
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

TWELVE_DATA_API_KEY = os.getenv("TWELVE_DATA_API_KEY")
EIA_API_KEY = os.getenv("EIA_API_KEY")

async def get_exchange_rate_history(days: int = 30) -> tuple[Optional[float], List[Dict[str, Any]], str]:
    """
    Fetch USD/LKR exchange rate using Twelve Data, fallback to yfinance.
    Returns: (current_price, history_list, source)
    """
    history = []
    current_price = None
    source = "Twelve Data"
    
    # 1. Try Twelve Data
    if TWELVE_DATA_API_KEY:
        try:
            url = f"https://api.twelvedata.com/time_series?symbol=USD/LKR&interval=1day&outputsize={days}&apikey={TWELVE_DATA_API_KEY}"
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                data = resp.json()
                
                if "values" in data:
                    values = data["values"]
                    if values:
                        current_price = float(values[0]["close"])
                        for v in reversed(values):
                            history.append({
                                "date": v["datetime"],
                                "price": float(v["close"])
                            })
                        return current_price, history, source
                else:
                    logger.warning(f"Twelve Data failed: {data}")
        except Exception as e:
            logger.warning(f"Twelve Data exception: {e}")
    else:
        logger.info("TWELVE_DATA_API_KEY not set. Falling back to yfinance.")

    # 2. Fallback to yfinance
    source = "Yahoo Finance (Fallback)"
    try:
        import yfinance as yf
        ticker = yf.Ticker("USDLKR=X")
        hist = ticker.history(period=f"{days}d")
        if not hist.empty:
            current_price = round(float(hist["Close"].iloc[-1]), 4)
            for idx, row in hist.iterrows():
                history.append({
                    "date": idx.strftime("%Y-%m-%d"),
                    "price": round(float(row["Close"]), 4)
                })
            return current_price, history, source
    except Exception as e:
        logger.error(f"yfinance exchange rate fallback failed: {e}")

    return None, [], source


async def get_brent_crude_history(days: int = 30) -> tuple[Optional[float], List[Dict[str, Any]], str]:
    """
    Fetch Brent Crude oil price using EIA API v2, fallback to yfinance.
    Returns: (current_price, history_list, source)
    """
    history = []
    current_price = None
    source = "U.S. EIA API"

    # 1. Try EIA API
    if EIA_API_KEY:
        try:
            # EIA provides Brent Spot Price.
            # endpoint: https://api.eia.gov/v2/petroleum/pri/spt/data/
            # params: api_key, frequency=daily, data[0]=value, facets[series][]=RBRTE
            url = "https://api.eia.gov/v2/petroleum/pri/spt/data/"
            start_date = (datetime.utcnow() - timedelta(days=days + 10)).strftime("%Y-%m-%d")
            
            params = {
                "api_key": EIA_API_KEY,
                "frequency": "daily",
                "data[0]": "value",
                "facets[series][]": "RBRTE", # Brent Europe Spot Price
                "start": start_date,
                "sort[0][column]": "period",
                "sort[0][direction]": "asc"
            }
            
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url, params=params)
                data = resp.json()
                
                if "response" in data and "data" in data["response"]:
                    records = data["response"]["data"]
                    if records:
                        for r in records:
                            # format is usually YYYY-MM-DD
                            history.append({
                                "date": r["period"],
                                "price": float(r["value"])
                            })
                        # Take only the last 'days' elements
                        history = history[-days:]
                        if history:
                            current_price = history[-1]["price"]
                        return current_price, history, source
                else:
                    logger.warning(f"EIA API failed: {data}")
        except Exception as e:
            logger.warning(f"EIA API exception: {e}")
    else:
        logger.info("EIA_API_KEY not set. Falling back to yfinance.")

    # 2. Fallback to yfinance
    source = "Yahoo Finance (Fallback)"
    try:
        import yfinance as yf
        ticker = yf.Ticker("BZ=F")
        hist = ticker.history(period=f"{days}d")
        if not hist.empty:
            current_price = round(float(hist["Close"].iloc[-1]), 2)
            for idx, row in hist.iterrows():
                history.append({
                    "date": idx.strftime("%Y-%m-%d"),
                    "price": round(float(row["Close"]), 2)
                })
            return current_price, history, source
    except Exception as e:
        logger.error(f"yfinance brent crude fallback failed: {e}")

    return None, [], source
