import httpx

BASE_URL = "http://localhost:8000"
TIMEOUT = 600


def get_instances() -> list[dict]:
    r = httpx.get(f"{BASE_URL}/instances/", timeout=TIMEOUT)
    return r.json() if r.is_success else []


def create_instance(name: str, params: dict) -> dict:
    r = httpx.post(f"{BASE_URL}/instances/", json={"name": name, "params": params}, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def update_instance(instance_id: int, name: str, params: dict) -> dict:
    r = httpx.put(f"{BASE_URL}/instances/{instance_id}", json={"name": name, "params": params}, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def delete_instance(instance_id: int) -> None:
    r = httpx.delete(f"{BASE_URL}/instances/{instance_id}", timeout=TIMEOUT)
    r.raise_for_status()


def run_solver(instance_id: int) -> dict:
    r = httpx.post(f"{BASE_URL}/instances/{instance_id}/run", timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()
