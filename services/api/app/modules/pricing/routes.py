"""
API routes for pricing data endpoints
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.pricing.schemas import PricingDataResponse, MarketNewsResponse
from app.modules.pricing.service import get_latest_pricing_data, refresh_all_pricing_data
from app.modules.pricing.agent import market_analyst
from app.modules.pricing.scrapers.barchart_scraper import scrape_barchart_price
from app.modules.pricing.scrapers.investing_scraper import scrape_investing_historical_prices
from app.modules.pricing.scrapers.exchange_scraper import scrape_exchange_rate

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request / Response schemas for the AI analyst endpoint
# ---------------------------------------------------------------------------

class AskAnalystRequest(BaseModel):
    """JSON body for the /ask-analyst endpoint."""
    question: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Question to ask the SAMI Market Analyst",
        json_schema_extra={"example": "Should I order a full bowser of Petrol 92 today?"},
    )


class AskAnalystResponse(BaseModel):
    """JSON response from the /ask-analyst endpoint."""
    advice: str = Field(..., description="AI-generated stocking advice")


class MarketPricePoint(BaseModel):
    """A single price data point."""
    date: str
    price: float


class MarketSnapshotResponse(BaseModel):
    """Live market data snapshot from scrapers."""
    # Mogas 92 (Singapore)
    mogas_92_price: Optional[float] = Field(None, description="Current Mogas 92 spot price (USD/barrel)")
    mogas_92_source: Optional[str] = None
    mogas_92_history: List[MarketPricePoint] = Field(default_factory=list)

    # Gasoil (Singapore)
    gasoil_price: Optional[float] = Field(None, description="Current Gasoil price (USD/barrel)")
    gasoil_source: Optional[str] = None
    gasoil_history: List[MarketPricePoint] = Field(default_factory=list)

    # Exchange rate
    exchange_rate: Optional[float] = Field(None, description="USD/LKR rate")
    exchange_source: Optional[str] = None

    # Crude oil (Brent)
    crude_oil_price: Optional[float] = Field(None, description="Brent crude oil price (USD/barrel)")
    crude_oil_source: Optional[str] = None

    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    errors: List[str] = Field(default_factory=list)


router = APIRouter(prefix="/pricing", tags=["pricing"])


@router.get("/latest", response_model=PricingDataResponse)
async def get_latest_prices(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get the latest 30-day MOPS averages and exchange rate
    
    Returns pricing data for auto-populating the Price Formula Calculator
    """
    try:
        return await get_latest_pricing_data(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pricing data: {str(e)}")


@router.post("/refresh")
async def refresh_pricing_data(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Manually trigger a full refresh of pricing data (scrape + calculate)
    
    Admin-only endpoint for manual data updates
    """
    # Check if user is system admin
    if current_user.role != "system_admin":
        raise HTTPException(
            status_code=403,
            detail="Only system administrators can refresh pricing data"
        )
    
    try:
        results = await refresh_all_pricing_data(db)
        
        if not results['success']:
            raise HTTPException(
                status_code=500,
                detail=f"Refresh failed: {', '.join(results['errors'])}"
            )
        
        return {
            "message": "Pricing data refreshed successfully",
            "mogas_records": results['mogas_records'],
            "gasoil_records": results['gasoil_records'],
            "mogas_average": results['mogas_average'],
            "gasoil_average": results['gasoil_average']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask-analyst", response_model=AskAnalystResponse)
async def ask_analyst(
    body: AskAnalystRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Ask the SAMI Market Analyst for stocking advice.

    Passes the user's question to an Agno agent backed by Gemini 2.5 Flash.
    Retries up to 3 times on transient failures (e.g. Gemini 503).
    """
    import time

    max_retries = 3
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            response = market_analyst.run(body.question)

            # Extract the text content from the agent response
            advice_text: str = response.content

            if not advice_text:
                raise ValueError("Agent returned an empty response")

            return AskAnalystResponse(advice=advice_text)

        except Exception as e:
            last_error = e
            error_str = str(e)

            # Network-level failures (DNS, connection refused) — no point retrying
            is_network_error = (
                "getaddrinfo" in error_str
                or "ConnectionError" in error_str
                or "ConnectError" in error_str
                or "Name or service not known" in error_str
            )
            if is_network_error:
                logger.warning("Gemini API unreachable (network error): %s", error_str)
                break

            is_retryable = "503" in error_str or "UNAVAILABLE" in error_str or "overloaded" in error_str.lower()

            if is_retryable and attempt < max_retries:
                wait = attempt * 2  # 2s, 4s backoff
                logger.warning(
                    "Gemini API attempt %d/%d failed (503), retrying in %ds...",
                    attempt, max_retries, wait,
                )
                time.sleep(wait)
                continue

            # Non-retryable or final attempt — break out
            break

    # All retries exhausted or non-retryable error
    error_str = str(last_error)
    logger.error("AI Market Analyst failed after %d attempts: %s", max_retries, last_error, exc_info=True)

    if "503" in error_str or "UNAVAILABLE" in error_str:
        raise HTTPException(
            status_code=503,
            detail="The AI model is currently experiencing high demand. Please try again in a minute.",
        )

    raise HTTPException(
        status_code=502,
        detail="AI Market Analyst is temporarily unavailable. Please try again later.",
    )


@router.get("/market-snapshot", response_model=MarketSnapshotResponse)
async def get_market_snapshot(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Fetch a live market data snapshot from all configured scrapers.

    Returns current prices for Mogas 92, Gasoil, USD/LKR, and Brent crude.
    Each source is fault-tolerant — individual failures don't block the response.
    """
    errors: list[str] = []
    result = MarketSnapshotResponse()

    # 1. Mogas 92 — try Barchart, fall back to Investing.com
    try:
        result.mogas_92_price = scrape_barchart_price()
        result.mogas_92_source = "Barchart"
    except Exception as e:
        logger.warning(f"Barchart Mogas 92 failed: {e}, trying Investing.com")
        try:
            mogas_data = scrape_investing_historical_prices("mogas_92", days=7)
            if mogas_data:
                result.mogas_92_price = mogas_data[0]["price"]
                result.mogas_92_source = "Investing.com"
                result.mogas_92_history = [
                    MarketPricePoint(
                        date=d["date"].strftime("%Y-%m-%d"),
                        price=d["price"],
                    )
                    for d in mogas_data[:7]
                ]
            else:
                errors.append("Mogas 92: No data from either source")
        except Exception as e2:
            errors.append(f"Mogas 92: {e2}")

    # 2. Gasoil — Investing.com
    try:
        gasoil_data = scrape_investing_historical_prices("gasoil", days=7)
        if gasoil_data:
            result.gasoil_price = gasoil_data[0]["price"]
            result.gasoil_source = "Investing.com"
            result.gasoil_history = [
                MarketPricePoint(
                    date=d["date"].strftime("%Y-%m-%d"),
                    price=d["price"],
                )
                for d in gasoil_data[:7]
            ]
        else:
            errors.append("Gasoil: No data available")
    except Exception as e:
        errors.append(f"Gasoil: {e}")

    # 3. USD/LKR Exchange Rate
    try:
        result.exchange_rate = scrape_exchange_rate()
        result.exchange_source = "Yahoo Finance"
    except Exception as e:
        errors.append(f"Exchange rate: {e}")

    # 4. Brent Crude Oil — yfinance
    try:
        import yfinance as yf
        brent = yf.Ticker("BZ=F")
        hist = brent.history(period="1d")
        if not hist.empty:
            result.crude_oil_price = round(float(hist["Close"].iloc[-1]), 2)
            result.crude_oil_source = "Yahoo Finance (Brent)"
        else:
            errors.append("Brent crude: No data available")
    except Exception as e:
        errors.append(f"Brent crude: {e}")

    result.errors = errors
    return result


@router.get("/market-news", response_model=MarketNewsResponse)
async def get_market_news(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Fetch the latest market news related to global energy and local Sri Lanka energy.
    """
    try:
        from app.modules.pricing.scrapers.news_scraper import get_latest_market_news
        news_data = get_latest_market_news()
        return MarketNewsResponse(**news_data)
    except Exception as e:
        logger.error(f"Error fetching market news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch market news")
