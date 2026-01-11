"""
Rate limiting utility for API endpoints.
Simple in-memory rate limiting with sliding window.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from functools import wraps
from typing import Callable

from fastapi import HTTPException, Request, status


# In-memory rate limit storage: user_id -> list of request timestamps
_rate_limits: dict[str, list[datetime]] = defaultdict(list)


def check_rate_limit(
    user_id: str,
    max_requests: int = 10,
    window_seconds: int = 60,
) -> None:
    """
    Check if user has exceeded rate limit.
    
    Args:
        user_id: Unique identifier for the user
        max_requests: Maximum requests allowed in window
        window_seconds: Time window in seconds
        
    Raises:
        HTTPException: 429 Too Many Requests if limit exceeded
    """
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=window_seconds)
    
    # Clean old entries outside the window
    _rate_limits[user_id] = [
        ts for ts in _rate_limits[user_id]
        if ts > window_start
    ]
    
    # Check if limit exceeded
    if len(_rate_limits[user_id]) >= max_requests:
        oldest_in_window = min(_rate_limits[user_id])
        retry_after = int((oldest_in_window + timedelta(seconds=window_seconds) - now).total_seconds()) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Max {max_requests} exports per minute. Retry after {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )
    
    # Record this request
    _rate_limits[user_id].append(now)


def rate_limit_exports(max_requests: int = 10, window_seconds: int = 60):
    """
    Decorator to rate limit export endpoints.
    Uses user_id from CurrentUser dependency.
    
    Usage:
        @rate_limit_exports(max_requests=10, window_seconds=60)
        async def export_sales(...):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get("current_user")
            if current_user and hasattr(current_user, "user_id"):
                user_id = str(current_user.user_id)
            else:
                # Fallback to IP-based limiting if no user
                request = kwargs.get("request")
                if request and hasattr(request, "client"):
                    user_id = f"ip:{request.client.host}"
                else:
                    user_id = "anonymous"
            
            check_rate_limit(user_id, max_requests, window_seconds)
            return await func(*args, **kwargs)
        return wrapper
    return decorator
