"""
Market pricing tools for the SAMI AI Market Analyst.

Implements the **January 2025 Revised Methodology** as documented in
the Fuel-Price-Methodology PDF and the Public Finance Fuel Price Tracker.

Formula: MRP = V1 + V2 + V3 + V4 (Taxes) + Margins

V1 (Landed Cost):
    platts_per_L  = MOPS_USD_bbl / 158.987
    premium_per_L = Premium_USD_bbl / 158.987
    evaporation   = (platts + premium) × 0.3%
    V1 = (platts + premium + evap) × TT_Selling_Rate

V2 (Processing):  Petrol: USD 0.06/L × XR,  Diesel: USD 0.05/L × XR
V3 (Admin):       2% of V1

V4 (Taxation):
    Customs Duty ─ Petrol: Rs.27/L,  Diesel: Rs.6/L
    Excise Duty  ─ Petrol: Rs.27/L,  Diesel: Rs.6/L
    PAL          ─ Petrol: 7.5% of V1, Diesel: 0%
    SSCL         ─ 1.25% of (V1 + V2 + V3 + Customs + Excise + PAL)
    VAT          ─ 18% of (V1 × 1.10 + Customs + Excise + PAL)

Margins:
    Distributor: Rs.4/L,  Dealer: Rs.3/L

Sources:
    - docs/Fuel-Price-Methodology (1).pdf
    - https://dashboards.publicfinance.lk/fuel-price-tracker/
    - docs/stage_3_price_formula.md
"""

import logging
from typing import Dict

from app.modules.pricing.scrapers.barchart_scraper import scrape_barchart_price
from app.modules.pricing.scrapers.exchange_scraper import scrape_exchange_rate
from app.modules.pricing.scrapers.investing_scraper import (
    scrape_investing_historical_prices,
)
from app.modules.pricing.scrapers.ceypetco_scraper import scrape_ceypetco_prices

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants — January 2025 Revised Methodology
# ---------------------------------------------------------------------------
_BARRELS_TO_LITRES: float = 158.987
_EVAPORATION_RATE: float = 0.003          # 0.3%
_VAT_RATE: float = 0.18                   # 18%
_VAT_UPLIFT: float = 0.10                 # 10% uplift on V1 for VAT base

# Product-specific configuration
_PRODUCT_CONFIG: Dict[str, Dict] = {
    "petrol_92": {
        "premium_usd_bbl":  3.00,     # USD/barrel (freight + insurance)
        "v2_usd_per_l":     0.06,     # USD/L processing cost
        "customs_duty":     27.0,     # LKR/L
        "excise_duty":      27.0,     # LKR/L
        "pal_rate":         0.075,    # 7.5% of V1
        "sscl_rate":        0.0125,   # 1.25%
    },
    "diesel": {
        "premium_usd_bbl":  2.30,     # USD/barrel
        "v2_usd_per_l":     0.05,     # USD/L processing cost
        "customs_duty":      6.0,     # LKR/L
        "excise_duty":      44.0,     # LKR/L (contains the historic debt recovery)
        "pal_rate":          0.0,     # 0%
        "sscl_rate":         0.0125,  # 1.25%
    },
}

_V3_ADMIN_RATE: float = 0.02             # 2% of V1

# Short-term operational finance cost (LKR per litre)
# Covers bank/LC charges on new shipments.
# The historic Rs.50 debt recovery is already baked into the statutory Excise Duty.
# ⚠ This figure fluctuates with central government policy updates.
_SHORT_TERM_FINANCE_COST_LKR: float = 2.50

_DISTRIBUTOR_MARGIN: float = 4.0          # LKR/L
_DEALER_MARGIN: float = 3.0              # LKR/L


# =========================================================================
# Formula engine
# =========================================================================

def _compute_predicted_mrp(
    mops_usd_per_barrel: float,
    exchange_rate: float,
    product: str,
) -> Dict[str, float]:
    """Apply the January 2025 Revised Fuel Price Formula.

    Returns a dict with all cost components and the total predicted MRP.
    """
    cfg = _PRODUCT_CONFIG[product]

    # V1: Landed Cost
    platts_per_l = mops_usd_per_barrel / _BARRELS_TO_LITRES
    premium_per_l = cfg["premium_usd_bbl"] / _BARRELS_TO_LITRES
    evap = (platts_per_l + premium_per_l) * _EVAPORATION_RATE
    v1_usd = platts_per_l + premium_per_l + evap
    v1 = v1_usd * exchange_rate

    # V2: Processing Cost (USD-based → LKR)
    v2 = cfg["v2_usd_per_l"] * exchange_rate

    # V3: Administrative Cost
    v3 = v1 * _V3_ADMIN_RATE

    # Taxes
    customs = cfg["customs_duty"]
    excise = cfg["excise_duty"]
    pal = v1 * cfg["pal_rate"]

    sscl_base = v1 + v2 + v3 + customs + excise + pal
    sscl = sscl_base * cfg["sscl_rate"]

    vat_base = v1 * (1 + _VAT_UPLIFT) + customs + excise + pal
    vat = vat_base * _VAT_RATE

    total_taxes = customs + excise + pal + sscl + vat

    # Margins
    margins = _DISTRIBUTOR_MARGIN + _DEALER_MARGIN

    # Short-term finance cost (bank/LC charges)
    # Applied ON TOP of the formula price, not subject to SSCL/VAT
    finance = _SHORT_TERM_FINANCE_COST_LKR

    # MRP
    mrp = v1 + v2 + v3 + total_taxes + margins + finance

    return {
        "platts_per_l": platts_per_l,
        "premium_per_l": premium_per_l,
        "evap": evap,
        "v1_usd": v1_usd,
        "v1": v1,
        "v2": v2,
        "v3": v3,
        "finance": finance,
        "customs": customs,
        "excise": excise,
        "pal": pal,
        "sscl": sscl,
        "vat": vat,
        "total_taxes": total_taxes,
        "margins": margins,
        "mrp": mrp,
    }


def _format_prediction(
    product_label: str,
    mops_usd: float,
    exchange_rate: float,
    current_mrp: float,
    bd: Dict[str, float],
) -> str:
    """Return a human-readable prediction block with full formula breakdown."""
    predicted_mrp = bd["mrp"]
    delta = predicted_mrp - current_mrp
    if delta > 0.5:
        direction = f"INCREASE (+LKR {delta:.2f})"
    elif delta < -0.5:
        direction = f"DECREASE (LKR {delta:.2f})"
    else:
        direction = "UNCHANGED"

    lines = [
        f"=== {product_label} ===",
        f"",
        f"Market Data:",
        f"  MOPS:               ${mops_usd:.2f}/barrel (${bd['platts_per_l']:.4f}/L)",
        f"  Evaporation (0.3%): ${bd['evap']:.4f}/L",
        f"  USD/LKR Rate:       {exchange_rate:.2f}",
        f"",
        f"Formula Breakdown (LKR per litre):",
        f"  V1 Landed Cost:     LKR {bd['v1']:.2f}",
        f"  V2 Processing:      LKR {bd['v2']:.2f}",
        f"  V3 Admin (2%):      LKR {bd['v3']:.2f}",
        f"  Finance Surcharge:  LKR {bd['finance']:.2f}  (debt recovery + LC interest)",
        f"  V4 Taxes:",
        f"    ├─ Customs:        LKR {bd['customs']:.2f}",
        f"    ├─ Excise:         LKR {bd['excise']:.2f}",
        f"    ├─ PAL:            LKR {bd['pal']:.2f}",
        f"    ├─ SSCL (1.25%):   LKR {bd['sscl']:.2f}",
        f"    └─ VAT (18%):      LKR {bd['vat']:.2f}",
        f"  Total Taxes:        LKR {bd['total_taxes']:.2f}",
        f"  Margins (4+3):      LKR {bd['margins']:.2f}",
        f"",
        f"  ══════════════════════════════",
        f"  PREDICTED MRP:      LKR {predicted_mrp:.2f}/litre",
        f"  GAZETTE MRP:        LKR {current_mrp:.2f}/litre",
        f"  Direction:          {direction}",
    ]

    return "\n".join(lines)


# =========================================================================
# Agno-callable tool functions
# =========================================================================

def get_petrol_92_prediction() -> str:
    """Fetch live market data and predict the Petrol 92 MRP.

    Scrapes:
        - Current gazette MRP from Ceypetco
        - Singapore Mogas 92 spot price from Barchart
        - USD/LKR exchange rate from Yahoo Finance

    Returns a formatted summary with full formula breakdown.
    """
    ceypetco = scrape_ceypetco_prices()
    current_mrp = ceypetco.get("petrol_92", 0.0)

    # Try Barchart first, fall back to Investing.com if it fails
    try:
        mops_usd = scrape_barchart_price()
        data_source = "Barchart"
    except Exception as e:
        logger.warning(f"Barchart scraper failed ({e}), falling back to Investing.com")
        mogas_prices = scrape_investing_historical_prices("mogas_92", days=7)
        if not mogas_prices:
            raise ValueError(
                "Could not fetch Mogas 92 prices from either Barchart or Investing.com"
            )
        mops_usd = mogas_prices[0]["price"]
        data_source = "Investing.com"

    exchange_rate = scrape_exchange_rate()

    logger.info(
        "Petrol 92 — MOPS: $%.2f (%s), XR: %.2f, Gazette MRP: Rs.%.2f",
        mops_usd, data_source, exchange_rate, current_mrp,
    )

    breakdown = _compute_predicted_mrp(mops_usd, exchange_rate, "petrol_92")

    return _format_prediction(
        "Petrol 92 (Mogas 92)",
        mops_usd, exchange_rate, current_mrp, breakdown,
    )


def get_diesel_prediction() -> str:
    """Fetch live market data and predict the Lanka Auto Diesel MRP.

    Scrapes:
        - Current gazette MRP from Ceypetco
        - Singapore Gasoil price from Investing.com (latest day)
        - USD/LKR exchange rate from Yahoo Finance

    Returns a formatted summary with full formula breakdown.
    """
    ceypetco = scrape_ceypetco_prices()
    current_mrp = ceypetco.get("diesel", 0.0)

    gasoil_prices = scrape_investing_historical_prices("gasoil", days=7)
    if not gasoil_prices:
        raise ValueError("Could not fetch Gasoil prices from Investing.com")
    mops_usd = gasoil_prices[0]["price"]

    exchange_rate = scrape_exchange_rate()

    logger.info(
        "Diesel — MOPS Gasoil: $%.2f, XR: %.2f, Gazette MRP: Rs.%.2f",
        mops_usd, exchange_rate, current_mrp,
    )

    breakdown = _compute_predicted_mrp(mops_usd, exchange_rate, "diesel")

    return _format_prediction(
        "Lanka Auto Diesel (Gasoil)",
        mops_usd, exchange_rate, current_mrp, breakdown,
    )
