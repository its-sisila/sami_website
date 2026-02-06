"""
API routes for pricing data endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.pricing.schemas import PricingDataResponse
from app.modules.pricing.service import get_latest_pricing_data, refresh_all_pricing_data

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
