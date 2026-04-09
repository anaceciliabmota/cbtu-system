from fastapi import HTTPException
from sqlmodel import Session

from models.instance import Instance
from models.solution import Solution
from solver.solver import solve


def run_solver(instance_id: int, session: Session) -> Solution:
    instance = session.get(Instance, instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")

    result = solve(instance.params)
    solution = Solution(instance_id=instance_id, status="ok", result=result)
    session.add(solution)
    session.commit()
    session.refresh(solution)
    return solution
