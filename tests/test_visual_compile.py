"""Tests for compiling the Line Planner visual model into solver params."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from compiler.visual import (
    CompileError,
    compile_visual_line,
    line_from_params,
    solver_params_from_line,
)

RECIFE = "st-recife"
AFOGADOS = "st-afogados"
CENTRO = "st-centro"
CAJUEIRO = "st-cajueiro"
CAMARAGIBE = "st-camaragibe"

SAMPLE_LINE = {
    "id": "inst-metro-recife",
    "name": "Metrô Recife — Dia útil",
    "lineName": "Linha Centro",
    "updatedAt": "2026-08-14T10:12:00Z",
    "lastRun": "never",
    "stations": [
        {
            "id": RECIFE,
            "name": "Recife",
            "roles": ["station", "crossing", "depot"],
            "dwellMin": 142,
            "dwellMax": 592,
        },
        {
            "id": AFOGADOS,
            "name": "Afogados",
            "roles": ["station"],
            "dwellMin": 120,
            "dwellMax": 180,
        },
        {
            "id": CENTRO,
            "name": "Centro",
            "roles": ["station", "crossing"],
            "dwellMin": 120,
            "dwellMax": 180,
        },
        {
            "id": CAJUEIRO,
            "name": "Cajueiro",
            "roles": ["station"],
            "dwellMin": 120,
            "dwellMax": 180,
        },
        {
            "id": CAMARAGIBE,
            "name": "Camaragibe",
            "roles": ["station", "crossing", "depot"],
            "dwellMin": 142,
            "dwellMax": 592,
        },
    ],
    "segments": [
        {"fromId": RECIFE, "toId": AFOGADOS, "distance": 694},
        {"fromId": AFOGADOS, "toId": CENTRO, "distance": 618},
        {"fromId": CENTRO, "toId": CAJUEIRO, "distance": 703},
        {"fromId": CAJUEIRO, "toId": CAMARAGIBE, "distance": 664},
    ],
    "routes": [
        {
            "id": "rt-short",
            "name": "Retorno curto",
            "sequence": [RECIFE, AFOGADOS, CENTRO, AFOGADOS, RECIFE],
            "startsInbound": False,
        },
        {
            "id": "rt-full",
            "name": "Linha completa",
            "sequence": [
                CAMARAGIBE,
                CAJUEIRO,
                CENTRO,
                AFOGADOS,
                RECIFE,
                AFOGADOS,
                CENTRO,
                CAJUEIRO,
                CAMARAGIBE,
            ],
            "startsInbound": True,
        },
    ],
    "trains": [
        {"id": "tr-1", "name": "Trem 1", "maxTrips": 6, "routeId": "rt-short"},
        {"id": "tr-2", "name": "Trem 2", "maxTrips": 6, "routeId": "rt-full"},
    ],
    "intervals": [
        {"id": "iv-peak", "name": "Pico da manhã", "start": 6 * 3600, "end": 9 * 3600, "color": "peak"},
        {
            "id": "iv-off",
            "name": "Fora de pico",
            "start": 9 * 3600,
            "end": 17 * 3600 + 6 * 60,
            "color": "offpeak",
        },
    ],
    "demand": {
        f"{RECIFE}:ida:iv-peak": 6,
        f"{AFOGADOS}:ida:iv-peak": 4,
        f"{AFOGADOS}:volta:iv-peak": 4,
        f"{CENTRO}:ida:iv-peak": 5,
        f"{CENTRO}:volta:iv-peak": 5,
        f"{CAJUEIRO}:ida:iv-peak": 3,
        f"{CAJUEIRO}:volta:iv-peak": 3,
        f"{CAMARAGIBE}:volta:iv-peak": 4,
        f"{RECIFE}:ida:iv-off": 3,
        f"{AFOGADOS}:ida:iv-off": 2,
        f"{AFOGADOS}:volta:iv-off": 2,
        f"{CENTRO}:ida:iv-off": 2,
        f"{CENTRO}:volta:iv-off": 2,
        f"{CAJUEIRO}:ida:iv-off": 1,
        f"{CAJUEIRO}:volta:iv-off": 1,
        f"{CAMARAGIBE}:volta:iv-off": 3,
    },
    "dayStart": 6 * 3600,
    "horizon": 17 * 3600 + 6 * 60,
    "alpha": 41,
    "minHeadway": 6 * 60,
    "initialStationId": RECIFE,
}


def test_compile_sample_routes_and_offset():
    params = solver_params_from_line(SAMPLE_LINE)
    assert params["num_trains"] == 2
    assert params["num_trips"] == [6, 6]
    assert params["num_points"] == 5
    assert params["initial_point"] == 0
    assert params["crossings"] == [0, 2, 4]
    assert params["depots"] == [0, 4]
    assert params["routes"][0] == [0, 1, 2, 7, 6, 5, 0]
    assert params["routes"][1] == [9, 8, 7, 6, 5, 0, 1, 2, 3, 4, 9]
    assert params["cost_matrix"][0][1] == 694
    assert params["cost_matrix"][0][5] == 0
    assert params["time_intervals"][0] == [0, 3 * 3600]
    assert params["max_time"] == (17 * 3600 + 6 * 60) - 6 * 3600
    assert params["alpha"] == 41
    assert params["demands"][0] == [6, 3]
    assert params["demands"][1] == [4, 2]
    assert params["demands"][9] == [4, 3]


def test_compile_embeds_line():
    params = compile_visual_line(SAMPLE_LINE)
    assert params["line"]["name"] == SAMPLE_LINE["name"]
    assert params["routes"][0][0] == 0


def test_draft_without_stations_does_not_raise():
    line = {
        "id": "inst-new",
        "name": "Novo cenário",
        "lineName": "",
        "stations": [],
        "segments": [],
        "routes": [],
        "trains": [],
        "intervals": [],
        "demand": {},
        "dayStart": 21600,
        "horizon": 79200,
        "alpha": 41,
        "minHeadway": 360,
        "initialStationId": "",
    }
    params = compile_visual_line(line, require_complete=False)
    assert params["line"]["name"] == "Novo cenário"
    assert "num_trains" not in params


def test_incomplete_line_raises():
    try:
        solver_params_from_line({"stations": [], "trains": [], "routes": [], "intervals": []})
        raise AssertionError("expected CompileError")
    except CompileError as exc:
        assert "ponto" in str(exc).lower()


def test_roundtrip_preserves_visual_ids():
    params = compile_visual_line(SAMPLE_LINE)
    line = line_from_params("Metrô Recife — Dia útil", params, instance_id=42, last_run="never")
    assert line["id"] == "42"
    assert line["stations"][0]["id"] == RECIFE
    assert line["routes"][0]["sequence"] == SAMPLE_LINE["routes"][0]["sequence"]
    assert line["demand"][f"{RECIFE}:ida:iv-peak"] == 6


def test_reconstruct_from_compiled_params():
    params = solver_params_from_line(SAMPLE_LINE)
    line = line_from_params("legado", params, instance_id=7)
    assert line["stations"][0]["name"] == "Recife"
    assert line["routes"][0]["sequence"][0] == "st-0"
    compiled_again = solver_params_from_line(line)
    assert compiled_again["routes"] == params["routes"]
    assert compiled_again["cost_matrix"] == params["cost_matrix"]


if __name__ == "__main__":
    test_compile_sample_routes_and_offset()
    test_compile_embeds_line()
    test_draft_without_stations_does_not_raise()
    test_incomplete_line_raises()
    test_roundtrip_preserves_visual_ids()
    test_reconstruct_from_compiled_params()
    print("All tests passed.")
