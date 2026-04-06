"""
Forecasting Engine – Stage 2: Internal Intelligence
SARIMA-based demand forecasting + Z-Score anomaly detection.

Uses statsmodels for SARIMA and scipy for Z-Score analysis.
Trained models are persisted to Supabase Storage (Heroku ephemeral FS).
"""

from __future__ import annotations

import io
import math
import pickle
import warnings
from datetime import date, timedelta
from typing import TypedDict

import httpx
import numpy as np
import pandas as pd
from scipy import stats

from app.core.config import settings


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

class DailySales(TypedDict):
    """A single day of sales history."""
    date: str          # ISO format YYYY-MM-DD
    liters: float


class ForecastDay(TypedDict):
    """A single day of forecasted demand."""
    date: str
    predicted_liters: float


class AnomalyResult(TypedDict):
    """Anomaly detection result for a single day."""
    is_anomaly: bool
    severity: str          # ok | warning | critical
    actual: float
    moving_avg_14d: float
    z_score: float


class ReorderResult(TypedDict):
    """Reorder status and recommendation."""
    status: str               # OK | WARNING | CRITICAL
    current_stock: float
    forecast_7day_demand: float
    safety_stock: float
    recommended_order_liters: float
    days_of_stock_remaining: float


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SAFETY_STOCK_LITERS = 2_000.0
Z_SCORE_WARNING_THRESHOLD = 2.0
Z_SCORE_CRITICAL_THRESHOLD = 3.0
MIN_HISTORY_DAYS = 21          # minimum days for SARIMA seasonal fit
FORECAST_HORIZON = 7
SEASONAL_PERIOD = 7            # weekly cycle
SUPABASE_STORAGE_BUCKET = "ml-models"

# Fallback weighted-average weights (used when < 21 days history)
WEIGHTS = [0.50, 0.30, 0.20]


# ---------------------------------------------------------------------------
# Supabase Storage helpers
# ---------------------------------------------------------------------------

def _storage_headers() -> dict[str, str]:
    """Authorization headers for Supabase Storage API."""
    return {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
    }


def _model_path(station_id: str, fuel_type: str) -> str:
    """Object key inside the bucket."""
    return f"sarima/{station_id}/{fuel_type}.pkl"


async def _upload_model(station_id: str, fuel_type: str, model_obj: object) -> None:
    """Serialize and upload a trained model to Supabase Storage."""
    buf = io.BytesIO()
    pickle.dump(model_obj, buf)
    buf.seek(0)

    path = _model_path(station_id, fuel_type)
    url = f"{settings.supabase_url}/storage/v1/object/{SUPABASE_STORAGE_BUCKET}/{path}"

    async with httpx.AsyncClient(timeout=30) as client:
        await client.post(
            url,
            headers={**_storage_headers(), "Content-Type": "application/octet-stream"},
            content=buf.getvalue(),
        )


async def _download_model(station_id: str, fuel_type: str) -> object | None:
    """Download and deserialise a trained model from Supabase Storage."""
    path = _model_path(station_id, fuel_type)
    url = f"{settings.supabase_url}/storage/v1/object/{SUPABASE_STORAGE_BUCKET}/{path}"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=_storage_headers())
        if resp.status_code != 200:
            return None
        return pickle.loads(resp.content)


# ---------------------------------------------------------------------------
# SARIMA Forecasting
# ---------------------------------------------------------------------------

def _fit_sarima(series: pd.Series):
    """Fit a SARIMA(1,1,1)(1,1,0,7) model on the given daily time-series."""
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = SARIMAX(
            series,
            order=(1, 1, 1),
            seasonal_order=(1, 1, 0, SEASONAL_PERIOD),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        results = model.fit(disp=False, maxiter=200)
    return results


def _sarima_forecast(
    fitted_model,
    steps: int = FORECAST_HORIZON,
    last_date: date | None = None,
) -> list[ForecastDay]:
    """Generate *steps* days of forward predictions from a fitted SARIMA."""
    pred = fitted_model.get_forecast(steps=steps)
    mean_values = pred.predicted_mean.values  # numpy array

    start = last_date or date.today()
    forecasts: list[ForecastDay] = []
    for i, val in enumerate(mean_values):
        target_date = start + timedelta(days=i + 1)
        forecasts.append(
            ForecastDay(
                date=target_date.isoformat(),
                predicted_liters=round(max(float(val), 0.0), 2),
            )
        )
    return forecasts


# ---------------------------------------------------------------------------
# Fallback: Seasonally Adjusted Weighted Moving Average
# ---------------------------------------------------------------------------

def _weighted_moving_average_forecast(
    sales_history: list[DailySales],
    forecast_days: int = FORECAST_HORIZON,
) -> list[ForecastDay]:
    """
    Fallback when < 21 days of history are available.
    Uses 3-week same-weekday weighted average (50/30/20).
    """
    if not sales_history:
        return []

    weekday_map: dict[int, list[float]] = {i: [] for i in range(7)}
    for entry in sorted(sales_history, key=lambda e: e["date"], reverse=True):
        d = date.fromisoformat(entry["date"])
        weekday_map[d.weekday()].append(entry["liters"])

    overall_avg = (
        sum(e["liters"] for e in sales_history) / len(sales_history)
        if sales_history else 0.0
    )

    last_date = max(date.fromisoformat(e["date"]) for e in sales_history)
    forecasts: list[ForecastDay] = []

    for offset in range(1, forecast_days + 1):
        target_date = last_date + timedelta(days=offset)
        samples = weekday_map.get(target_date.weekday(), [])

        if not samples:
            predicted = overall_avg
        else:
            used = samples[: len(WEIGHTS)]
            raw_w = WEIGHTS[: len(used)]
            total_w = sum(raw_w)
            norm_w = [w / total_w for w in raw_w]
            predicted = sum(v * w for v, w in zip(used, norm_w))

        forecasts.append(
            ForecastDay(date=target_date.isoformat(), predicted_liters=round(predicted, 2))
        )
    return forecasts


# ---------------------------------------------------------------------------
# Public API — Forecast
# ---------------------------------------------------------------------------

async def calculate_forecast(
    sales_history: list[DailySales],
    station_id: str,
    fuel_type: str,
    forecast_days: int = FORECAST_HORIZON,
) -> tuple[list[ForecastDay], str]:
    """
    Primary forecasting entry point.

    Returns (forecast_list, method_used).
    * Uses SARIMA when ≥ 21 days of history are available.
    * Falls back to weighted moving-average otherwise.
    """
    if len(sales_history) < MIN_HISTORY_DAYS:
        forecasts = _weighted_moving_average_forecast(sales_history, forecast_days)
        return forecasts, "weighted_moving_average"

    # Build pandas Series indexed by date
    df = pd.DataFrame(sales_history)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").set_index("date")
    series = df["liters"].asfreq("D", fill_value=0)

    # Try to load an existing model; retrain if unavailable
    fitted = await _download_model(station_id, fuel_type)
    if fitted is None:
        fitted = _fit_sarima(series)
        await _upload_model(station_id, fuel_type, fitted)
    else:
        # Re-fit with latest data to keep the model fresh
        try:
            fitted = fitted.apply(series, refit=True)
            await _upload_model(station_id, fuel_type, fitted)
        except Exception:
            # If apply fails (e.g. shape mismatch), retrain from scratch
            fitted = _fit_sarima(series)
            await _upload_model(station_id, fuel_type, fitted)

    last_date = series.index[-1].date()
    forecasts = _sarima_forecast(fitted, steps=forecast_days, last_date=last_date)
    return forecasts, "sarima_v1"


# ---------------------------------------------------------------------------
# Public API — Anomaly Detection (Z-Score)
# ---------------------------------------------------------------------------

def detect_anomalies(
    sales_history: list[DailySales],
    today_actual: float,
) -> AnomalyResult:
    """
    Flag anomalies using Z-Score analysis against the trailing 14-day
    moving average.

    * |Z| > 3  → critical
    * |Z| > 2  → warning
    * otherwise → ok
    """
    if len(sales_history) < 2:
        return AnomalyResult(
            is_anomaly=False,
            severity="ok",
            actual=round(today_actual, 2),
            moving_avg_14d=0.0,
            z_score=0.0,
        )

    # Use up to the last 14 days (excluding today)
    recent = sorted(sales_history, key=lambda e: e["date"], reverse=True)[:14]
    values = [e["liters"] for e in recent]

    mean_14d = float(np.mean(values))
    std_14d = float(np.std(values, ddof=1)) if len(values) > 1 else 0.0

    if std_14d == 0:
        # Zero variance — all values identical.  Any significant deviation
        # from that constant is an extraordinary event.
        pct_diff = abs(today_actual - mean_14d) / mean_14d * 100 if mean_14d else 0.0
        z = float("inf") if pct_diff > 5.0 else 0.0
    else:
        z = (today_actual - mean_14d) / std_14d

    abs_z = abs(z)
    if abs_z >= Z_SCORE_CRITICAL_THRESHOLD:
        severity = "critical"
        is_anomaly = True
    elif abs_z >= Z_SCORE_WARNING_THRESHOLD:
        severity = "warning"
        is_anomaly = True
    else:
        severity = "ok"
        is_anomaly = False

    return AnomalyResult(
        is_anomaly=is_anomaly,
        severity=severity,
        actual=round(today_actual, 2),
        moving_avg_14d=round(mean_14d, 2),
        z_score=round(z, 2),
    )


# ---------------------------------------------------------------------------
# Public API — Reorder Status
# ---------------------------------------------------------------------------

def calculate_reorder_status(
    current_stock: float,
    forecast_demand: list[ForecastDay],
) -> ReorderResult:
    """
    Determine reorder urgency based on predicted 7-day demand
    plus a 2 000 L safety buffer.

    Status logic:
      • CRITICAL – stock < total needed (7-day demand + safety)
      • WARNING  – stock < 7-day demand × 1.5 (i.e. covers < 10.5 days)
      • OK       – comfortable stock level
    """
    forecast_7day = sum(f["predicted_liters"] for f in forecast_demand)
    total_needed = forecast_7day + SAFETY_STOCK_LITERS

    avg_daily = forecast_7day / max(len(forecast_demand), 1)
    days_remaining = current_stock / avg_daily if avg_daily > 0 else 999.0

    shortfall = max(total_needed - current_stock, 0.0)

    if current_stock < total_needed:
        status = "CRITICAL"
    elif current_stock < forecast_7day * 1.5:
        status = "WARNING"
    else:
        status = "OK"

    return ReorderResult(
        status=status,
        current_stock=round(current_stock, 2),
        forecast_7day_demand=round(forecast_7day, 2),
        safety_stock=SAFETY_STOCK_LITERS,
        recommended_order_liters=round(shortfall, 2),
        days_of_stock_remaining=round(days_remaining, 1),
    )
