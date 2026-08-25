"""Pure translation between named line model and solver vertex indices."""

from __future__ import annotations


def upper_vertex(point: int) -> int:
    return point


def lower_vertex(point: int, n: int) -> int:
    return point + n


def vertex_to_point(vertex: int, n: int) -> int:
    return vertex if vertex < n else vertex - n


def is_reversal_pair(v1: int, v2: int, n: int) -> bool:
    return abs(v1 - v2) == n and vertex_to_point(v1, n) == vertex_to_point(v2, n)


def default_point_names(n: int) -> list[str]:
    return [f"Ponto {i}" for i in range(n)]


def names_to_indices(names: list[str], route_names: list[str]) -> list[int]:
    name_to_idx = {name: i for i, name in enumerate(names)}
    missing = [name for name in route_names if name not in name_to_idx]
    if missing:
        raise ValueError(f"Nome(s) desconhecido(s) na rota: {', '.join(missing)}")
    return [name_to_idx[name] for name in route_names]


def role_indices(names: list[str], selected_names: list[str]) -> list[int]:
    name_to_idx = {name: i for i, name in enumerate(names)}
    return [name_to_idx[name] for name in selected_names if name in name_to_idx]


def names_to_vertices(
    route_points: list[int],
    crossing_indices: set[int],
    n: int,
    *,
    start_on_upper: bool = True,
) -> list[int]:
    """Expand explicit point sequence to vertex sequence (2N nodes)."""
    if not route_points:
        return []

    if len(route_points) == 1:
        p = route_points[0]
        return [upper_vertex(p) if start_on_upper else lower_vertex(p, n)]

    on_upper = start_on_upper
    direction = 0

    def current_vertex(point: int) -> int:
        return upper_vertex(point) if on_upper else lower_vertex(point, n)

    vertices = [current_vertex(route_points[0])]

    for idx in range(1, len(route_points)):
        prev_point = route_points[idx - 1]
        next_point = route_points[idx]

        if next_point > prev_point:
            step_dir = 1
        elif next_point < prev_point:
            step_dir = -1
        else:
            step_dir = direction

        if direction == 0:
            direction = step_dir

        if step_dir != direction:
            if prev_point not in crossing_indices:
                raise ValueError(
                    f"Não é possível inverter a via no ponto {prev_point}: não é crossing."
                )
            on_upper = not on_upper
            direction = step_dir
            reversal_v = current_vertex(prev_point)
            if vertices[-1] != reversal_v:
                vertices.append(reversal_v)

        target_v = upper_vertex(next_point) if on_upper else lower_vertex(next_point, n)
        if vertices[-1] != target_v:
            vertices.append(target_v)

        direction = step_dir

    start_point = route_points[0]
    end_point = route_points[-1]
    start_v = upper_vertex(start_point) if start_on_upper else lower_vertex(start_point, n)

    if start_point == end_point and vertices[-1] != start_v:
        if end_point not in crossing_indices:
            raise ValueError(
                f"Não é possível fechar a rota no ponto {end_point}: não é crossing."
            )
        vertices.append(start_v)

    return vertices


def vertices_to_point_sequence(vertices: list[int], n: int) -> list[int]:
    """Collapse vertex route to explicit point-index sequence."""
    if not vertices:
        return []

    points: list[int] = []
    for i, vertex in enumerate(vertices):
        point = vertex_to_point(vertex, n)
        if i > 0:
            prev_vertex = vertices[i - 1]
            if is_reversal_pair(prev_vertex, vertex, n):
                continue
        if not points or points[-1] != point:
            points.append(point)

    return points


def vertices_to_names(vertices: list[int], names: list[str], n: int) -> list[str]:
    point_seq = vertices_to_point_sequence(vertices, n)
    return [names[p] for p in point_seq if 0 <= p < len(names)]


def segments_to_matrix(
    segment_costs: list[int],
    crossing_indices: set[int],
    n: int,
    reversal_costs: dict[int, int] | None = None,
) -> list[list[int]]:
    """Build 2N cost matrix from N-1 adjacent segment costs."""
    size = n * 2
    matrix = [[-1] * size for _ in range(size)]
    reversal_costs = reversal_costs or {}

    for i in range(n - 1):
        cost = segment_costs[i]
        matrix[i][i + 1] = cost
        lo = lower_vertex(i + 1, n)
        hi = lower_vertex(i, n)
        matrix[lo][hi] = cost

    for point in crossing_indices:
        if 0 <= point < n:
            rev_cost = reversal_costs.get(point, 0)
            up = upper_vertex(point)
            lo = lower_vertex(point, n)
            matrix[up][lo] = rev_cost
            matrix[lo][up] = rev_cost

    return matrix


def matrix_to_segments(
    matrix: list[list[int]],
    crossing_indices: set[int],
    n: int,
) -> tuple[list[int], dict[int, int]]:
    """Extract segment and reversal costs from cost matrix."""
    segment_costs: list[int] = []
    for i in range(n - 1):
        cost = matrix[i][i + 1]
        segment_costs.append(cost if cost != -1 else 0)

    reversal_costs: dict[int, int] = {}
    for point in sorted(crossing_indices):
        if 0 <= point < n:
            up = upper_vertex(point)
            lo = lower_vertex(point, n)
            cost = matrix[up][lo]
            if cost != -1:
                reversal_costs[point] = cost

    return segment_costs, reversal_costs


def route_starts_on_upper(vertices: list[int], n: int) -> bool:
    if not vertices:
        return True
    return vertices[0] < n


def vertex_label(names: list[str], vertex: int, n: int) -> str:
    point = vertex_to_point(vertex, n)
    name = names[point] if 0 <= point < len(names) else f"Ponto {point}"
    direction = "ida" if vertex < n else "volta"
    return f"{name} ({direction})"


def compile_line(
    names: list[str],
    stations: list[str],
    crossings: list[str],
    depots: list[str],
    initial_point: str,
    segment_costs: list[int],
    route_name_sequences: list[list[str]],
    service_time_min: list[int],
    service_time_max: list[int],
    demands: list[list[int]],
    reversal_costs: dict[int, int] | None = None,
    route_start_upper: list[bool] | None = None,
) -> dict:
    """Compile visual line model to solver InstanceParams fields."""
    n = len(names)
    station_idx = role_indices(names, stations)
    crossing_idx = set(role_indices(names, crossings))
    depot_idx = role_indices(names, depots)

    if initial_point not in names:
        raise ValueError(f"Ponto inicial desconhecido: {initial_point}")

    routes = []
    for i, route_names in enumerate(route_name_sequences):
        route_points = names_to_indices(names, route_names)
        start_upper = (
            route_start_upper[i]
            if route_start_upper is not None and i < len(route_start_upper)
            else True
        )
        routes.append(
            names_to_vertices(route_points, crossing_idx, n, start_on_upper=start_upper)
        )

    cost_matrix = segments_to_matrix(segment_costs, crossing_idx, n, reversal_costs)

    return {
        "num_points": n,
        "point_names": names,
        "stations": station_idx,
        "crossings": sorted(crossing_idx),
        "depots": depot_idx,
        "initial_point": names.index(initial_point),
        "routes": routes,
        "service_time_min": service_time_min,
        "service_time_max": service_time_max,
        "cost_matrix": cost_matrix,
        "demands": demands,
    }
