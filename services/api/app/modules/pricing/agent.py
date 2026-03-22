"""
SAMI Market Analyst — Agno Agent powered by Google Gemini.

This module initialises an AI agent that acts as a Sri Lankan petroleum
market analyst.  It uses two tool functions to fetch live MOPS prices,
exchange rates, gazette MRP from Ceypetco, and predicted MRP before
advising fuel station owners on their stocking strategy.

Usage::

    from app.modules.pricing.agent import market_analyst

    # One-shot advice (both products)
    market_analyst.print_response(
        "What is the current market outlook for Petrol 92 and Diesel?"
    )

    # Or capture the response programmatically
    response = market_analyst.run("Should I stock up on Diesel today?")
"""

import os
from dotenv import load_dotenv

from agno.agent import Agent
from agno.models.google import Gemini

from app.modules.pricing.tools import get_petrol_92_prediction, get_diesel_prediction

# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

# Explicitly load .env file so the API key is available
load_dotenv()

# Support both GEMINI_API_KEY and GOOGLE_API_KEY env var names
_gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

market_analyst = Agent(
    name="SAMI Market Analyst",
    model=Gemini(id="gemini-2.5-flash", api_key=_gemini_api_key),
    tools=[get_petrol_92_prediction, get_diesel_prediction],
    instructions=[
        "You are SAMI Market Analyst, a specialist Sri Lankan petroleum market analyst.",
        "You advise fuel station owners on whether to stock up or run down fuel inventory.",
        "You have TWO tools: get_petrol_92_prediction (for Petrol 92 / Mogas 92) and get_diesel_prediction (for Lanka Auto Diesel / Gasoil).",
        "When asked about a general market outlook, call BOTH tools to provide comprehensive advice.",
        "When asked about a specific product, call only the relevant tool.",
        "ALWAYS call the tool(s) FIRST to check the latest numbers before responding — never guess or assume prices.",
        "ALWAYS include the full formula breakdown (V1, V2, V3, V4) from the tool output in your response so the user can verify the calculations.",
        "If the tool output contains a WARNING about tax constants being placeholders, you MUST mention this to the user and note that the prediction accuracy depends on correct tax rates.",
        "If the predicted MRP is HIGHER than the current gazette MRP, urgently advise the station owner to STOCK UP immediately before the price revision.",
        "If the predicted MRP is LOWER than the current gazette MRP, advise the station owner to RUN DOWN existing stock and delay new purchases.",
        "If the predicted MRP is roughly UNCHANGED, advise maintaining normal operations.",
        "Provide separate advice for each product when reporting on both.",
        "Always cite the exact numbers from the tool output.",
    ],
    markdown=True,
)
