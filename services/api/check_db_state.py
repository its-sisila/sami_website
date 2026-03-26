
import asyncio
import os
import sys
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Setup path
sys.path.append(os.getcwd())

# Import models
from app.modules.auth.models import Profile, UserStationRole
from app.core.config import settings

# Database setup
engine = create_async_engine(settings.database_url)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check_user_state():
    user_id = UUID("52aa485a-7d92-4c33-93b8-54945de0216c")
    print(f"Checking state for User ID: {user_id}")
    
    async with AsyncSessionLocal() as db:
        # Check Profile
        stmt_profile = select(Profile).where(Profile.id == user_id)
        result_profile = await db.execute(stmt_profile)
        profile = result_profile.scalar_one_or_none()
        
        if profile:
            print(f"Profile FOUND: Role={profile.role}")
        else:
            print("Profile NOT FOUND")
            
        # Check UserStationRole
        stmt_usr = select(UserStationRole).where(UserStationRole.user_id == user_id)
        result_usr = await db.execute(stmt_usr)
        usr = result_usr.scalar_one_or_none()
        
        if usr:
            print(f"UserStationRole FOUND: Station={usr.station_id}, Role={usr.role}")
        else:
            print("UserStationRole NOT FOUND")

        # Test the Exact Query from security.py
        stmt_combined = (
            select(
                Profile.role.label("profile_role"),
                UserStationRole.station_id,
                UserStationRole.role.label("station_role")
            )
            .outerjoin(UserStationRole, Profile.id == UserStationRole.user_id)
            .where(Profile.id == user_id)
        )
        try:
            res_combined = await db.execute(stmt_combined)
            row = res_combined.one_or_none()
            if row:
                print(f"Combined Query ROW FOUND: ProfileRole={row.profile_role}, StationRole={row.station_role}")
            else:
                print("Combined Query ROW NOT FOUND (row is None)")
        except Exception as e:
            print(f"Combined Query CRASHED: {e}")

if __name__ == "__main__":
    asyncio.run(check_user_state())
