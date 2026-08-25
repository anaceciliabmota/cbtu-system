"""
Testa a lógica de conversão HH:MM → segundos com subtração de offset
que o frontend aplica antes de enviar para o solver.

Execução (sem servidor):
    python tests/test_time_conversion.py

Execução com teste de API (requer: uvicorn main:app --reload):
    python tests/test_time_conversion.py --api
"""

import sys
from datetime import time as dt_time

import httpx

BASE_URL = "http://localhost:8000"


# ── Funções replicadas do frontend/components.py ──────────────────────────────

def _seconds_to_time(seconds: int) -> dt_time:
    return dt_time((seconds // 3600) % 24, (seconds % 3600) // 60)


def _time_to_seconds(t: dt_time) -> int:
    return t.hour * 3600 + t.minute * 60


# ── Lógica replicada do frontend/app.py ───────────────────────────────────────

def apply_offset(intervals_seconds: list[list[int]], max_time_seconds: int) -> tuple[list[list[int]], int]:
    """Subtrai o início do primeiro intervalo de todos os tempos."""
    offset = intervals_seconds[0][0] if intervals_seconds else 0
    adjusted = [[s - offset, e - offset] for s, e in intervals_seconds]
    return adjusted, max_time_seconds - offset


# ── Helpers de teste ──────────────────────────────────────────────────────────

def check(label: str, ok: bool, detail: str = "") -> None:
    status = "OK" if ok else "FALHOU"
    suffix = f" — {detail}" if detail else ""
    print(f"[{status}] {label}{suffix}")


# ── Cenários de teste ─────────────────────────────────────────────────────────

def test_roundtrip() -> None:
    print("\n=== 1. Roundtrip segundos → dt_time → segundos ===\n")
    cases = [
        (0,     dt_time(0, 0)),
        (3600,  dt_time(1, 0)),
        (28800, dt_time(8, 0)),
        (34260, dt_time(9, 31)),
        (86340, dt_time(23, 59)),
    ]
    for seconds, expected_time in cases:
        got_time = _seconds_to_time(seconds)
        check(f"{seconds}s → {expected_time}", got_time == expected_time, str(got_time))
        got_back = _time_to_seconds(got_time)
        check(f"{expected_time} → {seconds}s", got_back == seconds, str(got_back))


def test_offset_subtraction() -> None:
    print("\n=== 2. Subtração de offset (primeiro horário = 0s) ===\n")

    # Usuário digita 08:00, 12:47, 17:34 como limites de 3 intervalos
    # e 17:34 como max_time
    user_times = [
        [dt_time(8, 0),  dt_time(12, 47)],
        [dt_time(12, 47), dt_time(17, 34)],
        [dt_time(17, 34), dt_time(22, 21)],
    ]
    max_time_input = dt_time(22, 21)

    raw = [[_time_to_seconds(s), _time_to_seconds(e)] for s, e in user_times]
    raw_max = _time_to_seconds(max_time_input)

    adjusted, adjusted_max = apply_offset(raw, raw_max)

    check("primeiro intervalo começa em 0s", adjusted[0][0] == 0, str(adjusted[0][0]))

    expected_duration = _time_to_seconds(dt_time(12, 47)) - _time_to_seconds(dt_time(8, 0))
    check("duração do 1º intervalo preservada", adjusted[0][1] == expected_duration,
          f"esperado={expected_duration}, obtido={adjusted[0][1]}")

    check("intervalos contíguos", adjusted[1][0] == adjusted[0][1],
          f"{adjusted[1][0]} == {adjusted[0][1]}")

    check("max_time relativo ao offset", adjusted_max == adjusted[-1][-1],
          f"max_time={adjusted_max}, último fim={adjusted[-1][-1]}")

    print(f"\n  Intervalos ajustados: {adjusted}")
    print(f"  max_time ajustado:    {adjusted_max}s")


def test_offset_zero_start() -> None:
    print("\n=== 3. Primeiro horário = 00:00 (offset zero, nenhuma subtração) ===\n")
    user_times = [[dt_time(0, 0), dt_time(4, 46)], [dt_time(4, 46), dt_time(9, 33)]]
    raw = [[_time_to_seconds(s), _time_to_seconds(e)] for s, e in user_times]
    adjusted, _ = apply_offset(raw, raw[-1][-1])
    check("sem offset não altera valores", adjusted == raw, str(adjusted))


# ── Teste de integração com a API ─────────────────────────────────────────────

def _build_api_payload(intervals_hhmm: list[list[dt_time]], max_time_hhmm: dt_time) -> dict:
    raw = [[_time_to_seconds(s), _time_to_seconds(e)] for s, e in intervals_hhmm]
    adjusted, adjusted_max = apply_offset(raw, _time_to_seconds(max_time_hhmm))
    return {
        "name": "teste-horarios-hhmm",
        "params": {
            "num_trains": 2,
            "num_trips": [6, 6],
            "time_intervals": adjusted,
            "num_points": 5,
            "stations": [0, 4, 2, 1, 3],
            "crossings": [0, 4, 2],
            "depots": [0, 4],
            "initial_point": 0,
            "routes": [
                [0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 0],
                [9, 8, 7, 6, 5, 0, 1, 2, 3, 4, 9],
            ],
            "service_time_min": [142, 119, 119, 119, 142],
            "service_time_max": [592, 592, 592, 592, 592],
            "cost_matrix": [
                [-1, 694, -1, -1, -1,  0, -1, -1, -1, -1],
                [-1,  -1, 618, -1, -1, -1, -1, -1, -1, -1],
                [-1,  -1,  -1, 703, -1, -1, -1, -1, -1, -1],
                [-1,  -1,  -1,  -1, 664, -1, -1, -1, -1, -1],
                [-1,  -1,  -1,  -1,  -1, -1, -1, -1, -1,  0],
                [  0, -1,  -1,  -1,  -1, -1, -1, -1, -1, -1],
                [-1,  -1,  -1,  -1,  -1, 694, -1, -1, -1, -1],
                [-1,  -1,  -1,  -1,  -1, -1, 618, -1, -1, -1],
                [-1,  -1,  -1,  -1,  -1, -1, -1, 703, -1, -1],
                [-1,  -1,  -1,  -1,   0, -1, -1, -1, 664, -1],
            ],
            "demands": [[11], [11], [11], [11], [0], [0], [11], [11], [11], [11]],
            "max_time": adjusted_max,
            "alpha": 41,
        },
    }


def test_api() -> None:
    print("\n=== 4. Integração com a API (usuário digita 08:00 como início) ===\n")

    # Simula o usuário digitando horários reais a partir de 08:00
    intervals_input = [
        [dt_time(8, 0),  dt_time(12, 46)],
        [dt_time(12, 46), dt_time(17, 6)],
    ]
    max_time_input = dt_time(17, 6)

    payload = _build_api_payload(intervals_input, max_time_input)
    intervals = payload["params"]["time_intervals"]
    max_time  = payload["params"]["max_time"]

    check("primeiro intervalo começa em 0s no payload", intervals[0][0] == 0, str(intervals[0][0]))
    check("max_time coincide com fim do último intervalo", max_time == intervals[-1][1],
          f"max_time={max_time}, último fim={intervals[-1][1]}")

    print(f"\n  Payload time_intervals: {intervals}")
    print(f"  Payload max_time:       {max_time}s")

    try:
        with httpx.Client(base_url=BASE_URL, timeout=30) as client:
            r = client.post("/instances/", json=payload)
            check("POST /instances/ retorna 201", r.status_code == 201, f"HTTP {r.status_code}")
            if r.status_code != 201:
                print(f"  Resposta: {r.text}")
                return
            saved = r.json()
            saved_intervals = saved["params"]["time_intervals"]
            check("primeiro intervalo salvo começa em 0s", saved_intervals[0][0] == 0,
                  str(saved_intervals[0][0]))
            print(f"  Instância criada — id={saved['id']}")
    except httpx.ConnectError:
        print("  [PULADO] Servidor não está rodando.")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    run_api = "--api" in sys.argv
    test_roundtrip()
    test_offset_subtraction()
    test_offset_zero_start()
    if run_api:
        test_api()
    else:
        print("\n  Dica: rode com --api para testar também o endpoint POST /instances/")
    print()
