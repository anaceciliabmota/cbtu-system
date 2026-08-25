"""
Testa exclusão de instâncias via API.
Requer o servidor rodando: uvicorn main:app --reload
"""

import httpx

BASE_URL = "http://localhost:8000"

INSTANCE_PAYLOAD = {
    "name": "instancia-para-excluir",
    "params": {
        "num_trains": 2,
        "num_trips": [6, 6],
        "time_intervals": [[0, 61598]],
        "num_points": 5,
        "stations": [0, 4, 2, 1, 3],
        "crossings": [0, 4, 2],
        "depots": [0, 4],
        "initial_point": 0,
        "num_routes": 2,
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
        "max_time": 61598,
        "alpha": 41,
    },
}


def check(label: str, ok: bool, detail: str = "") -> None:
    status = "OK" if ok else "FALHOU"
    suffix = f" — {detail}" if detail else ""
    print(f"[{status}] {label}{suffix}")


def run() -> None:
    with httpx.Client(base_url=BASE_URL, timeout=600) as client:
        print("\n=== Teste: excluir instância ===\n")

        print("--- 1. Criar instância ---")
        r = client.post("/instances/", json=INSTANCE_PAYLOAD)
        check("POST /instances/ retorna 201", r.status_code == 201, f"HTTP {r.status_code}")
        if r.status_code != 201:
            print(f"       Resposta: {r.text}")
            return
        instance_id = r.json()["id"]
        print(f"       id={instance_id}")

        print("\n--- 2. Excluir instância ---")
        r = client.delete(f"/instances/{instance_id}")
        check("DELETE /instances/{id} retorna 204", r.status_code == 204, f"HTTP {r.status_code}")

        print("\n--- 3. Instância não existe mais ---")
        r = client.get(f"/instances/{instance_id}")
        check("GET /instances/{id} retorna 404", r.status_code == 404, f"HTTP {r.status_code}")

        print("\n--- 4. Excluir instância inexistente ---")
        r = client.delete("/instances/99999")
        check("DELETE /instances/99999 retorna 404", r.status_code == 404, f"HTTP {r.status_code}")

        print("\n--- 5. Excluir instância com solução associada ---")
        payload_with_solution = {
            **INSTANCE_PAYLOAD,
            "name": "instancia-para-excluir-com-solver",
        }
        r = client.post("/instances/", json=payload_with_solution)
        if r.status_code != 201:
            check("criar segunda instância", False, r.text)
            return
        instance_id = r.json()["id"]
        r_run = client.post(f"/instances/{instance_id}/run")
        check("solver executado", r_run.status_code == 201, f"HTTP {r_run.status_code}")
        if r_run.status_code != 201:
            print(f"       Resposta: {r_run.text}")
            return
        solution_id = r_run.json()["id"]
        print(f"       solution_id={solution_id}")

        r = client.delete(f"/instances/{instance_id}")
        check("DELETE com solução retorna 204", r.status_code == 204, f"HTTP {r.status_code}")
        r = client.get(f"/instances/{instance_id}")
        check("instância removida após solver", r.status_code == 404, f"HTTP {r.status_code}")
        r = client.get(f"/solutions/{solution_id}")
        check("solução removida em cascata", r.status_code == 404, f"HTTP {r.status_code}")

        print()


if __name__ == "__main__":
    run()
