"""
Database models for MOPS pricing data
"""

from sqlalchemy import Column, String, Float, Date, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ProductType(str, enum.Enum):
    """Fuel product types"""
    MOGAS_92 = "mogas_92"
    GASOIL = "gasoil"


class DailyMOPSPrice(Base):
    """
    Daily scraped MOPS prices from Investing.com
    """
    __tablename__ = "daily_mops_prices"
    
    date = Column(Date, primary_key=True)
    product_type = Column(SQLEnum(ProductType), primary_key=True)
    price_usd_per_barrel = Column(Float, nullable=False)
    source = Column(String, default="investing.com")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MonthlyMOPSAverage(Base):
    """
    Calculated 30-day MOPS averages (true MOPS value)
    """
    __tablename__ = "monthly_mops_averages"
    
    calculation_date = Column(Date, primary_key=True)
    product_type = Column(SQLEnum(ProductType), primary_key=True)
    average_price_usd_per_barrel = Column(Float, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    num_days = Column(Float, nullable=False)  # Number of trading days in the period
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExchangeRate(Base):
    """
    Daily LKR/USD exchange rates
    """
    __tablename__ = "exchange_rates"
    
    date = Column(Date, primary_key=True)
    rate_lkr_per_usd = Column(Float, nullable=False)
    source = Column(String, default="manual")  # "manual", "cbsl", "yahoo"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
