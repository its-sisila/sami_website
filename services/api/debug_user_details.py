
import asyncio
import os
import sys
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Setup path to import app modules
sys.path.append(os.getcwd())

from app.core.config import settings
from app.modules.auth.models import UserStationRole, Profile

# Database setup
engine = create_async_engine(settings.async_database_url)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check_user_details():
    target_email = "sisila8400@gmail.com"
    
    print(f"Checking details for user email {target_email}...")
    
    async with AsyncSessionLocal() as db:
        # Check Profile
        stmt_profile = select(Profile).where(Profile.email == target_email)
        result_profile = await db.execute(stmt_profile)
        profile = result_profile.scalar_one_or_none()
        
        if profile:
            print(f"PROFILE: ID: {profile.id}, Email: {profile.email}, Name: {profile.full_name}, Role: {profile.role}")
            target_user_id = profile.id
        else:
            print("PROFILE: Not found")
            return
            
        # Check Station Role
        stmt_role = select(UserStationRole).where(UserStationRole.user_id == target_user_id)
        result_role = await db.execute(stmt_role)
        role = result_role.scalar_one_or_none()
        
        if role:
            print(f"STATION ROLE: Station ID: {role.station_id}, Role: {role.role}")
            print(f"Target is Owner? {str(role.role) == 'owner'}")
        else:
            print("STATION ROLE: Not found (User is not assigned to a station)")

if __name__ == "__main__":
    asyncio.run(check_user_details())
