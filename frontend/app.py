import streamlit as st

from api import create_instance, delete_instance, get_instances, run_solver, update_instance
from components import (
    matrix_to_connections,
    params_to_defaults,
    render_base_fields,
    render_free_fields,
    render_intervals_fields,
    render_points_fields,
    render_solution,
    render_train_fields,
)


def parse_int_list(text: str) -> list[int]:
    return [int(x.strip()) for x in text.split(",") if x.strip()]


def validate_int_list(text: str, field: str) -> str | None:
    for token in text.split(","):
        token = token.strip()
        if not token:
            continue
        if not token.lstrip("-").isdigit():
            return f"{field}: '{token}' não é um número inteiro válido."
    return None


def validate(base, train_data, points_data, intervals_data, free) -> list[str]:
    errors = []
    num_trains, num_routes, num_points, num_intervals = base
    num_trips, routes = train_data
    stmin, stmax, _, demands = points_data

    if not free["name"].strip():
        errors.append("Nome da instância é obrigatório.")
    if not num_trains:
        errors.append("Número de trens é obrigatório.")
    if not num_routes:
        errors.append("Número de rotas é obrigatório.")
    if not num_points:
        errors.append("Número de pontos é obrigatório.")
    if not num_intervals:
        errors.append("Número de intervalos é obrigatório.")

    if num_trains and num_routes:
        if len(num_trips) < int(num_trains):
            errors.append("Preencha o máximo de viagens para todos os trens.")
        empty_routes = [i for i, r in enumerate(routes) if not r]
        if empty_routes:
            errors.append(f"Rota(s) vazia(s): {empty_routes}.")

    if num_points:
        n = int(num_points)
        matrix_size = n * 2
        if len(stmin) < n:
            errors.append("Preencha o service time mínimo para todos os pontos.")
        if len(stmax) < n:
            errors.append("Preencha o service time máximo para todos os pontos.")
        if len(demands) < matrix_size:
            errors.append(f"Preencha a demand para todos os {matrix_size} nós.")
        if not st.session_state.connections:
            errors.append("Adicione pelo menos uma ligação na cost matrix.")

    if num_intervals and not intervals_data:
        errors.append("Preencha os intervalos de tempo.")

    if free["initial_point"] is None:
        errors.append("initial_point é obrigatório.")
    if free["max_time"] is None:
        errors.append("max_time é obrigatório.")
    if free["alpha"] is None:
        errors.append("alpha é obrigatório.")
    for field in ("stations", "crossings", "depots"):
        val = free[field].strip()
        if not val:
            errors.append(f"{field} é obrigatório.")
        else:
            err = validate_int_list(val, field)
            if err:
                errors.append(err)

    return errors


def build_params(base, train_data, points_data, intervals_data, free) -> dict:
    num_trains, _, num_points, _ = base
    num_trips, routes = train_data
    service_time_min, service_time_max, cost_matrix, demands = points_data

    offset = intervals_data[0][0] if intervals_data else 0
    adjusted_intervals = [[s - offset, e - offset] for s, e in intervals_data]

    return {
        "num_trains": int(num_trains),
        "num_trips": num_trips,
        "time_intervals": adjusted_intervals,
        "num_points": int(num_points),
        "stations": parse_int_list(free["stations"]),
        "crossings": parse_int_list(free["crossings"]),
        "depots": parse_int_list(free["depots"]),
        "initial_point": int(free["initial_point"]) if free["initial_point"] is not None else 0,
        "routes": routes,
        "service_time_min": service_time_min,
        "service_time_max": service_time_max,
        "cost_matrix": cost_matrix,
        "demands": demands,
        "max_time": free["max_time"] - offset,
        "alpha": int(free["alpha"]) if free["alpha"] is not None else 0,
    }


# ── Session state ─────────────────────────────────────────────────────────────

if "active_id" not in st.session_state:
    st.session_state.active_id = None
if "solution" not in st.session_state:
    st.session_state.solution = None
if "connections" not in st.session_state:
    st.session_state.connections = []
if "last_selection" not in st.session_state:
    st.session_state.last_selection = None
if "confirm_delete" not in st.session_state:
    st.session_state.confirm_delete = False

# ── Header ────────────────────────────────────────────────────────────────────

st.title("CBTU Solver")

instances = get_instances()
options = {f"{i['name']} (id={i['id']})": i for i in instances}

col_select, col_delete = st.columns([11, 1])
with col_select:
    selection = st.selectbox("Instância", options=["Nova instância"] + list(options.keys()))
selected = options[selection] if selection != "Nova instância" else None
with col_delete:
    st.write("")
    delete_clicked = selected is not None and st.button(
        "🗑️", help="Excluir instância selecionada", key="delete_instance_btn"
    )

if delete_clicked and selected:
    st.session_state.confirm_delete = True

if st.session_state.confirm_delete and selected:
    st.warning(f"Excluir a instância **{selected['name']}** (id={selected['id']})? Esta ação não pode ser desfeita.")
    c_confirm, c_cancel = st.columns(2)
    if c_confirm.button("Confirmar exclusão", type="primary", use_container_width=True):
        try:
            deleted_id = selected["id"]
            delete_instance(deleted_id)
            if st.session_state.active_id == deleted_id:
                st.session_state.active_id = None
                st.session_state.solution = None
            st.session_state.confirm_delete = False
            st.session_state.last_selection = None
            st.success(f"Instância id={deleted_id} excluída.")
            st.rerun()
        except Exception as e:
            st.error(f"Erro ao excluir: {e}")
    if c_cancel.button("Cancelar", use_container_width=True):
        st.session_state.confirm_delete = False
        st.rerun()
defaults = params_to_defaults(selected["params"]) if selected else params_to_defaults({})
default_name = selected["name"] if selected else ""
fk = str(selected["id"]) if selected else "new"

if selection != st.session_state.last_selection:
    st.session_state.last_selection = selection
    st.session_state.confirm_delete = False
    matrix = selected["params"].get("cost_matrix", []) if selected else []
    st.session_state.connections = matrix_to_connections(matrix)

st.divider()

# ── Form ──────────────────────────────────────────────────────────────────────

default_name = st.text_input("Nome da instância", value=default_name, placeholder="ex: instancia-1", key=f"{fk}_name")

base = render_base_fields(defaults, fk)
num_trains, num_routes, num_points, num_intervals = base

st.divider()

if num_trains and num_routes:
    train_data = render_train_fields(int(num_trains), int(num_routes), defaults, fk)
else:
    st.caption("Preencha o número de trens e de rotas para definir viagens e rotas.")
    train_data = ([], [])

st.divider()

if num_points and num_intervals:
    points_data = render_points_fields(int(num_points), int(num_intervals), defaults, fk)
else:
    st.caption("Preencha o número de pontos para definir service times, cost matrix e demands.")
    points_data = ([], [], [], [])

st.divider()

if num_intervals:
    intervals_data = render_intervals_fields(int(num_intervals), defaults, fk)
else:
    st.caption("Preencha o número de intervalos para definir os intervalos de tempo.")
    intervals_data = []

st.divider()

free = render_free_fields(defaults, fk)
free["name"] = default_name

# ── Save ─────────────────────────────────────────────────────────────────────

st.divider()

col1, col2 = st.columns(2)

if col1.button("Salvar como nova instância", use_container_width=True):
    errors = validate(base, train_data, points_data, intervals_data, free)
    if errors:
        for e in errors:
            st.error(e)
    else:
        try:
            params = build_params(base, train_data, points_data, intervals_data, free)
            result = create_instance(free["name"], params)
            st.session_state.active_id = result["id"]
            st.session_state.solution = None
            st.success(f"Instância criada — id={result['id']}")
            st.rerun()
        except Exception as e:
            st.error(f"Erro ao salvar: {e}")

if col2.button("Salvar alterações", disabled=selected is None, use_container_width=True):
    errors = validate(base, train_data, points_data, intervals_data, free)
    if errors:
        for e in errors:
            st.error(e)
    else:
        try:
            params = build_params(base, train_data, points_data, intervals_data, free)
            result = update_instance(selected["id"], free["name"], params)
            st.session_state.active_id = result["id"]
            st.session_state.solution = None
            st.success(f"Instância atualizada — id={result['id']}")
            st.rerun()
        except Exception as e:
            st.error(f"Erro ao atualizar: {e}")

# ── Run ───────────────────────────────────────────────────────────────────────

st.divider()

active_id = st.session_state.active_id or (selected["id"] if selected else None)

if active_id:
    st.caption(f"Instância ativa: id={active_id}")

if st.button("▶ Executar Solver", disabled=active_id is None, type="primary", use_container_width=True):
    with st.spinner("Executando solver..."):
        try:
            st.session_state.solution = run_solver(active_id)
        except Exception as e:
            st.error(f"Erro ao executar: {e}")

# ── Solution ──────────────────────────────────────────────────────────────────

if st.session_state.solution:
    st.divider()
    render_solution(st.session_state.solution)
