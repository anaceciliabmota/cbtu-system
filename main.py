from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import create_db_and_tables
from routers.instances import router as instances_router
from routers.solutions import router as solutions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="CBTU Solver API", lifespan=lifespan)

app.include_router(instances_router)
app.include_router(solutions_router)
