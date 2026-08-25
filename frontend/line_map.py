"""Backward-compatible re-export of the line compiler."""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from compiler.line_map import (  # noqa: E402
    compile_line,
    default_point_names,
    is_reversal_pair,
    lower_vertex,
    matrix_to_segments,
    names_to_indices,
    names_to_vertices,
    role_indices,
    route_starts_on_upper,
    segments_to_matrix,
    upper_vertex,
    vertex_label,
    vertex_to_point,
    vertices_to_names,
    vertices_to_point_sequence,
)

__all__ = [
    "compile_line",
    "default_point_names",
    "is_reversal_pair",
    "lower_vertex",
    "matrix_to_segments",
    "names_to_indices",
    "names_to_vertices",
    "role_indices",
    "route_starts_on_upper",
    "segments_to_matrix",
    "upper_vertex",
    "vertex_label",
    "vertex_to_point",
    "vertices_to_names",
    "vertices_to_point_sequence",
]
