"""
Users module API routes.
User listing, invites with RBAC, and user removal.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.modules.auth.models import UserRole
from app.modules.users import service
from app.modules.users.schemas import (
    InviteCreate, InviteResponse,
    UserRead, UserRemoveResponse,
)


router = APIRouter()


def get_station_uuid(user: CurrentUser) -> UUID:
    """Extract and validate station_id from current user."""
    if not user.station_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a station",
        )
    return UUID(user.station_id) if isinstance(user.station_id, str) else user.station_id


def get_actor_role(user: CurrentUser) -> UserRole:
    """Get the actor's role as UserRole enum."""
    if not user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not determined",
        )
    try:
        return UserRole(user.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role",
        )


# ============================================================================
# List Users
# ============================================================================

@router.get("", response_model=list[UserRead])
async def list_users(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    station_id: UUID | None = None,
):
    """
    List all users for the current user's station.
    
    System admins can see users across stations (when station_id is provided via query).
    """
    actor_role = get_actor_role(current_user)
    
    # System admins without station assignment can't list (need to specify station)
    if actor_role == UserRole.system_admin:
        if not station_id and not current_user.station_id:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="System admin must specify a station to list users",
            )
        target_station_id = station_id or UUID(current_user.station_id) if isinstance(current_user.station_id, str) else current_user.station_id
    else:
        target_station_id = get_station_uuid(current_user)
    
    users = await service.list_users_for_station(target_station_id, db)
    return users


# ============================================================================
# Invite User
# ============================================================================

@router.post("/invite", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(
    data: InviteCreate,
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Invite a new user to a station.
    
    RBAC Rules:
    - system_admin: can invite any role to any station
    - owner: can invite manager/accountant/supervisor to same station
    - manager: can invite accountant/supervisor to same station
    - accountant/supervisor: cannot invite anyone
    """
    actor_role = get_actor_role(current_user)
    actor_id = UUID(current_user.user_id)
    
    # Determine target station
    if actor_role == UserRole.system_admin:
        # System admin must provide station_id for non-system_admin invites
        if data.role != UserRole.system_admin and not data.station_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="station_id is required for non-system_admin invites",
            )
        target_station_id = data.station_id
    else:
        # Non-admins can only invite to their own station
        target_station_id = get_station_uuid(current_user)
        
        # Ensure they're not trying to invite to a different station
        if data.station_id and data.station_id != target_station_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only invite users to your own station",
            )
    
    # Check RBAC permission
    if not service.can_invite_role(actor_role, data.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to invite users with role '{data.role.value}'",
        )
    
    # Create user in Supabase Auth
    supabase_user = await service.invite_user_supabase(data.email)
    if not supabase_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user in authentication system",
        )
    
    new_user_id = UUID(supabase_user.get("id"))
    
    # Create profile in our database
    await service.create_user_profile(
        user_id=new_user_id,
        email=data.email,
        full_name=data.full_name,
        role=data.role,
        db=db,
    )
    
    # Assign to station (if not system_admin without station)
    if target_station_id:
        await service.assign_user_to_station(
            user_id=new_user_id,
            station_id=target_station_id,
            role=data.role,
            db=db,
        )
    
    # Audit log the invite
    await service.log_audit(
        actor_id=actor_id,
        station_id=target_station_id,
        action="user_invited",
        entity_type="profile",
        entity_id=new_user_id,
        details={
            "email": data.email,
            "role": data.role.value,
            "invited_by": str(actor_id),
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )
    
    return InviteResponse(
        user_id=new_user_id,
        email=data.email,
        role=data.role,
        station_id=target_station_id,
        message="User invited successfully",
    )


# ============================================================================
# Remove User from Station
# ============================================================================

@router.delete("/{user_id}", response_model=UserRemoveResponse)
async def remove_user(
    user_id: UUID,
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Remove a user from a station.
    
    Only owners and system_admins can remove users.
    Users cannot remove themselves.
    """
    actor_role = get_actor_role(current_user)
    actor_id = UUID(current_user.user_id)
    
    # Only owner and system_admin can remove users
    if actor_role not in (UserRole.system_admin, UserRole.owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and system admins can remove users",
        )
    
    # Cannot remove yourself
    if user_id == actor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself",
        )
    
    # Get the user's station role to verify permissions
    target_user_role = await service.get_user_station_role(user_id, db)
    if not target_user_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or not assigned to any station",
        )
    
    # Non-system_admins can only remove users from their own station
    if actor_role != UserRole.system_admin:
        station_id = get_station_uuid(current_user)
        if target_user_role.station_id != station_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only remove users from your own station",
            )
    
    # Perform removal
    removed = await service.remove_user_from_station(user_id, db)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove user",
        )
    
    # Audit log the removal
    await service.log_audit(
        actor_id=actor_id,
        station_id=target_user_role.station_id,
        action="user_removed",
        entity_type="user_station_role",
        entity_id=user_id,
        details={
            "removed_user_id": str(user_id),
            "removed_by": str(actor_id),
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )
    
    return UserRemoveResponse(
        user_id=user_id,
        message="User removed from station",
    )


# ============================================================================
# Update User Password
# ============================================================================

from app.modules.users.schemas import UserPasswordUpdate

@router.patch("/{user_id}/password", status_code=status.HTTP_200_OK)
async def update_user_password(
    user_id: UUID,
    data: UserPasswordUpdate,
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update a user's password.
    
    Only system_admin can update passwords for other users.
    Owner can update passwords for users in their station (optional).
    """
    actor_role = get_actor_role(current_user)
    actor_id = UUID(current_user.user_id)
    
    # Permission check: Only system_admin for now
    if actor_role != UserRole.system_admin:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only system admins can reset user passwords",
        )
    
    # Update password in Supabase
    success = await service.update_user_password_supabase(user_id, data.password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password in authentication system",
        )
        
    # Audit log
    await service.log_audit(
        actor_id=actor_id,
        station_id=None,
        action="user_password_reset",
        entity_type="user",
        entity_id=user_id,
        details={
            "reset_by": str(actor_id),
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )
    

# ============================================================================
# Assign User to Station (Re-assignment)
# ============================================================================

from app.modules.users.schemas import UserStationAssignment

@router.put("/{user_id}/station", status_code=status.HTTP_200_OK)
async def assign_user_station(
    user_id: UUID,
    data: UserStationAssignment,
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Assign or re-assign a user to a station.
    
    This is primarily for System Admins to switch their own context or move users.
    It removes any existing station assignment for the user and creates a new one.
    """
    actor_role = get_actor_role(current_user)
    actor_id = UUID(current_user.user_id)
    
    # Permission check: Only system_admin
    if actor_role != UserRole.system_admin:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only system admins can re-assign users to stations",
        )
    
    # Check if target user exists (implicitly handled by FK constraints but good to verify if needed)
    # For now we assume user exists as it's an FK.
    
    # Remove existing assignment
    await service.remove_user_from_station(user_id, db)
    
    # Create new assignment
    await service.assign_user_to_station(user_id, data.station_id, data.role, db)
    
    # Audit log
    await service.log_audit(
        actor_id=actor_id,
        station_id=data.station_id,
        action="user_station_reassigned",
        entity_type="user",
        entity_id=user_id,
        details={
            "assigned_by": str(actor_id),
            "new_role": data.role,
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )
    
    return {"message": "User assigned to station successfully"}
