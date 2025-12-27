"""
Security utilities for JWT verification and user authentication.
Validates Supabase JWT tokens and extracts user information.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db


# Bearer token security scheme
security = HTTPBearer(auto_error=False)


class TokenPayload(BaseModel):
    """JWT token payload from Supabase."""
    sub: str  # user_id
    email: str | None = None
    role: str | None = None
    aud: str | None = None
    exp: int | None = None


class CurrentUser(BaseModel):
    """Current authenticated user."""
    user_id: str
    email: str | None = None
    role: str | None = None
    station_id: str | None = None  # Populated from user_station_roles


def verify_token(token: str) -> TokenPayload:
    """
    Verify and decode a Supabase JWT token.
    
    Args:
        token: The JWT token string
        
    Returns:
        TokenPayload with decoded claims
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            audience="authenticated",  # Supabase default audience
        )
        return TokenPayload(**payload)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    """
    Dependency to get the current authenticated user from JWT token.
    Queries the database to get the user's station_id.
    
    Usage:
        @router.get("/me")
        async def get_me(user: CurrentUser = Depends(get_current_user)):
            return user
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_payload = verify_token(credentials.credentials)
    
    # Query user_station_roles to get station_id
    # Import here to avoid circular imports
    from app.modules.auth.models import UserStationRole
    
    station_id = None
    try:
        user_uuid = UUID(token_payload.sub)
        result = await db.execute(
            select(UserStationRole.station_id).where(UserStationRole.user_id == user_uuid)
        )
        station_role = result.scalar_one_or_none()
        if station_role:
            station_id = str(station_role)
    except Exception:
        # If query fails, continue without station_id
        pass
    
    return CurrentUser(
        user_id=token_payload.sub,
        email=token_payload.email,
        role=token_payload.role,
        station_id=station_id,
    )


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser | None:
    """
    Optional authentication - returns None if no valid token provided.
    Useful for endpoints that work with or without authentication.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None

