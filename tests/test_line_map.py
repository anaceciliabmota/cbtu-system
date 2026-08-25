"""Tests for frontend/line_map.py translation helpers."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from compiler.line_map import (  # noqa: E402
    compile_line,
    matrix_to_segments,
    names_to_vertices,
    segments_to_matrix,
    vertices_to_names,
    vertices_to_point_sequence,
)

N = 5
CROSSINGS = {0, 2, 4}
NAMES = ["Recife", "Afogados", "Centro", "Cajueiro", "Camaragibe"]


def test_short_route_expansion():
    route = [0, 1, 2, 1, 0]
    assert names_to_vertices(route, CROSSINGS, N) == [0, 1, 2, 7, 6, 5, 0]


def test_full_loop_expansion():
    route = [0, 1, 2, 3, 4, 3, 2, 1, 0]
    assert names_to_vertices(route, CROSSINGS, N) == [
        0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 0
    ]


def test_collapse_short_route():
    vertices = [0, 1, 2, 7, 6, 5, 0]
    assert vertices_to_point_sequence(vertices, N) == [0, 1, 2, 1, 0]
    assert vertices_to_names(vertices, NAMES, N) == [
        "Recife",
        "Afogados",
        "Centro",
        "Afogados",
        "Recife",
    ]


def test_collapse_full_loop():
    vertices = [0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 0]
    assert vertices_to_point_sequence(vertices, N) == [0, 1, 2, 3, 4, 3, 2, 1, 0]
    assert vertices_to_names(vertices, NAMES, N) == [
        "Recife",
        "Afogados",
        "Centro",
        "Cajueiro",
        "Camaragibe",
        "Cajueiro",
        "Centro",
        "Afogados",
        "Recife",
    ]


def test_segments_to_matrix_canonical():
    segments = [694, 618, 703, 664]
    matrix = segments_to_matrix(segments, CROSSINGS, N)
    assert matrix[0][1] == 694
    assert matrix[6][5] == 694
    assert matrix[0][5] == 0
    assert matrix[2][7] == 0
    assert matrix[4][9] == 0


def test_matrix_to_segments_roundtrip():
    segments = [694, 618, 703, 664]
    matrix = segments_to_matrix(segments, CROSSINGS, N)
    recovered_segments, reversal = matrix_to_segments(matrix, CROSSINGS, N)
    assert recovered_segments == segments
    assert reversal[0] == 0
    assert reversal[2] == 0
    assert reversal[4] == 0


def test_compile_line_short_route():
    compiled = compile_line(
        names=NAMES,
        stations=NAMES,
        crossings=["Recife", "Centro", "Camaragibe"],
        depots=["Recife", "Camaragibe"],
        initial_point="Recife",
        segment_costs=[694, 618, 703, 664],
        route_name_sequences=[
            ["Recife", "Afogados", "Centro", "Afogados", "Recife"],
        ],
        service_time_min=[142, 119, 119, 119, 142],
        service_time_max=[592, 592, 592, 592, 592],
        demands=[[11]] * 10,
    )
    assert compiled["num_points"] == 5
    assert compiled["routes"][0] == [0, 1, 2, 7, 6, 5, 0]
    assert compiled["crossings"] == [0, 2, 4]
    assert compiled["initial_point"] == 0


def test_route_starts_on_lower_track():
    route = [4, 3, 2, 1, 0, 1, 2, 3, 4]
    assert names_to_vertices(route, CROSSINGS, N, start_on_upper=False) == [
        9, 8, 7, 6, 5, 0, 1, 2, 3, 4, 9
    ]


def test_reverse_at_non_crossing_raises():
    try:
        names_to_vertices([0, 1, 3, 1, 0], {0, 4}, N)
        raise AssertionError("expected ValueError")
    except ValueError as exc:
        assert "não é crossing" in str(exc)


if __name__ == "__main__":
    test_short_route_expansion()
    test_full_loop_expansion()
    test_collapse_short_route()
    test_collapse_full_loop()
    test_segments_to_matrix_canonical()
    test_matrix_to_segments_roundtrip()
    test_compile_line_short_route()
    test_route_starts_on_lower_track()
    test_reverse_at_non_crossing_raises()
    print("All tests passed.")
