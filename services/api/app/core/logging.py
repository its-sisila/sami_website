"""
Structured logging for production observability.

Replaces bare print() statements with structured, configurable logging.
In production (debug=False): JSON format for log aggregation (CloudWatch, Datadog, Sentry).
In development (debug=True): Human-readable colored output.
"""

from __future__ import annotations

import logging
import json
import sys
from datetime import datetime


class JSONFormatter(logging.Formatter):
    """Format log records as JSON for production log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Add extra fields if present
        for key in ("method", "path", "status_code", "user_id", "duration_ms"):
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)

        return json.dumps(log_entry)


def setup_logging(debug: bool = False) -> logging.Logger:
    """
    Configure application-wide logging.

    Args:
        debug: If True, use human-readable format. If False, JSON format.

    Returns:
        The configured root logger for the app.
    """
    logger = logging.getLogger("sami")
    logger.setLevel(logging.DEBUG if debug else logging.INFO)

    # Remove existing handlers
    logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if debug:
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S",
        )
    else:
        formatter = JSONFormatter()

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Quiet down noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    return logger
