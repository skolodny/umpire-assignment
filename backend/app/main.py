"""Main FastAPI application setup and route registration."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, oauth, availability, preferences, games, assignments, umpires
from app.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Umpire Assignment API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(availability.router)
app.include_router(preferences.router)
app.include_router(games.router)
app.include_router(assignments.router)
app.include_router(umpires.router)


@app.get("/health")
def health():
    """Return API health status."""
    return {"status": "ok"}
