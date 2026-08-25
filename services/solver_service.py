from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm.attributes import flag_modified
from sqlmodel import Session

from compiler.visual import CompileError, params_for_solver, solver_params_from_line
from models.instance import Instance
from models.solution import Solution
from solver.solver import solve


def run_solver(instance_id: int, session: Session) -> Solution:
    instance = session.get(Instance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    try:
        compiled = _compiled_params(instance)
    except (CompileError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    line = compiled.get("line")
    if isinstance(line, dict):
        line = dict(line)
        line["lastRun"] = "success"
        line["updatedAt"] = datetime.now(timezone.utc).isoformat()
        compiled = dict(compiled)
        compiled["line"] = line

    instance.params = compiled
    flag_modified(instance, "params")
    result = solve(params_for_solver(compiled))
    solution = Solution(instance_id=instance_id, status="ok", result=result)
    session.add(solution)
    session.add(instance)
    session.commit()
    session.refresh(solution)
    return solution


def _compiled_params(instance: Instance) -> dict:
    params = dict(instance.params or {})
    line = params.get("line")
    if isinstance(line, dict) and line.get("stations") is not None:
        compiled = solver_params_from_line(line)
        compiled["line"] = line
        return compiled
    return params
