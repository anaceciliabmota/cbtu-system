import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from routers.instances import router as instances_router
from routers.solutions import router as solutions_router

_DEFAULT_CORS = (
    "http://localhost:5173,http://localhost:8080,http://localhost:3000,"
    "http://127.0.0.1:5173,http://127.0.0.1:8080,http://127.0.0.1:3000"
)


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", _DEFAULT_CORS)
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="CBTU Solver API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(instances_router)
app.include_router(solutions_router)
