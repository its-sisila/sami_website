"""
Pydantic schemas for pricing data API responses
"""

from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class MOPSAverageRead(BaseModel):
    """30-day MOPS average for a product"""
    product_type: str
    average_price_usd_per_barrel: float
    period_start: date
    period_end: date
    num_days: int
    calculation_date: date
    
    class Config:
        from_attributes = True


class ExchangeRateRead(BaseModel):
    """Exchange rate data"""
    date: date
    rate_lkr_per_usd: float
    source: str
    
    class Config:
        from_attributes = True


class PricingDataResponse(BaseModel):
    """Combined response with latest MOPS and exchange rate"""
    mogas_92_average: Optional[float] = Field(None, description="30-day average for Mogas 92 (USD/barrel)")
    gasoil_average: Optional[float] = Field(None, description="30-day average for Gasoil (USD/barrel)")
    exchange_rate: Optional[float] = Field(None, description="Latest LKR/USD rate")
    last_updated: Optional[date] = Field(None, description="Date of last calculation")
    period_days: int = Field(30, description="Number of days used for average")
    data_source: str = Field("investing.com", description="Data source")
