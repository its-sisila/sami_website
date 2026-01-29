"""
SAMI API - FastAPI Entrypoint
Main application with CORS, routers, and health endpoints.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
# Ensure models are imported so they are registered with Base
from app.modules.accounts.models import BankAccount

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.app_name}...")
    
    # Create tables if they don't exist (dev mode convenience)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    yield
    # Shutdown
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="SAMI - Fuel Station Management System API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to ensure CORS headers in error responses
from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return proper JSON with CORS headers."""
    # Log the error for debugging
    print(f"Unhandled exception in {request.method} {request.url.path}:")
    print(traceback.format_exc())
    
    # Return a proper JSON response (CORS headers will be added by middleware)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )





@app.get("/")
async def root():
    """Root endpoint."""
    return {"status": "ok"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": settings.app_name}


@app.get("/debug/cors")
async def debug_cors():
    """Debug endpoint to check loaded CORS origins."""
    return {
        "cors_origins": settings.cors_origins,
        "cors_origins_type": str(type(settings.cors_origins)),
    }


# Mount module routers
from app.modules.auth import router as auth_router
from app.modules.employees import router as employees_router
from app.modules.accounts import router as accounts_router
from app.modules.inventory import router as inventory_router
from app.modules.sales import router as sales_router
from app.modules.stations import router as stations_router
from app.modules.admin import router as admin_router
from app.modules.orders import router as orders_router
from app.modules.settlements import router as settlements_router
from app.modules.users import router as users_router
from app.modules.exports import router as exports_router
from app.modules.expenses import router as expenses_router

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(employees_router, prefix="/employees", tags=["employees"])
app.include_router(accounts_router, prefix="/accounts", tags=["accounts"])
app.include_router(inventory_router, prefix="/inventory", tags=["inventory"])
app.include_router(sales_router, prefix="/sales", tags=["sales"])
app.include_router(stations_router, prefix="/stations", tags=["stations"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(orders_router, prefix="/orders", tags=["orders"])
app.include_router(settlements_router, prefix="/settlements", tags=["settlements"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(exports_router, prefix="/exports", tags=["exports"])
app.include_router(expenses_router, prefix="/expenses", tags=["expenses"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
