from datetime import datetime, timezone
from typing import Any

from sqlmodel import JSON, Column, Field, SQLModel


class InstanceParams(SQLModel):
    num_trains: int
    num_trips: list[int]
    time_intervals: list[list[int]]
    stations: list[int]
    crossings: list[int]
    depots: list[int]
    initial_point: int
    routes: list[list[int]]
    service_time_min: list[int]
    service_time_max: list[int]
    cost_matrix: list[list[int]]
    demands: list[int]
    max_time: int
    alpha: int


class Instance(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    params: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class InstanceCreate(SQLModel):
    name: str
    params: InstanceParams

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "instancia-1",
                "params": {
                    "num_trains": 2,
                    "num_trips": [6, 6],
                    "time_intervals": [[0, 61598]],
                    "stations": [0, 4, 2, 1, 3],
                    "crossings": [0, 4, 2],
                    "depots": [0, 4],
                    "initial_point": 0,
                    "routes": [
                        [0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 0],
                        [9, 8, 7, 6, 5, 0, 1, 2, 3, 4, 9],
                    ],
                    "service_time_min": [142, 119, 119, 119, 142],
                    "service_time_max": [592, 592, 592, 592, 592],
                    "cost_matrix": [
                        [-1, 694, -1, -1, -1,  0, -1, -1, -1, -1],
                        [-1,  -1, 618, -1, -1, -1, -1, -1, -1, -1],
                        [-1,  -1,  -1, 703, -1, -1, -1, -1, -1, -1],
                        [-1,  -1,  -1,  -1, 664, -1, -1, -1, -1, -1],
                        [-1,  -1,  -1,  -1,  -1, -1, -1, -1, -1,  0],
                        [  0, -1,  -1,  -1,  -1, -1, -1, -1, -1, -1],
                        [-1,  -1,  -1,  -1,  -1, 694, -1, -1, -1, -1],
                        [-1,  -1,  -1,  -1,  -1, -1, 618, -1, -1, -1],
                        [-1,  -1,  -1,  -1,  -1, -1, -1, 703, -1, -1],
                        [-1,  -1,  -1,  -1,   0, -1, -1, -1, 664, -1],
                    ],
                    "demands": [11, 11, 11, 11, 0, 0, 11, 11, 11, 11],
                    "max_time": 61598,
                    "alpha": 41,
                },
            }
        }
    }


class InstanceRead(SQLModel):
    id: int
    name: str
    created_at: datetime
    params: InstanceParams
