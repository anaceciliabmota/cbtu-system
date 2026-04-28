"""
Verifica que rodar o solver com os tempos originais (início em 0s)
produz o mesmo resultado que rodar com os tempos deslocados em 8h
(início em 08:00), após a conversão de offset do frontend.

Requer o servidor rodando: uvicorn main:app --reload
    python tests/test_time_offset_equivalence.py
"""

import httpx

BASE_URL = "http://localhost:8000"

# ── Instância base (tempos originais, início em 0s) ───────────────────────────

BASE_PARAMS = {
    "num_trains": 2,
    "num_trips": [4, 4],
    "num_points": 6,
    "stations": [0, 5, 4, 2],
    "crossings": [0, 5, 4, 3, 1, 2],
    "depots": [0, 5, 4],
    "initial_point": 4,
    "routes": [
        [0, 1, 2, 3, 4, 5, 11, 10, 9, 8, 7, 6, 0],
        [11, 10, 9, 8, 7, 6, 0, 1, 2, 3, 4, 5, 11],
        [4, 5],
        [10, 9, 8, 7, 6],
        [0, 1, 2, 3, 4],
        [11, 10],
        [10, 9, 8, 7, 6, 0, 1, 2, 3, 4, 10],
    ],
    "service_time_min": [119, 57, 70, 57, 119, 119],
    "service_time_max": [307, 307, 307, 307, 307, 307],
    "cost_matrix": [
        [-1, 677,  -1,  -1,  -1,  -1,   0,  -1,  -1,  -1,  -1,  -1],
        [-1,  -1, 654,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
        [-1,  -1,  -1, 669,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
        [-1,  -1,  -1,  -1, 635,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
        [-1,  -1,  -1,  -1,  -1, 706,  -1,  -1,  -1,  -1,   0,  -1],
        [-1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,   0],
        [  0,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
        [-1,  -1,  -1,  -1,  -1,  -1, 677,  -1,  -1,  -1,  -1,  -1],
        [-1,  -1,  -1,  -1,  -1,  -1,  -1, 654,  -1,  -1,  -1,  -1],
        [-1,  -1,  -1,  -1,  -1,  -1,  -1,  -1, 669,  -1,  -1,  -1],
        [-1,  -1,  -1,  -1,   0,  -1,  -1,  -1,  -1, 635,  -1,  -1],
        [-1,  -1,  -1,  -1,  -1,   0,  -1,  -1,  -1,  -1, 706,  -1],
    ],
    "demands": [
        [2, 2, 2], [0, 0, 0], [2, 2, 2], [0, 0, 0],
        [2, 2, 2], [0, 0, 0], [0, 0, 0], [0, 0, 0],
        [2, 2, 2], [0, 0, 0], [2, 2, 2], [2, 2, 2],
    ],
    "alpha": 48,
}

ORIGINAL_INTERVALS = [[0, 17216], [17217, 34432], [34433, 51649]]
ORIGINAL_MAX_TIME  = 51649

OFFSET_8H = 8 * 3600  # 28800 s

# Simula o usuário digitando 08:00, 12:47, ... no frontend
# O frontend subtrai o offset antes de enviar → resultado idêntico ao original
SHIFTED_INTERVALS_RAW = [[s + OFFSET_8H, e + OFFSET_8H] for s, e in ORIGINAL_INTERVALS]
SHIFTED_MAX_TIME_RAW  = ORIGINAL_MAX_TIME + OFFSET_8H

# Conversão que o frontend aplica (app.py / build_params)
_offset = SHIFTED_INTERVALS_RAW[0][0]
SHIFTED_INTERVALS_ADJUSTED = [[s - _offset, e - _offset] for s, e in SHIFTED_INTERVALS_RAW]
SHIFTED_MAX_TIME_ADJUSTED  = SHIFTED_MAX_TIME_RAW - _offset


# ── Helpers ───────────────────────────────────────────────────────────────────

def check(label: str, ok: bool, detail: str = "") -> None:
    status = "OK" if ok else "FALHOU"
    suffix = f" — {detail}" if detail else ""
    print(f"[{status}] {label}{suffix}")


def create_and_run(client: httpx.Client, name: str, intervals: list, max_time: int) -> dict | None:
    params = {**BASE_PARAMS, "time_intervals": intervals, "max_time": max_time}
    r = client.post("/instances/", json={"name": name, "params": params})
    if r.status_code != 201:
        print(f"  Erro ao criar '{name}': HTTP {r.status_code} — {r.text}")
        return None
    instance_id = r.json()["id"]
    print(f"  Instância '{name}' criada — id={instance_id}")

    r = client.post(f"/instances/{instance_id}/run", timeout=600)
    if r.status_code != 201:
        print(f"  Erro ao rodar solver: HTTP {r.status_code} — {r.text}")
        return None
    return r.json().get("result", {})


# ── Teste principal ───────────────────────────────────────────────────────────

def run() -> None:
    print("\n=== Equivalência de offset: 0s vs 8h deslocado ===\n")

    # Pré-verificação: os payloads ajustados devem ser idênticos
    check("intervalos ajustados == originais", SHIFTED_INTERVALS_ADJUSTED == ORIGINAL_INTERVALS,
          f"\n    original={ORIGINAL_INTERVALS}\n    ajustado={SHIFTED_INTERVALS_ADJUSTED}")
    check("max_time ajustado == original", SHIFTED_MAX_TIME_ADJUSTED == ORIGINAL_MAX_TIME,
          f"original={ORIGINAL_MAX_TIME}, ajustado={SHIFTED_MAX_TIME_ADJUSTED}")

    print(f"\n  Payload original:  intervals={ORIGINAL_INTERVALS}, max_time={ORIGINAL_MAX_TIME}")
    print(f"  Entrada do usuário: intervals={SHIFTED_INTERVALS_RAW}, max_time={SHIFTED_MAX_TIME_RAW}")
    print(f"  Após offset:        intervals={SHIFTED_INTERVALS_ADJUSTED}, max_time={SHIFTED_MAX_TIME_ADJUSTED}")

    print("\n--- Rodando solver (pode demorar alguns minutos) ---\n")

    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        result_original = create_and_run(client, "offset-test-original", ORIGINAL_INTERVALS, ORIGINAL_MAX_TIME)
        result_shifted  = create_and_run(client, "offset-test-8h",       SHIFTED_INTERVALS_ADJUSTED, SHIFTED_MAX_TIME_ADJUSTED)

    if result_original is None or result_shifted is None:
        print("\n[FALHOU] Não foi possível obter os dois resultados.")
        return

    val_orig    = result_original.get("solution_value")
    val_shifted = result_shifted.get("solution_value")
    time_orig   = result_original.get("total_time")
    time_shifted= result_shifted.get("total_time")

    print(f"\n  Resultado original:  solution_value={val_orig},  total_time={time_orig}s")
    print(f"  Resultado deslocado: solution_value={val_shifted}, total_time={time_shifted}s")

    check("solution_value idêntico nos dois casos", val_orig == val_shifted,
          f"{val_orig} vs {val_shifted}")

    print()


if __name__ == "__main__":
    run()
