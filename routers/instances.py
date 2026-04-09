from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models.instance import Instance, InstanceCreate, InstanceRead
from models.solution import SolutionRead
from services.solver_service import run_solver

router = APIRouter(prefix="/instances", tags=["instances"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.post("/", response_model=InstanceRead, status_code=201)
def create_instance(body: InstanceCreate, session: SessionDep) -> Instance:
    instance = Instance(name=body.name, params=body.params.model_dump())
    session.add(instance)
    session.commit()
    session.refresh(instance)
    return instance


@router.get("/", response_model=list[InstanceRead])
def list_instances(session: SessionDep) -> list[Instance]:
    return list(session.exec(select(Instance)).all())


@router.get("/{instance_id}", response_model=InstanceRead)
def get_instance(instance_id: int, session: SessionDep) -> Instance:
    instance = session.get(Instance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return instance


@router.post("/{instance_id}/run", response_model=SolutionRead, status_code=201)
def run_instance(instance_id: int, session: SessionDep) -> SolutionRead:
    return run_solver(instance_id, session)
