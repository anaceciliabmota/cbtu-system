import pandas as pd
import streamlit as st

COLS_PER_ROW = 5


def params_to_defaults(params: dict) -> dict:
    stmin = params.get("service_time_min", [])
    intervals = params.get("time_intervals", [])
    return {
        "num_trains": params.get("num_trains"),
        "num_points": params["num_points"] if "num_points" in params else (len(stmin) if stmin else None),
        "num_intervals": len(intervals) if intervals else None,
        "num_routes": len(params.get("routes", [])) or None,
        "num_trips": params.get("num_trips", []),
        "routes": params.get("routes", []),
        "service_time_min": params.get("service_time_min", []),
        "service_time_max": params.get("service_time_max", []),
        "cost_matrix": params.get("cost_matrix", []),
        "demands": params.get("demands", []),
        "time_intervals": intervals,
        "stations": ", ".join(str(x) for x in params.get("stations", [])),
        "crossings": ", ".join(str(x) for x in params.get("crossings", [])),
        "depots": ", ".join(str(x) for x in params.get("depots", [])),
        "initial_point": params.get("initial_point"),
        "max_time": params.get("max_time"),
        "alpha": params.get("alpha"),
    }


def _number_inputs_in_rows(label: str, n: int, defaults: list, key_prefix: str, placeholder: str = "") -> list[int | None]:
    st.markdown(f"**{label}**")
    values = []
    for row_start in range(0, n, COLS_PER_ROW):
        indices = range(row_start, min(row_start + COLS_PER_ROW, n))
        cols = st.columns(len(indices))
        for j, i in enumerate(indices):
            val = cols[j].number_input(
                f"{i}",
                value=int(defaults[i]) if i < len(defaults) else None,
                min_value=0,
                step=1,
                placeholder=placeholder,
                key=key_prefix + str(i),
            )
            values.append(val)
    return values


def render_base_fields(d: dict, fk: str) -> tuple:
    col1, col2, col3, col4 = st.columns(4)
    num_trains = col1.number_input("Número de trens", value=d["num_trains"], min_value=1, step=1, placeholder="ex: 2", key=f"{fk}_num_trains")
    num_routes = col2.number_input("Número de rotas", value=d["num_routes"], min_value=1, step=1, placeholder="ex: 7", key=f"{fk}_num_routes")
    num_points = col3.number_input("Número de pontos", value=d["num_points"], min_value=1, step=1, placeholder="ex: 5", key=f"{fk}_num_points")
    num_intervals = col4.number_input("Número de intervalos", value=d["num_intervals"], min_value=1, step=1, placeholder="ex: 1", key=f"{fk}_num_intervals")
    return num_trains, num_routes, num_points, num_intervals


def render_train_fields(num_trains: int, num_routes: int, d: dict, fk: str) -> tuple:
    num_trips_vals = _number_inputs_in_rows(
        "Máx. viagens por trem", num_trains, d["num_trips"], f"{fk}_trips_", placeholder="ex: 6"
    )

    st.markdown("**Rotas** (nós separados por espaço)")
    route_inputs = [
        st.text_input(
            f"Rota {i}",
            value=" ".join(str(n) for n in d["routes"][i]) if i < len(d["routes"]) else "",
            placeholder="ex: 0 1 2 3 4 9 8 7 6 5 0",
            key=f"{fk}_route_{i}",
        )
        for i in range(num_routes)
    ]
    routes = [[int(n) for n in r.split() if n] for r in route_inputs]
    num_trips = [int(v) for v in num_trips_vals if v is not None]
    return num_trips, routes


def matrix_to_connections(matrix: list[list[int]]) -> list[dict]:
    return [
        {"from": i, "cost": val, "to": j}
        for i, row in enumerate(matrix)
        for j, val in enumerate(row)
        if val != -1
    ]


def connections_to_matrix(connections: list[dict], size: int) -> list[list[int]]:
    matrix = [[-1] * size for _ in range(size)]
    for c in connections:
        matrix[c["from"]][c["to"]] = c["cost"]
    return matrix


def render_connections(matrix_size: int) -> list[list[int]]:
    st.markdown("**Ligações** (de → custo → para)")

    to_remove = None
    for i, conn in enumerate(st.session_state.connections):
        col1, col2, col3, col4 = st.columns([3, 3, 3, 1])
        conn["from"] = col1.selectbox("De", range(matrix_size), index=int(conn["from"]), key=f"conn_from_{i}")
        conn["cost"] = col2.number_input("Custo", value=int(conn["cost"]), min_value=0, step=1, key=f"conn_cost_{i}")
        conn["to"] = col3.selectbox("Para", range(matrix_size), index=int(conn["to"]), key=f"conn_to_{i}")
        if col4.button("×", key=f"conn_remove_{i}"):
            to_remove = i

    if to_remove is not None:
        st.session_state.connections.pop(to_remove)
        st.rerun()

    if st.button("+ Adicionar ligação"):
        st.session_state.connections.append({"from": 0, "cost": 0, "to": 0})
        st.rerun()

    return connections_to_matrix(st.session_state.connections, matrix_size)


def _demands_matrix_inputs(matrix_size: int, num_intervals: int, defaults: list[list[int]], key_prefix: str) -> list[list[int | None]]:
    st.markdown(f"**Demands ({matrix_size} nós × {num_intervals} intervalos)**")
    result = []
    for i in range(matrix_size):
        row_defaults = defaults[i] if i < len(defaults) else []
        cols = st.columns(num_intervals)
        row = []
        for h in range(num_intervals):
            val = cols[h].number_input(
                f"nó {i} / int {h}",
                value=int(row_defaults[h]) if h < len(row_defaults) else None,
                min_value=0,
                step=1,
                placeholder="ex: 11",
                key=key_prefix + f"{i}_{h}",
            )
            row.append(val)
        result.append(row)
    return result


def render_points_fields(num_points: int, num_intervals: int, d: dict, fk: str) -> tuple:
    matrix_size = num_points * 2

    stmin = _number_inputs_in_rows("Service time mínimo (s)", num_points, d["service_time_min"], f"{fk}_stmin_", "ex: 142")
    stmax = _number_inputs_in_rows("Service time máximo (s)", num_points, d["service_time_max"], f"{fk}_stmax_", "ex: 592")

    cost_matrix = render_connections(matrix_size)

    demands_raw = _demands_matrix_inputs(matrix_size, num_intervals, d["demands"], f"{fk}_demand_")

    return (
        [int(v) for v in stmin if v is not None],
        [int(v) for v in stmax if v is not None],
        cost_matrix,
        [[int(v) for v in row if v is not None] for row in demands_raw],
    )


def render_intervals_fields(num_intervals: int, d: dict, fk: str) -> list[list[int]]:
    st.markdown("**Intervalos de tempo** (segundos)")
    intervals = []
    for i in range(num_intervals):
        default_start = d["time_intervals"][i][0] if i < len(d["time_intervals"]) else None
        default_end = d["time_intervals"][i][1] if i < len(d["time_intervals"]) else None
        col1, col2 = st.columns(2)
        start = col1.number_input(f"Intervalo {i} — início", value=default_start, min_value=0, step=1, placeholder="ex: 0", key=f"{fk}_int_start_{i}")
        end = col2.number_input(f"Intervalo {i} — fim", value=default_end, min_value=0, step=1, placeholder="ex: 61598", key=f"{fk}_int_end_{i}")
        if start is not None and end is not None:
            intervals.append([int(start), int(end)])
    return intervals


def render_free_fields(d: dict, fk: str) -> dict:
    col1, col2, col3 = st.columns(3)
    initial_point = col1.number_input("initial_point", value=d["initial_point"], min_value=0, step=1, placeholder="ex: 0", key=f"{fk}_initial_point")
    max_time = col2.number_input("max_time (s)", value=d["max_time"], min_value=0, step=1, placeholder="ex: 61598", key=f"{fk}_max_time")
    alpha = col3.number_input("alpha", value=d["alpha"], min_value=0, step=1, placeholder="ex: 41", key=f"{fk}_alpha")
    stations = st.text_input("stations (vírgula)", value=d["stations"], placeholder="ex: 0, 4, 2, 1, 3", key=f"{fk}_stations")
    crossings = st.text_input("crossings (vírgula)", value=d["crossings"], placeholder="ex: 0, 4, 2", key=f"{fk}_crossings")
    depots = st.text_input("depots (vírgula)", value=d["depots"], placeholder="ex: 0, 4", key=f"{fk}_depots")
    return {
        "initial_point": initial_point,
        "max_time": max_time,
        "alpha": alpha,
        "stations": stations,
        "crossings": crossings,
        "depots": depots,
    }


def render_solution(solution: dict) -> None:
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
                    df = pd.DataFrame(stops)
                    df.columns = ["Ponto", "Chegada (s)", "Partida (s)"]
                    st.dataframe(df, use_container_width=True, hide_index=True)
