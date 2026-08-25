"""
Testa o ajuste de demands como matriz 2D (vértices × intervalos).
Requer o servidor rodando: uvicorn main:app --reload
"""

import httpx

BASE_URL = "http://localhost:8000"

INSTANCE_3_INTERVALS = {
    "name": "instancia-demanda-matriz",
    "params": {
        "num_trains": 2,
        "num_trips": [4, 4],
        "time_intervals": [[0, 17216], [17217, 34432], [34433, 51649]],
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
            [2, 2, 2],
            [0, 0, 0],
            [2, 2, 2],
            [0, 0, 0],
            [2, 2, 2],
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [2, 2, 2],
            [0, 0, 0],
            [2, 2, 2],
            [2, 2, 2],
        ],
        "max_time": 51649,
        "alpha": 48,
    },
}


def check(label: str, ok: bool, detail: str = "") -> None:
    status = "OK" if ok else "FALHOU"
    suffix = f" — {detail}" if detail else ""
    print(f"[{status}] {label}{suffix}")


def run() -> None:
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        print("\n=== Teste: demands como matriz 2D ===\n")

        # 1. Criar instância com demands 2D (3 intervalos)
        print("--- 1. Criar instância com demands 2D (12 vértices × 3 intervalos) ---")
        r = client.post("/instances/", json=INSTANCE_3_INTERVALS)
        check("POST /instances/ retorna 201", r.status_code == 201, f"HTTP {r.status_code}")
        if r.status_code != 201:
            print(f"       Resposta: {r.text}")
            return
        data = r.json()
        instance_id = data["id"]
        demands = data["params"]["demands"]
        check("demands tem 12 linhas (num_points * 2)", len(demands) == 12, f"len={len(demands)}")
        check("cada linha tem 3 colunas (num_intervals)", all(len(row) == 3 for row in demands), str(demands))
        check("valores corretos (vértice 0 = [2,2,2])", demands[0] == [2, 2, 2], str(demands[0]))
        check("valores corretos (vértice 1 = [0,0,0])", demands[1] == [0, 0, 0], str(demands[1]))

        # 2. Buscar e verificar persistência
        print("\n--- 2. Buscar instância salva e verificar demands ---")
        r = client.get(f"/instances/{instance_id}")
        check("GET /instances/{id} retorna 200", r.status_code == 200, f"HTTP {r.status_code}")
        demands = r.json()["params"]["demands"]
        check("demands persiste como 2D", isinstance(demands[0], list), str(demands[0]))
        check("shape correto após leitura", len(demands) == 12 and all(len(row) == 3 for row in demands))

        # 3. Executar solver
        print("\n--- 3. Executar solver ---")
        r = client.post(f"/instances/{instance_id}/run", timeout=600)
        check("POST /instances/{id}/run retorna 201", r.status_code == 201, f"HTTP {r.status_code}")
        if r.status_code != 201:
            print(f"       Resposta: {r.text}")
        else:
            result = r.json().get("result", {})
            check("solver retornou solution_value", "solution_value" in result, str(result.get("solution_value")))
            print(f"       solution_value={result.get('solution_value')}")
            print(f"       total_time={result.get('total_time')}s")

        print()


if __name__ == "__main__":
    run()
