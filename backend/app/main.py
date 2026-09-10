from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, bookings, health, providers, reviews, services

settings = get_settings()

app = FastAPI(title="Ledger API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(bookings.router)
app.include_router(reviews.router)
app.include_router(providers.router)
app.include_router(services.router)
