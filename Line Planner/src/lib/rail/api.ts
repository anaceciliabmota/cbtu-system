import type { Instance } from "./types";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8000";

const RUN_TIMEOUT_MS = 10 * 60 * 1000;

export interface ApiStop {
  point: number;
  arrival: number;
  departure: number;
}

export interface ApiTrip {
  id: number;
  stops: ApiStop[];
}

export interface ApiTrainSolution {
  id: number;
  trips: ApiTrip[];
}

export interface ApiSolutionResult {
  total_time: number;
  solution_value: number;
  trains: ApiTrainSolution[];
}

export interface ApiSolution {
  id: number;
  instance_id: number;
  created_at: string;
  status: string;
  result: ApiSolutionResult;
}

export interface ApiInstance {
  id: number;
  name: string;
  created_at: string;
  params: Record<string, unknown>;
  line: Instance;
  last_run: Instance["lastRun"];
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: { msg?: string }) => item?.msg)
      .filter(Boolean)
      .join("; ");
  }
  return res.statusText || `HTTP ${res.status}`;
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (res.status === 204) return undefined as T;
    if (!res.ok) throw new ApiError(await readError(res), res.status);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Tempo esgotado ao falar com o backend.", 408);
    }
    throw new ApiError("Não foi possível conectar ao backend. Confira se a API está rodando.", 0);
  } finally {
    clearTimeout(timer);
  }
}

export function listInstances() {
  return request<ApiInstance[]>("/instances/");
}

export function getInstance(id: string) {
  return request<ApiInstance>(`/instances/${id}`);
}

export function createInstanceApi(name: string, line: Instance) {
  return request<ApiInstance>("/instances/", {
    method: "POST",
    body: JSON.stringify({ name, line }),
  });
}

export function updateInstanceApi(id: string, name: string, line: Instance) {
  return request<ApiInstance>(`/instances/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, line }),
  });
}

export function deleteInstanceApi(id: string) {
  return request<void>(`/instances/${id}`, { method: "DELETE" });
}

export function listSolutions(instanceId: string) {
  return request<ApiSolution[]>(`/instances/${instanceId}/solutions`);
}

export function runInstanceApi(id: string) {
  return request<ApiSolution>(`/instances/${id}/run`, { method: "POST" }, RUN_TIMEOUT_MS);
}
