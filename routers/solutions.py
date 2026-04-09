from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models.solution import Solution, SolutionRead

router = APIRouter(prefix="/solutions", tags=["solutions"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/", response_model=list[SolutionRead])
def list_solutions(session: SessionDep) -> list[Solution]:
    return list(session.exec(select(Solution)).all())


@router.get("/{solution_id}", response_model=SolutionRead)
def get_solution(solution_id: int, session: SessionDep) -> Solution:
    solution = session.get(Solution, solution_id)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    return solution
