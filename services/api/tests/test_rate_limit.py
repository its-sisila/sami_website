"""
Rate Limiting Tests.

Tests the in-memory rate limiting utility.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.core.rate_limit import check_rate_limit, _rate_limits


class TestCheckRateLimit:
    """Test the check_rate_limit function."""

    def setup_method(self):
        """Clear rate limit state before each test."""
        _rate_limits.clear()

    def test_first_request_allowed(self):
        """First request should always be allowed."""
        check_rate_limit("user1", max_requests=5, window_seconds=60)
        assert len(_rate_limits["user1"]) == 1

    def test_within_limit_allowed(self):
        """Requests within the limit should be allowed."""
        for _ in range(4):
            check_rate_limit("user2", max_requests=5, window_seconds=60)
        assert len(_rate_limits["user2"]) == 4

    def test_at_limit_blocked(self):
        """Request at the limit should be blocked with 429."""
        for _ in range(5):
            check_rate_limit("user3", max_requests=5, window_seconds=60)

        with pytest.raises(HTTPException) as exc_info:
            check_rate_limit("user3", max_requests=5, window_seconds=60)

        assert exc_info.value.status_code == 429
        assert "Rate limit exceeded" in exc_info.value.detail

    def test_retry_after_header(self):
        """Blocked request should include Retry-After header."""
        for _ in range(5):
            check_rate_limit("user4", max_requests=5, window_seconds=60)

        with pytest.raises(HTTPException) as exc_info:
            check_rate_limit("user4", max_requests=5, window_seconds=60)

        assert "Retry-After" in exc_info.value.headers
        retry_after = int(exc_info.value.headers["Retry-After"])
        assert 0 < retry_after <= 61

    def test_different_users_independent(self):
        """Rate limits for different users should be independent."""
        for _ in range(5):
            check_rate_limit("user_a", max_requests=5, window_seconds=60)

        # user_b should not be affected
        check_rate_limit("user_b", max_requests=5, window_seconds=60)
        assert len(_rate_limits["user_b"]) == 1

    def test_old_requests_cleaned(self):
        """Requests outside the time window should be cleaned up."""
        old_time = datetime.utcnow() - timedelta(seconds=120)
        _rate_limits["user5"] = [old_time] * 5

        # New request should succeed because old entries are outside the window
        check_rate_limit("user5", max_requests=5, window_seconds=60)
        # Old entries should be cleaned, only the new one remains
        assert len(_rate_limits["user5"]) == 1

    def test_custom_window(self):
        """Custom window sizes should work correctly."""
        for _ in range(3):
            check_rate_limit("user6", max_requests=3, window_seconds=10)

        with pytest.raises(HTTPException):
            check_rate_limit("user6", max_requests=3, window_seconds=10)
