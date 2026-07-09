from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
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


@app.get("/health")
def health():
    from app.services.cache import redis_status

    return {"status": "ok", "redis": redis_status()}
