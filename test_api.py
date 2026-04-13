"""
Script de teste do fluxo completo da API.
Requer o servidor rodando: uvicorn main:app --reload
"""

import httpx

BASE_URL = "http://localhost:8000"

INSTANCE_PAYLOAD = {
    "name": "instancia-teste",
    "params": {
        "num_trains": 2,
        "num_trips": [6, 6],
        "time_intervals": [[0, 61598]],
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
        "demands": [11, 11, 11, 11, 0, 0, 11, 11, 11, 11],
        "max_time": 61598,
        "alpha": 41,
    },
}


def check(label: str, response: httpx.Response, expected_status: int) -> dict:
    status = "OK" if response.status_code == expected_status else "FALHOU"
    print(f"[{status}] {label} — HTTP {response.status_code}")
    if status == "FALHOU":
        print(f"       Resposta: {response.text}")
    return response.json()


def run() -> None:
    with httpx.Client(base_url=BASE_URL, timeout=600) as client: # 10 minutes (quanto tempo esperar o resolvedor)
        print("\n--- 1. Criar instância ---")
        data = check("POST /instances/", client.post("/instances/", json=INSTANCE_PAYLOAD), 201)
        instance_id = data.get("id")
        print(f"       id={instance_id}, name={data.get('name')}")

        print("\n--- 2. Listar instâncias ---")
        data = check("GET /instances/", client.get("/instances/"), 200)
        print(f"       total={len(data)}")

        print("\n--- 3. Buscar instância por id ---")
        data = check(f"GET /instances/{instance_id}", client.get(f"/instances/{instance_id}"), 200)
        print(f"       name={data.get('name')}")

        print("\n--- 4. Executar solver ---")
        data = check(f"POST /instances/{instance_id}/run", client.post(f"/instances/{instance_id}/run"), 201)
        solution_id = data.get("id")
        print(f"       solution_id={solution_id}, status={data.get('status')}")
        print(f"       solution_value={data.get('result', {}).get('solution_value')}")

        print("\n--- 5. Buscar solução ---")
        data = check(f"GET /solutions/{solution_id}", client.get(f"/solutions/{solution_id}"), 200)
        print(f"       instance_id={data.get('instance_id')}")

        print("\n--- 6. Instância inexistente (deve retornar 404) ---")
        check("GET /instances/9999", client.get("/instances/9999"), 404)

        print("\n--- 7. Payload inválido (deve retornar 422) ---")
        check("POST /instances/ sem params", client.post("/instances/", json={"name": "ruim"}), 422)

        print()


if __name__ == "__main__":
    run()
