"""
Auth module API routes.
Handles authentication-related endpoints.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.auth.schemas import UserWithStation
from app.modules.auth import service


router = APIRouter()


@router.get("/me", response_model=UserWithStation)
async def get_current_user_profile(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserWithStation:
    """
    Get the current authenticated user's profile with station info.
    
    Requires a valid Supabase JWT token in the Authorization header.
    
    Returns:
        UserWithStation with user profile and associated station (if any)
    """
    user_id = UUID(current_user.user_id)
    
    user_with_station = await service.get_user_with_station(user_id, db)
    
    if not user_with_station:
        # User exists in auth but not in profiles table
        # This can happen if the profile wasn't created on signup
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please complete registration.",
        )
    
    return user_with_station
