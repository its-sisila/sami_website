"""
API routes for pricing data endpoints
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.pricing.schemas import PricingDataResponse
from app.modules.pricing.service import get_latest_pricing_data, refresh_all_pricing_data
from app.modules.pricing.agent import market_analyst

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
    The agent fetches live MOPS prices and exchange rates via its tool,
    then returns ≤ 3-sentence professional advice.
    """
    try:
        response = market_analyst.run(body.question)

        # Extract the text content from the agent response
        advice_text: str = response.content

        if not advice_text:
            raise ValueError("Agent returned an empty response")

        return AskAnalystResponse(advice=advice_text)

    except Exception as e:
        logger.error("AI Market Analyst failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"AI Market Analyst is temporarily unavailable: {str(e)}",
        )
