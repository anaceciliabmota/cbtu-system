from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm.attributes import flag_modified
from sqlmodel import Session, select

from compiler.visual import compile_visual_line, line_from_params
from database import get_session
from models.instance import Instance, InstanceCreate, InstanceRead, InstanceUpdate
from models.solution import Solution, SolutionRead
from services.solver_service import run_solver

router = APIRouter(prefix="/instances", tags=["instances"])

SessionDep = Annotated[Session, Depends(get_session)]


def _latest_solution_times(session: Session) -> dict[int, datetime]:
    times: dict[int, datetime] = {}
    for solution in session.exec(select(Solution)).all():
        current = times.get(solution.instance_id)
        if current is None or solution.created_at > current:
            times[solution.instance_id] = solution.created_at
    return times


def _last_run(instance: Instance, latest: datetime | None) -> str:
    line = (instance.params or {}).get("line") or {}
    stored = line.get("lastRun")
    if latest is None:
        return "never"
    if stored == "stale":
        return "stale"
    updated = line.get("updatedAt")
    if updated:
        try:
            updated_dt = datetime.fromisoformat(str(updated).replace("Z", "+00:00"))
            latest_dt = latest if latest.tzinfo else latest.replace(tzinfo=timezone.utc)
            if updated_dt.tzinfo is None:
                updated_dt = updated_dt.replace(tzinfo=timezone.utc)
            if updated_dt > latest_dt:
                return "stale"
        except ValueError:
            pass
    return "success"


def to_instance_read(instance: Instance, latest: datetime | None = None) -> InstanceRead:
    last_run = _last_run(instance, latest)
    created = instance.created_at.isoformat() if instance.created_at else None
    line = line_from_params(
        instance.name,
        instance.params or {},
        instance_id=instance.id,
        created_at=created,
        last_run=last_run,
    )
    return InstanceRead(
        id=instance.id,
        name=instance.name,
        created_at=instance.created_at,
        params=instance.params or {},
        line=line,
        last_run=last_run,
    )


def _store_payload(name: str, body_params: Any, body_line: dict[str, Any] | None) -> dict[str, Any]:
    if body_line is not None:
        line = dict(body_line)
        line["name"] = name
        return compile_visual_line(line, require_complete=False)
    return body_params.model_dump(exclude_none=True) if body_params is not None else {}


@router.post("/", response_model=InstanceRead, status_code=201)
def create_instance(body: InstanceCreate, session: SessionDep) -> InstanceRead:
    params = _store_payload(body.name, body.params, body.line)
    instance = Instance(name=body.name, params=params)
    session.add(instance)
    session.commit()
    session.refresh(instance)
    if body.line is not None:
        line = dict((instance.params or {}).get("line") or body.line)
        line["id"] = str(instance.id)
        stored = dict(instance.params or {})
        stored["line"] = line
        instance.params = stored
        flag_modified(instance, "params")
        session.add(instance)
        session.commit()
        session.refresh(instance)
    return to_instance_read(instance)


@router.get("/", response_model=list[InstanceRead])
def list_instances(session: SessionDep) -> list[InstanceRead]:
    latest = _latest_solution_times(session)
    return [
        to_instance_read(inst, latest.get(inst.id) if inst.id is not None else None)
        for inst in session.exec(select(Instance)).all()
    ]


@router.get("/{instance_id}", response_model=InstanceRead)
def get_instance(instance_id: int, session: SessionDep) -> InstanceRead:
    instance = session.get(Instance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    latest = _latest_solution_times(session).get(instance_id)
    return to_instance_read(instance, latest)


@router.delete("/{instance_id}", status_code=204)
def delete_instance(instance_id: int, session: SessionDep) -> None:
    instance = session.get(Instance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    for solution in session.exec(select(Solution).where(Solution.instance_id == instance_id)).all():
        session.delete(solution)
    session.delete(instance)
    session.commit()


@router.put("/{instance_id}", response_model=InstanceRead)
def update_instance(instance_id: int, body: InstanceUpdate, session: SessionDep) -> InstanceRead:
    instance = session.get(Instance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    instance.name = body.name
    instance.params = _store_payload(body.name, body.params, body.line)
    if body.line is not None:
        line = dict((instance.params or {}).get("line") or body.line)
        line["id"] = str(instance.id)
        stored = dict(instance.params or {})
        stored["line"] = line
        instance.params = stored
        flag_modified(instance, "params")
    session.commit()
    session.refresh(instance)
    latest = _latest_solution_times(session).get(instance_id)
    return to_instance_read(instance, latest)


@router.get("/{instance_id}/solutions", response_model=list[SolutionRead])
def list_instance_solutions(instance_id: int, session: SessionDep) -> list[Solution]:
    instance = session.get(Instance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return list(
        session.exec(
            select(Solution)
            .where(Solution.instance_id == instance_id)
            .order_by(Solution.created_at.desc())
        ).all()
    )


@router.post("/{instance_id}/run", response_model=SolutionRead, status_code=201)
def run_instance(instance_id: int, session: SessionDep) -> SolutionRead:
    return run_solver(instance_id, session)
