from contextlib import asynccontextmanager
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import ai, auth, dashboard, orders, products
from app.seed import seed_if_empty


def init_db(retries: int = 10, delay_s: float = 2.0) -> None:
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            try:
                seed_if_empty(db)
            finally:
                db.close()
            return
        except OperationalError as err:
            last_err = err
            print(f"[startup] DB not ready (attempt {attempt}/{retries}): {err}")
            time.sleep(delay_s)
    raise RuntimeError(f"Database unavailable after {retries} attempts: {last_err}")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


settings = get_settings()
cors_origins = settings.cors_origin_list
allow_credentials = cors_origins != ["*"]

app = FastAPI(title="Shelfwise API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(dashboard.router)
app.include_router(ai.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
