from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.db.session import engine
from app.routers import auth, clubs, users

app = FastAPI(title="Pro Clubs API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clubs.router)
app.include_router(users.router)


@app.get("/health/live")
def health_live():
    """Liveness — container is up if uvicorn responds."""
    return {"status": "ok"}


@app.get("/health")
def health():
    """Readiness — DB and Redis must be reachable for traffic."""
    from app.services.cache import redis_status

    payload: dict = {"status": "ok", "database": "ok", "redis": redis_status()}
    status_code = 200

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        payload["database"] = str(exc)
        payload["status"] = "degraded"
        status_code = 503

    redis = redis_status()
    if settings.redis_url and redis != "ok":
        payload["redis"] = redis
        payload["status"] = "degraded"
        status_code = 503

    return JSONResponse(payload, status_code=status_code)
