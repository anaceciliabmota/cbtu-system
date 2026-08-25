"""Compile the Line Planner visual model into solver InstanceParams."""

from __future__ import annotations

from typing import Any

from compiler.line_map import (
    compile_line,
    matrix_to_segments,
    route_starts_on_upper,
    vertices_to_point_sequence,
)

LINE_KEY = "line"


class CompileError(ValueError):
    """Visual model cannot be compiled into a solver instance."""


def params_for_solver(params: dict[str, Any]) -> dict[str, Any]:
    """Drop UI-only fields before calling the solver."""
    return {k: v for k, v in params.items() if k != LINE_KEY}


def _station_by_id(stations: list[dict[str, Any]], station_id: str) -> dict[str, Any] | None:
    return next((s for s in stations if s.get("id") == station_id), None)


def _unique_names(names: list[str]) -> None:
    if any(not str(n).strip() for n in names):
        raise CompileError("Todo ponto precisa de um nome.")
    if len(set(names)) != len(names):
        raise CompileError("Os nomes dos pontos devem ser únicos.")


def _segment_costs(line: dict[str, Any]) -> list[int]:
    stations: list[dict[str, Any]] = line.get("stations") or []
    segments: list[dict[str, Any]] = line.get("segments") or []
    costs: list[int] = []
    for i in range(len(stations) - 1):
        a = stations[i]["id"]
        b = stations[i + 1]["id"]
        seg = next(
            (
                s
                for s in segments
                if (s.get("fromId") == a and s.get("toId") == b)
                or (s.get("fromId") == b and s.get("toId") == a)
            ),
            None,
        )
        if seg is None:
            raise CompileError(
                f"Trecho ausente entre '{stations[i].get('name')}' e '{stations[i + 1].get('name')}'."
            )
        costs.append(int(seg.get("distance") or 0))
    return costs


def _demand_matrix(line: dict[str, Any]) -> list[list[int]]:
    stations: list[dict[str, Any]] = line.get("stations") or []
    intervals: list[dict[str, Any]] = line.get("intervals") or []
    demand: dict[str, Any] = line.get("demand") or {}
    n = len(stations)
    matrix: list[list[int]] = []
    for vertex in range(n * 2):
        point = vertex if vertex < n else vertex - n
        direction = "ida" if vertex < n else "volta"
        station_id = stations[point]["id"]
        row: list[int] = []
        for interval in intervals:
            key = f"{station_id}:{direction}:{interval['id']}"
            row.append(int(demand.get(key) or 0))
        matrix.append(row)
    return matrix


def validate_visual_line(line: dict[str, Any]) -> None:
    stations: list[dict[str, Any]] = line.get("stations") or []
    if not stations:
        raise CompileError("Adicione pelo menos um ponto na linha.")

    names = [str(s.get("name", "")).strip() for s in stations]
    _unique_names(names)

    roles_ok = any("crossing" in (s.get("roles") or []) for s in stations)
    if not roles_ok:
        raise CompileError("Marque pelo menos um ponto como cruzamento.")

    depots = [s for s in stations if "depot" in (s.get("roles") or [])]
    if not depots:
        raise CompileError("Marque pelo menos um ponto como depósito.")

    initial_id = line.get("initialStationId") or ""
    initial = _station_by_id(stations, initial_id)
    if not initial:
        raise CompileError("Selecione o depósito inicial.")
    if "depot" not in (initial.get("roles") or []):
        raise CompileError("O ponto inicial precisa ser um depósito.")

    trains: list[dict[str, Any]] = line.get("trains") or []
    if not trains:
        raise CompileError("Adicione pelo menos um trem.")
    if any(int(t.get("maxTrips") or 0) < 1 for t in trains):
        raise CompileError("Cada trem precisa de ao menos uma viagem máxima.")

    routes: list[dict[str, Any]] = line.get("routes") or []
    if not routes:
        raise CompileError("Adicione pelo menos uma rota.")
    for i, route in enumerate(routes, start=1):
        seq = route.get("sequence") or []
        if len(seq) < 2:
            raise CompileError(f"A rota {i} precisa de ao menos dois pontos.")
        first = _station_by_id(stations, seq[0])
        last = _station_by_id(stations, seq[-1])
        if first is None or last is None:
            raise CompileError(f"A rota {i} referencia um ponto inexistente.")
        if "depot" not in (first.get("roles") or []):
            raise CompileError(
                f"A rota {i} deve começar em um depósito — {first.get('name')} não é depósito."
            )
        if "depot" not in (last.get("roles") or []):
            raise CompileError(
                f"A rota {i} deve terminar em um depósito — {last.get('name')} não é depósito."
            )

    intervals: list[dict[str, Any]] = line.get("intervals") or []
    if not intervals:
        raise CompileError("Adicione pelo menos um intervalo de demanda.")

    if line.get("alpha") is None:
        raise CompileError("O espaçamento mínimo (alpha) é obrigatório.")

    horizon = int(line.get("horizon") or 0)
    day_start = int(line.get("dayStart") or 0)
    if horizon <= day_start:
        raise CompileError("O fim do dia precisa ser depois do início.")


def solver_params_from_line(line: dict[str, Any]) -> dict[str, Any]:
    """Compile a visual line into solver params (without embedding the line)."""
    validate_visual_line(line)

    stations: list[dict[str, Any]] = line["stations"]
    names = [str(s["name"]).strip() for s in stations]
    id_to_name = {s["id"]: str(s["name"]).strip() for s in stations}

    station_names = [s["name"] for s in stations if "station" in (s.get("roles") or [])]
    crossing_names = [s["name"] for s in stations if "crossing" in (s.get("roles") or [])]
    depot_names = [s["name"] for s in stations if "depot" in (s.get("roles") or [])]

    initial = _station_by_id(stations, line["initialStationId"])
    assert initial is not None

    routes = line.get("routes") or []
    route_name_sequences: list[list[str]] = []
    route_start_upper: list[bool] = []
    for route in routes:
        seq = route.get("sequence") or []
        missing = [sid for sid in seq if sid not in id_to_name]
        if missing:
            raise CompileError("A rota referencia um ponto inexistente.")
        route_name_sequences.append([id_to_name[sid] for sid in seq])
        # inbound/volta starts on the lower track (start_on_upper=False)
        route_start_upper.append(not bool(route.get("startsInbound")))

    compiled = compile_line(
        names=names,
        stations=station_names,
        crossings=crossing_names,
        depots=depot_names,
        initial_point=str(initial["name"]).strip(),
        segment_costs=_segment_costs(line),
        route_name_sequences=route_name_sequences,
        service_time_min=[int(s.get("dwellMin") or 0) for s in stations],
        service_time_max=[int(s.get("dwellMax") or 0) for s in stations],
        demands=_demand_matrix(line),
        route_start_upper=route_start_upper,
    )

    offset = int(line.get("dayStart") or 0)
    intervals = line.get("intervals") or []
    adjusted_intervals = [
        [int(iv["start"]) - offset, int(iv["end"]) - offset] for iv in intervals
    ]

    trains = line.get("trains") or []
    return {
        "num_trains": len(trains),
        "num_trips": [int(t.get("maxTrips") or 1) for t in trains],
        "time_intervals": adjusted_intervals,
        "num_points": compiled["num_points"],
        "point_names": compiled["point_names"],
        "stations": compiled["stations"],
        "crossings": compiled["crossings"],
        "depots": compiled["depots"],
        "initial_point": compiled["initial_point"],
        "routes": compiled["routes"],
        "service_time_min": compiled["service_time_min"],
        "service_time_max": compiled["service_time_max"],
        "cost_matrix": compiled["cost_matrix"],
        "demands": compiled["demands"],
        "max_time": int(line.get("horizon") or 0) - offset,
        "alpha": int(line.get("alpha") or 0),
    }


def compile_visual_line(line: dict[str, Any], *, require_complete: bool = True) -> dict[str, Any]:
    """Return params dict stored on Instance, always embedding the visual line.

    Incomplete drafts keep only `{line: ...}` when require_complete is False.
    """
    payload = dict(line)
    if require_complete:
        compiled = solver_params_from_line(payload)
        compiled[LINE_KEY] = payload
        return compiled

    try:
        compiled = solver_params_from_line(payload)
        compiled[LINE_KEY] = payload
        return compiled
    except (CompileError, ValueError):
        return {LINE_KEY: payload}


def line_from_params(
    name: str,
    params: dict[str, Any],
    *,
    instance_id: int | str | None = None,
    created_at: str | None = None,
    last_run: str = "never",
) -> dict[str, Any]:
    """Return the visual line stored in params, or reconstruct one from compiled fields."""
    stored = params.get(LINE_KEY)
    if isinstance(stored, dict) and stored.get("stations") is not None:
        line = dict(stored)
        if instance_id is not None:
            line["id"] = str(instance_id)
        line["name"] = name
        if created_at and not line.get("updatedAt"):
            line["updatedAt"] = created_at
        line["lastRun"] = last_run
        return line
    return _reconstruct_line(name, params, instance_id, created_at, last_run)


def _reconstruct_line(
    name: str,
    params: dict[str, Any],
    instance_id: int | str | None,
    created_at: str | None,
    last_run: str,
) -> dict[str, Any]:
    n = int(params.get("num_points") or 0)
    names = params.get("point_names") or [f"Ponto {i}" for i in range(n)]
    station_set = set(params.get("stations") or [])
    crossing_set = set(params.get("crossings") or [])
    depot_set = set(params.get("depots") or [])
    st_min = params.get("service_time_min") or []
    st_max = params.get("service_time_max") or []

    stations: list[dict[str, Any]] = []
    for i in range(n):
        roles: list[str] = []
        if i in station_set:
            roles.append("station")
        if i in crossing_set:
            roles.append("crossing")
        if i in depot_set:
            roles.append("depot")
        if not roles:
            roles = ["station"]
        stations.append(
            {
                "id": f"st-{i}",
                "name": names[i] if i < len(names) else f"Ponto {i}",
                "roles": roles,
                "dwellMin": int(st_min[i]) if i < len(st_min) else 120,
                "dwellMax": int(st_max[i]) if i < len(st_max) else 180,
            }
        )

    segment_costs: list[int] = []
    if n > 1 and params.get("cost_matrix"):
        segment_costs, _ = matrix_to_segments(params["cost_matrix"], crossing_set, n)

    segments = []
    for i in range(n - 1):
        cost = segment_costs[i] if i < len(segment_costs) else 0
        segments.append(
            {
                "fromId": stations[i]["id"],
                "toId": stations[i + 1]["id"],
                "distance": int(cost),
            }
        )

    routes: list[dict[str, Any]] = []
    for i, verts in enumerate(params.get("routes") or []):
        point_seq = vertices_to_point_sequence(verts, n)
        routes.append(
            {
                "id": f"rt-{i}",
                "name": f"Rota {i + 1}",
                "sequence": [stations[p]["id"] for p in point_seq if 0 <= p < n],
                "startsInbound": not route_starts_on_upper(verts, n),
            }
        )

    trains: list[dict[str, Any]] = []
    for i, max_trips in enumerate(params.get("num_trips") or []):
        trains.append(
            {
                "id": f"tr-{i + 1}",
                "name": f"Trem {i + 1}",
                "maxTrips": int(max_trips),
                "routeId": routes[0]["id"] if routes else "",
            }
        )

    intervals: list[dict[str, Any]] = []
    for i, pair in enumerate(params.get("time_intervals") or []):
        start, end = pair[0], pair[1]
        intervals.append(
            {
                "id": f"iv-{i}",
                "name": f"Período {i + 1}",
                "start": int(start),
                "end": int(end),
                "color": "peak" if i % 2 == 0 else "offpeak",
            }
        )

    demand: dict[str, int] = {}
    demands = params.get("demands") or []
    for vertex, row in enumerate(demands):
        if n == 0:
            break
        point = vertex if vertex < n else vertex - n
        if point < 0 or point >= n:
            continue
        direction = "ida" if vertex < n else "volta"
        for j, interval in enumerate(intervals):
            value = int(row[j]) if j < len(row) else 0
            if value:
                demand[f"{stations[point]['id']}:{direction}:{interval['id']}"] = value

    initial_idx = int(params.get("initial_point") or 0)
    initial_id = stations[initial_idx]["id"] if 0 <= initial_idx < n else ""

    return {
        "id": str(instance_id) if instance_id is not None else "inst-reconstructed",
        "name": name,
        "lineName": "",
        "updatedAt": created_at or "",
        "lastRun": last_run,
        "stations": stations,
        "segments": segments,
        "routes": routes,
        "trains": trains,
        "intervals": intervals,
        "demand": demand,
        "dayStart": 0,
        "horizon": int(params.get("max_time") or 0),
        "alpha": int(params.get("alpha") or 0),
        "minHeadway": 360,
        "initialStationId": initial_id,
    }
