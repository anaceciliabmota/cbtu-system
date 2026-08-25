from datetime import time as dt_time

import pandas as pd
import streamlit as st

from line_map import (
    default_point_names,
    matrix_to_segments,
    route_starts_on_upper,
    vertex_label,
    vertices_to_names,
)


def _seconds_to_time(seconds: int) -> dt_time:
    h = (seconds // 3600) % 24
    m = (seconds % 3600) // 60
    return dt_time(h, m)


def _time_to_seconds(t: dt_time) -> int:
    return t.hour * 3600 + t.minute * 60


def params_to_defaults(params: dict) -> dict:
    stmin = params.get("service_time_min", [])
    intervals = params.get("time_intervals", [])
    n = params.get("num_points") if params.get("num_points") is not None else (len(stmin) if stmin else 0)
    names = params.get("point_names") or (default_point_names(n) if n else [])

    station_set = set(params.get("stations", []))
    crossing_set = set(params.get("crossings", []))
    depot_set = set(params.get("depots", []))

    line_points = []
    for i in range(n):
        line_points.append(
            {
                "name": names[i] if i < len(names) else f"Ponto {i}",
                "is_station": i in station_set,
                "is_crossing": i in crossing_set,
                "is_depot": i in depot_set,
                "st_min": stmin[i] if i < len(stmin) else None,
                "st_max": params.get("service_time_max", [])[i]
                if i < len(params.get("service_time_max", []))
                else None,
            }
        )

    segment_costs: list[int] = []
    if n > 1 and params.get("cost_matrix"):
        segment_costs, _ = matrix_to_segments(
            params["cost_matrix"], crossing_set, n
        )

    route_sequences = []
    route_start_upper = []
    for route_vertices in params.get("routes", []):
        route_sequences.append(vertices_to_names(route_vertices, names, n))
        route_start_upper.append(route_starts_on_upper(route_vertices, n))

    initial_idx = params.get("initial_point", 0)
    if names and 0 <= initial_idx < len(names):
        initial_point_name = names[initial_idx]
    elif names:
        initial_point_name = names[0]
    else:
        initial_point_name = ""

    num_trips = params.get("num_trips", [])
    time_intervals = (
        [[_seconds_to_time(s), _seconds_to_time(e)] for s, e in intervals]
        if intervals
        else []
    )

    return {
        "num_trips": num_trips,
        "line_points": line_points,
        "segment_costs": segment_costs,
        "route_sequences": route_sequences,
        "route_start_upper": route_start_upper,
        "demands": params.get("demands", []),
        "time_intervals": time_intervals,
        "max_time": _seconds_to_time(params.get("max_time") or 0),
        "initial_point_name": initial_point_name,
        "alpha": params.get("alpha"),
        "point_names": names,
    }


def _init_line_session(fk: str, defaults: dict) -> None:
    if st.session_state.get("line_fk") != fk:
        st.session_state.line_fk = fk
        st.session_state.line_points = [
            dict(p) for p in defaults.get("line_points", [])
        ]
        st.session_state.segment_costs = list(defaults.get("segment_costs", []))
        routes = [list(r) for r in defaults.get("route_sequences", [])]
        st.session_state.route_sequences = routes if routes else [[]]
        upper = list(defaults.get("route_start_upper", []))
        st.session_state.route_start_upper = (
            upper if upper else [True] * len(st.session_state.route_sequences)
        )
        trips = list(defaults.get("num_trips", []))
        st.session_state.train_trips = trips if trips else [None]
        intervals = defaults.get("time_intervals", [])
        st.session_state.time_intervals = (
            [list(pair) for pair in intervals]
            if intervals
            else [[dt_time(0, 0), dt_time(17, 0)]]
        )


def _move_point(index: int, direction: int) -> None:
    pts = st.session_state.line_points
    new_index = index + direction
    if new_index < 0 or new_index >= len(pts):
        return
    pts[index], pts[new_index] = pts[new_index], pts[index]
    st.rerun()


def inject_app_css() -> None:
    """Wide layout polish + line editor horizontal scroll."""
    st.markdown(
        """
        <style>
        .block-container {
            max-width: 100% !important;
            padding-top: 1.25rem !important;
            padding-left: 1.5rem !important;
            padding-right: 1.5rem !important;
        }
        [data-testid="stHorizontalBlock"]:has(.line-track-row) {
            overflow-x: auto !important;
            overflow-y: hidden !important;
            flex-wrap: nowrap !important;
            gap: 0.35rem !important;
            padding-bottom: 0.75rem;
            -webkit-overflow-scrolling: touch;
            scrollbar-gutter: stable;
        }
        [data-testid="stHorizontalBlock"]:has(.line-track-row) > div[data-testid="column"] {
            flex: 0 0 auto !important;
            width: auto !important;
            min-height: 0 !important;
        }
        [data-testid="stHorizontalBlock"]:has(.line-track-row) > div[data-testid="column"]:nth-child(odd) {
            min-width: 15.75rem;
            max-width: 17.5rem;
        }
        [data-testid="stHorizontalBlock"]:has(.line-track-row) > div[data-testid="column"]:nth-child(even) {
            min-width: 4.75rem;
            max-width: 5.25rem;
            align-self: center;
        }
        [data-testid="stHorizontalBlock"]:has(.line-track-row) [data-testid="stCheckbox"] label,
        [data-testid="stHorizontalBlock"]:has(.line-track-row) [data-testid="stCheckbox"] label p,
        [data-testid="stHorizontalBlock"]:has(.line-track-row) [data-testid="stCheckbox"] label span,
        [data-testid="stHorizontalBlock"]:has(.line-track-row) [data-testid="stCheckbox"] label div {
            white-space: nowrap !important;
        }
        [data-testid="stHorizontalBlock"]:has(.line-track-row) [data-testid="stCheckbox"] {
            min-width: 4.5rem;
        }
        [data-testid="stHorizontalBlock"]:has(.line-roles) {
            gap: 0.25rem !important;
        }
        .line-segment-arrow {
            text-align: center;
            font-size: 1.35rem;
            opacity: 0.55;
            line-height: 1;
            margin: 0 0 0.15rem 0;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _line_editor_css() -> None:
    inject_app_css()


def _render_point_card(
    index: int,
    point: dict,
    fk: str,
    n: int,
) -> int | None:
    """Compact horizontal station card."""
    to_remove = None
    with st.container(border=True):
        head = st.columns([0.45, 6, 0.55])
        head[0].markdown(f"**{index}**")
        point["name"] = head[1].text_input(
            "Nome",
            value=point["name"],
            placeholder="Recife",
            key=f"{fk}_pt_name_{index}",
            label_visibility="collapsed",
        )
        if head[2].button("×", key=f"{fk}_pt_rm_{index}", help="Remover estação"):
            to_remove = index

        st.markdown('<span class="line-roles"></span>', unsafe_allow_html=True)
        r1, r2, r3 = st.columns(3, gap="small")
        point["is_station"] = r1.checkbox(
            "Station",
            value=point["is_station"],
            key=f"{fk}_pt_st_{index}",
        )
        point["is_crossing"] = r2.checkbox(
            "Crossing",
            value=point["is_crossing"],
            key=f"{fk}_pt_x_{index}",
        )
        point["is_depot"] = r3.checkbox(
            "Depot",
            value=point["is_depot"],
            key=f"{fk}_pt_dep_{index}",
        )

        row = st.columns([2, 2, 1, 1], gap="small")
        point["st_min"] = row[0].number_input(
            "Min (s)",
            value=int(point["st_min"]) if point["st_min"] is not None else None,
            min_value=0,
            step=1,
            placeholder="142",
            key=f"{fk}_pt_stmin_{index}",
        )
        point["st_max"] = row[1].number_input(
            "Max (s)",
            value=int(point["st_max"]) if point["st_max"] is not None else None,
            min_value=0,
            step=1,
            placeholder="592",
            key=f"{fk}_pt_stmax_{index}",
        )
        if row[2].button("←", key=f"{fk}_pt_left_{index}", disabled=index == 0, help="Mover à esquerda"):
            _move_point(index, -1)
        if row[3].button("→", key=f"{fk}_pt_right_{index}", disabled=index == n - 1, help="Mover à direita"):
            _move_point(index, 1)
    return to_remove


def _render_segment_connector(
    seg_index: int,
    left_name: str,
    right_name: str,
    fk: str,
) -> None:
    """Narrow column between cards: arrow + distance."""
    while len(st.session_state.segment_costs) <= seg_index:
        st.session_state.segment_costs.append(0)

    st.markdown('<div class="line-segment-arrow">→</div>', unsafe_allow_html=True)
    st.session_state.segment_costs[seg_index] = st.number_input(
        "Dist.",
        value=int(st.session_state.segment_costs[seg_index])
        if st.session_state.segment_costs[seg_index] is not None
        else 0,
        min_value=0,
        step=1,
        key=f"{fk}_seg_{seg_index}",
        help=f"{left_name} → {right_name}",
    )


def render_line_editor(d: dict, fk: str) -> dict | None:
    """Editor da linha: cards horizontais + conectores estreitos entre eles."""
    _init_line_session(fk, d)
    _line_editor_css()

    st.subheader("Linha")
    st.caption(
        "Estações da esquerda para a direita. Role horizontalmente se houver muitas paradas."
    )

    to_remove = None
    points = st.session_state.line_points
    n = len(points)

    if n > 0:
        st.markdown('<span class="line-track-row"></span>', unsafe_allow_html=True)
        cols = st.columns([1] * (n * 2 - 1), gap="small")

        col_idx = 0
        names_snapshot = [p["name"] or f"Ponto {j}" for j, p in enumerate(points)]

        for i, point in enumerate(points):
            with cols[col_idx]:
                rm = _render_point_card(i, point, fk, n)
                if rm is not None:
                    to_remove = rm
            col_idx += 1

            if i < n - 1:
                with cols[col_idx]:
                    _render_segment_connector(
                        i,
                        names_snapshot[i],
                        names_snapshot[i + 1],
                        fk,
                    )
                col_idx += 1

    if to_remove is not None:
        st.session_state.line_points.pop(to_remove)
        n_left = len(st.session_state.line_points)
        st.session_state.segment_costs = st.session_state.segment_costs[: max(n_left - 1, 0)]
        st.rerun()

    add_l, add_c, add_r = st.columns([2, 3, 2])
    with add_c:
        if st.button("+ Adicionar estação à direita", key=f"{fk}_add_point", use_container_width=True):
            idx = len(st.session_state.line_points)
            st.session_state.line_points.append(
                {
                    "name": f"Ponto {idx}",
                    "is_station": True,
                    "is_crossing": False,
                    "is_depot": False,
                    "st_min": None,
                    "st_max": None,
                }
            )
            if len(st.session_state.line_points) > 1:
                st.session_state.segment_costs.append(0)
            st.rerun()

    n = len(st.session_state.line_points)
    if n == 0:
        st.info("Adicione pelo menos uma estação para continuar.")
        return None

    names = [p["name"] for p in st.session_state.line_points]
    st.session_state.segment_costs = st.session_state.segment_costs[: max(n - 1, 0)]

    # Resumo visual compacto da linha montada
    if n > 1:
        parts = [names[0] or "Ponto 0"]
        for i in range(n - 1):
            dist = st.session_state.segment_costs[i]
            parts.append(f"—{dist}→")
            parts.append(names[i + 1] or f"Ponto {i + 1}")
        st.markdown("**Linha:** " + " ".join(parts))

    default_initial = d.get("initial_point_name") or names[0]
    initial_idx = names.index(default_initial) if default_initial in names else 0
    initial_point_name = st.selectbox(
        "Ponto inicial (initial_point)",
        options=names,
        index=initial_idx,
        key=f"{fk}_initial_point",
    )

    return {
        "line_points": st.session_state.line_points,
        "segment_costs": st.session_state.segment_costs,
        "initial_point_name": initial_point_name,
        "names": names,
    }


def render_trains_fields(d: dict, fk: str) -> list[int]:
    _init_line_session(fk, d)

    st.subheader("Trens")
    st.caption("Adicione um card por trem. Em cada um, informe o máximo de viagens.")

    to_remove = None
    trips: list[int | None] = []
    for i, default in enumerate(st.session_state.train_trips):
        with st.container(border=True):
            cols = st.columns([4, 1])
            val = cols[0].number_input(
                f"Trem {i + 1} — máx. viagens",
                value=int(default) if default is not None else None,
                min_value=1,
                step=1,
                placeholder="ex: 6",
                key=f"{fk}_train_trips_{i}",
            )
            trips.append(val)
            if cols[1].button("Remover", key=f"{fk}_train_rm_{i}", disabled=len(st.session_state.train_trips) <= 1):
                to_remove = i

    if to_remove is not None:
        st.session_state.train_trips.pop(to_remove)
        st.rerun()

    if st.button("+ Adicionar trem", key=f"{fk}_add_train"):
        st.session_state.train_trips.append(None)
        st.rerun()

    st.session_state.train_trips = trips
    return [int(v) for v in trips if v is not None]


def render_routes_fields(point_names: list[str], d: dict, fk: str) -> tuple:
    _init_line_session(fk, d)

    st.subheader("Rotas")
    st.caption(
        "Adicione uma rota por vez. Sequência explícita de estações, ida e volta — "
        "ex.: Recife → Afogados → Centro → Afogados → Recife"
    )

    to_remove_route = None
    route_sequences: list[list[str]] = []
    route_start_upper: list[bool] = []

    for ri in range(len(st.session_state.route_sequences)):
        with st.container(border=True):
            head_cols = st.columns([4, 1])
            head_cols[0].markdown(f"**Rota {ri + 1}**")
            if head_cols[1].button(
                "Remover rota",
                key=f"{fk}_route_rm_{ri}",
                disabled=len(st.session_state.route_sequences) <= 1,
            ):
                to_remove_route = ri
                continue

            default_route = st.session_state.route_sequences[ri]
            if not default_route and point_names:
                default_route = [point_names[0]]

            starts_upper = st.checkbox(
                "Inicia na via de ida (upper)",
                value=st.session_state.route_start_upper[ri]
                if ri < len(st.session_state.route_start_upper)
                else True,
                key=f"{fk}_route_{ri}_upper",
                help="Desmarque se a rota começa na via de volta (lower).",
            )
            if ri >= len(st.session_state.route_start_upper):
                st.session_state.route_start_upper.append(starts_upper)
            else:
                st.session_state.route_start_upper[ri] = starts_upper
            route_start_upper.append(starts_upper)

            stops: list[str] = list(default_route)
            to_remove_stop = None
            for si, stop in enumerate(stops):
                cols = st.columns([4, 1])
                idx = point_names.index(stop) if stop in point_names else 0
                stops[si] = cols[0].selectbox(
                    f"Parada {si + 1}",
                    options=point_names,
                    index=idx,
                    key=f"{fk}_route_{ri}_stop_{si}",
                    label_visibility="collapsed",
                )
                if cols[1].button("×", key=f"{fk}_route_{ri}_rm_{si}"):
                    to_remove_stop = si

            if to_remove_stop is not None:
                stops.pop(to_remove_stop)
                st.session_state.route_sequences[ri] = stops
                st.rerun()

            if st.button("+ Parada", key=f"{fk}_route_{ri}_add"):
                stops.append(point_names[0] if point_names else "")
                st.session_state.route_sequences[ri] = stops
                st.rerun()

            st.session_state.route_sequences[ri] = stops
            route_sequences.append(stops)
            if stops:
                st.caption(" → ".join(stops))

    if to_remove_route is not None:
        st.session_state.route_sequences.pop(to_remove_route)
        if to_remove_route < len(st.session_state.route_start_upper):
            st.session_state.route_start_upper.pop(to_remove_route)
        st.rerun()

    if st.button("+ Adicionar rota", key=f"{fk}_add_route"):
        seed = list(point_names[:2]) if len(point_names) >= 2 else list(point_names)
        st.session_state.route_sequences.append(seed)
        st.session_state.route_start_upper.append(True)
        st.rerun()

    return route_sequences, route_start_upper


def render_demands_fields(
    names: list[str],
    num_intervals: int,
    defaults: list[list[int]],
    fk: str,
) -> list[list[int]]:
    n = len(names)
    matrix_size = n * 2
    st.markdown(f"**Demands ({matrix_size} nós × {num_intervals} intervalos)**")

    result = []
    for v in range(matrix_size):
        row_defaults = defaults[v] if v < len(defaults) else []
        label = vertex_label(names, v, n)
        cols = st.columns(num_intervals)
        row = []
        for h in range(num_intervals):
            val = cols[h].number_input(
                f"{label} / int {h}",
                value=int(row_defaults[h]) if h < len(row_defaults) else None,
                min_value=0,
                step=1,
                placeholder="ex: 11",
                key=f"{fk}_demand_{v}_{h}",
            )
            row.append(val)
        result.append(row)

    return [[int(v) for v in row if v is not None] for row in result]


def render_intervals_fields(d: dict, fk: str) -> list[list[int]]:
    _init_line_session(fk, d)

    st.subheader("Intervalos de tempo")
    st.caption("Adicione um intervalo por período de demanda (ex.: horário de pico).")

    to_remove = None
    intervals: list[list[int]] = []

    for i, pair in enumerate(st.session_state.time_intervals):
        default_start = pair[0] if len(pair) > 0 else dt_time(0, 0)
        default_end = pair[1] if len(pair) > 1 else dt_time(17, 0)
        with st.container(border=True):
            cols = st.columns([3, 3, 1])
            start = cols[0].time_input(
                f"Intervalo {i + 1} — início",
                value=default_start,
                step=60,
                key=f"{fk}_int_start_{i}",
            )
            end = cols[1].time_input(
                f"Intervalo {i + 1} — fim",
                value=default_end,
                step=60,
                key=f"{fk}_int_end_{i}",
            )
            if cols[2].button(
                "Remover",
                key=f"{fk}_int_rm_{i}",
                disabled=len(st.session_state.time_intervals) <= 1,
            ):
                to_remove = i
            else:
                intervals.append([_time_to_seconds(start), _time_to_seconds(end)])

    if to_remove is not None:
        st.session_state.time_intervals.pop(to_remove)
        st.rerun()

    if st.button("+ Adicionar intervalo", key=f"{fk}_add_interval"):
        st.session_state.time_intervals.append([dt_time(0, 0), dt_time(17, 0)])
        st.rerun()

    st.session_state.time_intervals = [
        [_seconds_to_time(iv[0]), _seconds_to_time(iv[1])] for iv in intervals
    ]
    return intervals


def render_free_fields(d: dict, fk: str) -> dict:
    col1, col2 = st.columns(2)
    max_time_val = col1.time_input(
        "max_time",
        value=d["max_time"],
        step=60,
        key=f"{fk}_max_time",
    )
    alpha = col2.number_input(
        "alpha",
        value=d["alpha"],
        min_value=0,
        step=1,
        placeholder="ex: 41",
        key=f"{fk}_alpha",
    )
    return {
        "max_time": _time_to_seconds(max_time_val),
        "alpha": alpha,
    }


def render_solution(solution: dict, point_names: list[str] | None = None) -> None:
    result = solution.get("result", {})
    st.subheader("Solução")
    col1, col2 = st.columns(2)
    col1.metric("Solution value", result.get("solution_value", "—"))
    col2.metric("Tempo de execução (s)", result.get("total_time", "—"))
    for train in result.get("trains", []):
        with st.expander(f"Trem {train['id']}"):
            for trip in train.get("trips", []):
                st.markdown(f"**Viagem {trip['id']}**")
                stops = trip.get("stops", [])
                if stops:
                    rows = []
                    for stop in stops:
                        p = stop["point"]
                        if point_names and 0 <= p < len(point_names):
                            label = point_names[p]
                        else:
                            label = str(p)
                        rows.append(
                            {
                                "Estação": label,
                                "Ponto": p,
                                "Chegada (s)": stop["arrival"],
                                "Partida (s)": stop["departure"],
                            }
                        )
                    st.dataframe(
                        pd.DataFrame(rows),
                        use_container_width=True,
                        hide_index=True,
                    )
