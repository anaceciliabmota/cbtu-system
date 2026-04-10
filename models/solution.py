from datetime import datetime, timezone
from typing import Any

from sqlmodel import JSON, Column, Field, SQLModel


class Stop(SQLModel):
    point: int
    arrival: int
    departure: int


class Trip(SQLModel):
    id: int
    stops: list[Stop]


class TrainSolution(SQLModel):
    id: int
    trips: list[Trip]


class SolutionResult(SQLModel):
    total_time: float
    solution_value: int
    trains: list[TrainSolution]


class Solution(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    instance_id: int = Field(foreign_key="instance.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str
    result: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class SolutionRead(SQLModel):
    id: int
    instance_id: int
    created_at: datetime
    status: str
    result: SolutionResult
