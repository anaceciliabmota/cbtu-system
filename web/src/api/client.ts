import type { InstanceParams, InstanceRead, SolutionRead } from "@/types/instance";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TIMEOUT_MS = 600_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function parseErrorDetail(body: unknown): string[] {
  if (!body || typeof body !== "object" || !("detail" in body)) return [];
  const { detail } = body as { detail: unknown };
  if (typeof detail === "string") return [detail];
  if (!Array.isArray(detail)) return [];
  return detail.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "msg" in item) {
      const loc = "loc" in item && Array.isArray(item.loc) ? item.loc.join(".") : "";
      return loc ? `${loc}: ${String(item.msg)}` : String(item.msg);
    }
    return JSON.stringify(item);
  });
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const details = parseErrorDetail(body);
      throw new ApiError(
        details[0] ?? `HTTP ${res.status}`,
        res.status,
        details,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function getInstances(): Promise<InstanceRead[]> {
  return request<InstanceRead[]>("/instances/");
}

export function getInstance(id: number): Promise<InstanceRead> {
  return request<InstanceRead>(`/instances/${id}`);
}

export function createInstance(
  name: string,
  params: InstanceParams,
): Promise<InstanceRead> {
  return request<InstanceRead>("/instances/", {
    method: "POST",
    body: JSON.stringify({ name, params }),
  });
}

export function updateInstance(
  id: number,
  name: string,
  params: InstanceParams,
): Promise<InstanceRead> {
  return request<InstanceRead>(`/instances/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, params }),
  });
}

export function deleteInstance(id: number): Promise<void> {
  return request<void>(`/instances/${id}`, { method: "DELETE" });
}

export function runSolver(instanceId: number): Promise<SolutionRead> {
  return request<SolutionRead>(`/instances/${instanceId}/run`, {
    method: "POST",
  });
}
