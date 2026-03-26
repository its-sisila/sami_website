"""
Business logic for pricing data management
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import datetime, timedelta, date
from typing import Optional, List
import logging

from app.modules.pricing.models import (
    DailyMOPSPrice,
    MonthlyMOPSAverage,
    ExchangeRate,
    ProductType
)
from app.modules.pricing.scrapers.investing_scraper import (
    scrape_investing_historical_prices,
    calculate_average_price
)
from app.modules.pricing.scrapers.exchange_scraper import scrape_exchange_rate
from app.modules.pricing.scrapers.barchart_scraper import scrape_barchart_price
from app.modules.pricing.schemas import PricingDataResponse

logger = logging.getLogger(__name__)


async def fetch_and_save_daily_prices(
    db: AsyncSession,
    product: ProductType,
    days: int = 30
) -> int:
    """
    Scrape prices and save to database.
    Uses Barchart for Mogas 92 (current day) and Investing.com for others (history).
    
    Returns:
        Number of records saved
    """
    try:
        prices = []
        
        if product == ProductType.MOGAS_92:
            # Use Barchart for Mogas 92
            try:
                current_price = scrape_barchart_price()
                prices = [{
                    'date': datetime.now(),
                    'price': current_price
                }]
                logger.info(f"Fetched Mogas 92 price from Barchart: {current_price}")
            except Exception as e:
                logger.error(f"Barchart scraping failed: {e}")
                # Optional: Fallback to Investing.com if Barchart fails? 
                # For now, let's just log error and maybe try investing as backup
                prices = scrape_investing_historical_prices(product.value, days=days)
        
        else:
            # Use Investing.com for Gasoil (and others)
            prices = scrape_investing_historical_prices(product.value, days=days)
        
        saved_count = 0
        for price_data in prices:
            # Check if record already exists
            stmt = select(DailyMOPSPrice).where(
                and_(
                    DailyMOPSPrice.date == price_data['date'].date(),
                    DailyMOPSPrice.product_type == product
                )
            )
            result = await db.execute(stmt)
            existing = result.scalars().first()
            
            if existing:
                # Update existing record
                existing.price_usd_per_barrel = price_data['price']
                # existing.source = "barchart.com" if product == ProductType.MOGAS_92 else "investing.com" 
                # (Ideally update source too, but model default is set. logic below handles new records)
                if product == ProductType.MOGAS_92:
                     existing.source = "barchart.com"
            else:
                # Create new record
                new_record = DailyMOPSPrice(
                    date=price_data['date'].date(),
                    product_type=product,
                    price_usd_per_barrel=price_data['price'],
                    source="barchart.com" if product == ProductType.MOGAS_92 else "investing.com"
                )
                db.add(new_record)
            
            saved_count += 1
        
        await db.commit()
        logger.info(f"Saved {saved_count} daily price records for {product.value}")
        return saved_count
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to fetch and save prices for {product.value}: {e}")
        raise


async def fetch_and_save_exchange_rate(db: AsyncSession) -> float:
    """
    Scrape current USD/LKR exchange rate and save to database
    
    Returns:
        Exchange rate (LKR per USD)
    """
    try:
        rate_value = scrape_exchange_rate()
        today = date.today()
        
        # Check if today's rate already exists
        stmt = select(ExchangeRate).where(ExchangeRate.date == today)
        result = await db.execute(stmt)
        existing = result.scalars().first()
        
        if existing:
            # Update existing
            existing.rate_lkr_per_usd = rate_value
            existing.source = "Yahoo Finance"
        else:
            # Create new
            new_rate = ExchangeRate(
                date=today,
                rate_lkr_per_usd=rate_value,
                source="Yahoo Finance"
            )
            db.add(new_rate)
        
        await db.commit()
        logger.info(f"Saved exchange rate for {today}: {rate_value:.2f} LKR/USD")
        return rate_value
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to fetch and save exchange rate: {e}")
        raise


async def calculate_and_save_mops_average(
    db: AsyncSession,
    product: ProductType,
    days: int = 30
) -> Optional[float]:
    """
    Calculate 30-day average from daily prices and save to database
    
    Returns:
        Average price or None if insufficient data
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    # Fetch daily prices from database
    stmt = select(DailyMOPSPrice).where(
        and_(
            DailyMOPSPrice.product_type == product,
            DailyMOPSPrice.date >= start_date,
            DailyMOPSPrice.date <= end_date
        )
    )
    result = await db.execute(stmt)
    daily_prices = result.scalars().all()
    
    if not daily_prices:
        logger.warning(f"No daily prices found for {product.value}")
        return None
    
    # Calculate average
    total = sum(p.price_usd_per_barrel for p in daily_prices)
    average = total / len(daily_prices)
    
    # Save to database
    stmt = select(MonthlyMOPSAverage).where(
        and_(
            MonthlyMOPSAverage.calculation_date == end_date,
            MonthlyMOPSAverage.product_type == product
        )
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    if existing:
        existing.average_price_usd_per_barrel = average
        existing.num_days = len(daily_prices)
    else:
        new_avg = MonthlyMOPSAverage(
            calculation_date=end_date,
            product_type=product,
            average_price_usd_per_barrel=average,
            period_start=start_date,
            period_end=end_date,
            num_days=len(daily_prices)
        )
        db.add(new_avg)
    
    await db.commit()
    logger.info(f"Calculated and saved {days}-day average for {product.value}: ${average:.2f}/barrel")
    return average


async def get_latest_pricing_data(db: AsyncSession) -> PricingDataResponse:
    """
    Get the most recent MOPS averages and exchange rate
    """
    # Get latest MOPS averages
    stmt_mogas = select(MonthlyMOPSAverage).where(
        MonthlyMOPSAverage.product_type == ProductType.MOGAS_92
    ).order_by(desc(MonthlyMOPSAverage.calculation_date))
    result_mogas = await db.execute(stmt_mogas)
    mogas_avg = result_mogas.scalars().first()
    
    stmt_gasoil = select(MonthlyMOPSAverage).where(
        MonthlyMOPSAverage.product_type == ProductType.GASOIL
    ).order_by(desc(MonthlyMOPSAverage.calculation_date))
    result_gasoil = await db.execute(stmt_gasoil)
    gasoil_avg = result_gasoil.scalars().first()
    
    # Get latest exchange rate
    stmt_rate = select(ExchangeRate).order_by(desc(ExchangeRate.date))
    result_rate = await db.execute(stmt_rate)
    exchange_rate = result_rate.scalars().first()
    
    return PricingDataResponse(
        mogas_92_average=mogas_avg.average_price_usd_per_barrel if mogas_avg else None,
        gasoil_average=gasoil_avg.average_price_usd_per_barrel if gasoil_avg else None,
        exchange_rate=exchange_rate.rate_lkr_per_usd if exchange_rate else None,
        last_updated=mogas_avg.calculation_date if mogas_avg else None,
        period_days=mogas_avg.num_days if mogas_avg else 30
    )


async def refresh_all_pricing_data(db: AsyncSession) -> dict:
    """
    Full refresh: scrape, calculate averages, save everything
    
    Returns:
        Dict with status and counts
    """
    results = {
        'success': False,
        'mogas_records': 0,
        'gasoil_records': 0,
        'mogas_average': None,
        'gasoil_average': None,
        'exchange_rate': None,
        'errors': []
    }
    
    try:
        # Fetch and save exchange rate
        results['exchange_rate'] = await fetch_and_save_exchange_rate(db)
        
        # Fetch and save daily prices for both products
        results['mogas_records'] = await fetch_and_save_daily_prices(
            db, ProductType.MOGAS_92, days=30
        )
        results['gasoil_records'] = await fetch_and_save_daily_prices(
            db, ProductType.GASOIL, days=30
        )
        
        # Calculate and save averages
        results['mogas_average'] = await calculate_and_save_mops_average(
            db, ProductType.MOGAS_92, days=30
        )
        results['gasoil_average'] = await calculate_and_save_mops_average(
            db, ProductType.GASOIL, days=30
        )
        
        results['success'] = True
        logger.info("Successfully refreshed all pricing data")
        
    except Exception as e:
        logger.error(f"Error during pricing data refresh: {e}")
        results['errors'].append(str(e))
    
    return results
