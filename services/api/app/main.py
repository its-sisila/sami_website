"""
SAMI API - FastAPI Entrypoint
Main application with CORS, routers, health endpoints, and scheduled jobs.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base, async_session_factory
# Ensure models are imported so they are registered with Base
from app.modules.accounts.models import BankAccount
from app.modules.pricing.models import DailyMOPSPrice, MonthlyMOPSAverage, ExchangeRate
from app.modules.forecasting.models import Forecast, Alert  # noqa: F401 — register Stage 2 tables

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _daily_forecasting_job() -> None:
    """
    Nightly job: run the forecasting + anomaly pipeline for every
    active station.  Scheduled at 23:30 local time.
    """
    from sqlalchemy import select
    from app.modules.stations.models import Station, StationStatus
    from app.modules.inventory.models import FuelProduct, Nozzle
    from app.modules.forecasting.engine import (
        calculate_forecast,
        detect_anomalies,
        calculate_reorder_status,
    )
    from app.modules.forecasting.router import (
        _fetch_daily_history,
        _current_stock,
        _persist_forecasts,
        _persist_alert,
    )
    from datetime import date

    logger.info("[Scheduler] Starting daily forecasting pipeline…")

    async with async_session_factory() as db:
        try:
            stations = (
                await db.execute(select(Station).where(Station.status == StationStatus.active))
            ).scalars().all()

            for station in stations:
                products = (
                    await db.execute(
                        select(FuelProduct).where(
                            FuelProduct.station_id == station.id,
                            FuelProduct.is_active.is_(True),
                        )
                    )
                ).scalars().all()

                for product in products:
                    nozzle_ids = [
                        r[0]
                        for r in (
                            await db.execute(
                                select(Nozzle.id).where(
                                    Nozzle.product_id == product.id,
                                    Nozzle.is_active.is_(True),
                                )
                            )
                        ).all()
                    ]

                    historical = await _fetch_daily_history(
                        db, station.id, nozzle_ids, days=30,
                    )
                    stock = await _current_stock(db, station.id, product.id)

                    forecast, method = await calculate_forecast(
                        historical,
                        station_id=str(station.id),
                        fuel_type=product.code.upper(),
                    )

                    today_iso = date.today().isoformat()
                    today_actual = next(
                        (h["liters"] for h in historical if h["date"] == today_iso),
                        0.0,
                    )
                    yesterday_history = [
                        h for h in historical if h["date"] < today_iso
                    ]
                    anomaly = detect_anomalies(yesterday_history, today_actual)
                    reorder = calculate_reorder_status(stock, forecast)

                    await _persist_forecasts(
                        db, station.id, product.code.upper(), forecast, method,
                    )

                    if anomaly["is_anomaly"]:
                        await _persist_alert(
                            db, station.id, "anomaly", anomaly["severity"],
                            product.code.upper(),
                            f"Anomaly: {product.name} actual={anomaly['actual']}L z={anomaly['z_score']}",
                            details=dict(anomaly),
                        )
                    if reorder["status"] == "CRITICAL":
                        await _persist_alert(
                            db, station.id, "reorder", "critical",
                            product.code.upper(),
                            f"CRITICAL reorder: {product.name} stock={reorder['current_stock']}L",
                            details=dict(reorder),
                        )

            await db.commit()
            logger.info("[Scheduler] Daily forecasting pipeline complete.")
        except Exception:
            await db.rollback()
            logger.exception("[Scheduler] Forecasting pipeline failed.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.app_name}...")

    # Create tables if they don't exist (dev mode convenience)
    # Retry with exponential backoff so transient network hiccups don't crash the app
    MAX_DB_RETRIES = 3
    db_connected = False
    for attempt in range(1, MAX_DB_RETRIES + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            db_connected = True
            logger.info("[Startup] Database connected successfully.")
            break
        except Exception as e:
            wait_seconds = 2 ** attempt
            logger.warning(
                f"[Startup] DB connection attempt {attempt}/{MAX_DB_RETRIES} failed: {e}"
            )
            if attempt < MAX_DB_RETRIES:
                logger.info(f"[Startup] Retrying in {wait_seconds}s...")
                await asyncio.sleep(wait_seconds)
            else:
                logger.error(
                    "[Startup] Could not reach database after %d attempts. "
                    "Starting in degraded mode — data endpoints will return 503.",
                    MAX_DB_RETRIES,
                )

    # Store DB status on the app so health checks can report it
    app.state.db_connected = db_connected

    # Start nightly forecasting scheduler
    scheduler.add_job(
        _daily_forecasting_job,
        "cron",
        hour=23,
        minute=30,
        id="daily_forecasting",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[Scheduler] APScheduler started — daily forecasting at 23:30.")

    yield
    # Shutdown
    scheduler.shutdown(wait=False)
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="SAMI - Fuel Station Management System API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to ensure CORS headers in error responses
from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return proper JSON with CORS headers."""
    # Log the error for debugging
    print(f"Unhandled exception in {request.method} {request.url.path}:")
    print(traceback.format_exc())
    
    # Return a proper JSON response (CORS headers will be added by middleware)
    detail = f"Internal server error: {str(exc)}" if settings.debug else "Internal server error"
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
    )





@app.get("/")
async def root():
    """Root endpoint."""
    return {"status": "ok"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    db_ok = getattr(app.state, "db_connected", False)
    return {
        "status": "ok" if db_ok else "degraded",
        "service": settings.app_name,
        "database": "connected" if db_ok else "unreachable",
    }



# Mount module routers
from app.modules.auth import router as auth_router
from app.modules.employees import router as employees_router
from app.modules.accounts import router as accounts_router
from app.modules.inventory import router as inventory_router
from app.modules.sales import router as sales_router
from app.modules.stations import router as stations_router
from app.modules.admin import router as admin_router
from app.modules.orders import router as orders_router
from app.modules.settlements import router as settlements_router
from app.modules.users import router as users_router
from app.modules.exports import router as exports_router
from app.modules.expenses import router as expenses_router
from app.modules.pricing.routes import router as pricing_router
from app.modules.forecasting.router import router as forecasting_router

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(employees_router, prefix="/employees", tags=["employees"])
app.include_router(accounts_router, prefix="/accounts", tags=["accounts"])
app.include_router(inventory_router, prefix="/inventory", tags=["inventory"])
app.include_router(sales_router, prefix="/sales", tags=["sales"])
app.include_router(stations_router, prefix="/stations", tags=["stations"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(orders_router, prefix="/orders", tags=["orders"])
app.include_router(settlements_router, prefix="/settlements", tags=["settlements"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(exports_router, prefix="/exports", tags=["exports"])
app.include_router(expenses_router, prefix="/expenses", tags=["expenses"])
app.include_router(pricing_router)  # Already has /pricing prefix in routes.py
app.include_router(forecasting_router, prefix="/forecasting", tags=["forecasting"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)  # nosec B104
