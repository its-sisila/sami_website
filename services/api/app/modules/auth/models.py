"""
Auth module SQLAlchemy models.
Maps to profiles and user_station_roles tables.
"""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, String, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    """User roles for login users."""
    system_admin = "system_admin"
    owner = "owner"
    manager = "manager"
    accountant = "accountant"
    supervisor = "supervisor"


class Profile(Base):
    """User profile linked to Supabase auth.users."""
    
    __tablename__ = "profiles"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="user_role", create_type=False),
        default=UserRole.owner
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user_station_roles
    station_role: Mapped["UserStationRole | None"] = relationship(
        "UserStationRole",
        back_populates="user",
        uselist=False
    )


class UserStationRole(Base):
    """Maps users to stations. Each user belongs to exactly one station."""
    
    __tablename__ = "user_station_roles"
    
    id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), unique=True)
    station_id: Mapped[UUID] = mapped_column(ForeignKey("stations.id", ondelete="CASCADE"))
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="user_role", create_type=False)
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["Profile"] = relationship("Profile", back_populates="station_role")
