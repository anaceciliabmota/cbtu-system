import streamlit as st

st.set_page_config(page_title="CBTU Solver", layout="wide", initial_sidebar_state="collapsed")

from api import create_instance, delete_instance, get_instances, run_solver, update_instance
from components import (
    inject_app_css,
    params_to_defaults,
    render_demands_fields,
    render_free_fields,
    render_intervals_fields,
    render_line_editor,
    render_routes_fields,
    render_solution,
    render_trains_fields,
)
from line_map import compile_line

# ── Session state ─────────────────────────────────────────────────────────────

if "active_id" not in st.session_state:
    st.session_state.active_id = None
if "solution" not in st.session_state:
    st.session_state.solution = None
if "last_selection" not in st.session_state:
    st.session_state.last_selection = None
if "confirm_delete" not in st.session_state:
    st.session_state.confirm_delete = False
if "point_names" not in st.session_state:
    st.session_state.point_names = None


def validate(line_data, num_trips, route_sequences, demands, intervals_data, free) -> list[str]:
    errors = []

    if not free["name"].strip():
        errors.append("Nome da instância é obrigatório.")

    if not line_data:
        errors.append("Adicione pelo menos um ponto na linha.")
        return errors

    names = line_data["names"]
    line_points = line_data["line_points"]
    n = len(names)

    empty_names = [i for i, name in enumerate(names) if not str(name).strip()]
    if empty_names:
        errors.append(f"Nome vazio no(s) ponto(s): {empty_names}.")

    if len(set(names)) != len(names):
        errors.append("Nomes dos pontos devem ser únicos.")

    if n > 1 and len(line_data["segment_costs"]) < n - 1:
        errors.append("Preencha a distância de todos os trechos entre vizinhos.")

    for i, pt in enumerate(line_points):
        if pt["st_min"] is None:
            errors.append(f"Service time mínimo ausente em '{names[i]}'.")
        if pt["st_max"] is None:
            errors.append(f"Service time máximo ausente em '{names[i]}'.")

    crossings = [names[i] for i, pt in enumerate(line_points) if pt["is_crossing"]]
    if not crossings:
        errors.append("Marque pelo menos um ponto como crossing.")

    if not num_trips:
        errors.append("Adicione pelo menos um trem com máx. viagens preenchido.")

    if not route_sequences:
        errors.append("Adicione pelo menos uma rota.")
    else:
        empty_routes = [i for i, r in enumerate(route_sequences) if not r]
        if empty_routes:
            errors.append(f"Rota(s) vazia(s): {[i + 1 for i in empty_routes]}.")

    if not intervals_data:
        errors.append("Adicione pelo menos um intervalo de tempo.")

    matrix_size = n * 2
    if len(demands) < matrix_size:
        errors.append(f"Preencha a demand para todos os {matrix_size} nós.")

    if free["alpha"] is None:
        errors.append("alpha é obrigatório.")

    return errors


def build_params(
    line_data,
    num_trips,
    route_sequences,
    route_start_upper,
    demands,
    intervals_data,
    free,
) -> dict:
    line_points = line_data["line_points"]
    names = line_data["names"]

    stations = [pt["name"] for pt in line_points if pt["is_station"]]
    crossings = [pt["name"] for pt in line_points if pt["is_crossing"]]
    depots = [pt["name"] for pt in line_points if pt["is_depot"]]

    service_time_min = [int(pt["st_min"]) for pt in line_points]
    service_time_max = [int(pt["st_max"]) for pt in line_points]

    offset = intervals_data[0][0] if intervals_data else 0
    adjusted_intervals = [[s - offset, e - offset] for s, e in intervals_data]

    compiled = compile_line(
        names=names,
        stations=stations,
        crossings=crossings,
        depots=depots,
        initial_point=line_data["initial_point_name"],
        segment_costs=[int(c) for c in line_data["segment_costs"]],
        route_name_sequences=route_sequences,
        service_time_min=service_time_min,
        service_time_max=service_time_max,
        demands=demands,
        route_start_upper=route_start_upper,
    )

    return {
        "num_trains": len(num_trips),
        "num_trips": num_trips,
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
        "max_time": free["max_time"] - offset,
        "alpha": int(free["alpha"]) if free["alpha"] is not None else 0,
    }


# ── Header ────────────────────────────────────────────────────────────────────

inject_app_css()
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
    st.warning(
        f"Excluir a instância **{selected['name']}** (id={selected['id']})? "
        "Esta ação não pode ser desfeita."
    )
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
    st.session_state.line_fk = None
    st.session_state.point_names = defaults.get("point_names") or []

st.divider()

# ── Form ──────────────────────────────────────────────────────────────────────

default_name = st.text_input(
    "Nome da instância",
    value=default_name,
    placeholder="ex: instancia-1",
    key=f"{fk}_name",
)

st.divider()

line_data = render_line_editor(defaults, fk)

st.divider()

num_trips = render_trains_fields(defaults, fk)

st.divider()

if line_data:
    route_sequences, route_start_upper = render_routes_fields(
        line_data["names"], defaults, fk
    )
else:
    st.caption("Defina a linha antes de montar as rotas.")
    route_sequences, route_start_upper = [], []

st.divider()

intervals_data = render_intervals_fields(defaults, fk)
num_intervals = len(intervals_data)

st.divider()

if line_data and num_intervals:
    demands = render_demands_fields(
        line_data["names"],
        num_intervals,
        defaults["demands"],
        fk,
    )
else:
    st.caption("Defina a linha e ao menos um intervalo para preencher demands.")
    demands = []

st.divider()

free = render_free_fields(defaults, fk)
free["name"] = default_name

# ── Save ─────────────────────────────────────────────────────────────────────

st.divider()

col1, col2 = st.columns(2)

if col1.button("Salvar como nova instância", use_container_width=True):
    errors = validate(
        line_data, num_trips, route_sequences, demands, intervals_data, free
    )
    if errors:
        for e in errors:
            st.error(e)
    else:
        try:
            params = build_params(
                line_data,
                num_trips,
                route_sequences,
                route_start_upper,
                demands,
                intervals_data,
                free,
            )
            result = create_instance(free["name"], params)
            st.session_state.active_id = result["id"]
            st.session_state.point_names = params.get("point_names")
            st.session_state.solution = None
            st.success(f"Instância criada — id={result['id']}")
            st.rerun()
        except Exception as e:
            st.error(f"Erro ao salvar: {e}")

if col2.button("Salvar alterações", disabled=selected is None, use_container_width=True):
    errors = validate(
        line_data, num_trips, route_sequences, demands, intervals_data, free
    )
    if errors:
        for e in errors:
            st.error(e)
    else:
        try:
            params = build_params(
                line_data,
                num_trips,
                route_sequences,
                route_start_upper,
                demands,
                intervals_data,
                free,
            )
            result = update_instance(selected["id"], free["name"], params)
            st.session_state.active_id = result["id"]
            st.session_state.point_names = params.get("point_names")
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
    point_names = st.session_state.point_names
    if not point_names and selected:
        point_names = selected["params"].get("point_names")
    render_solution(st.session_state.solution, point_names)
