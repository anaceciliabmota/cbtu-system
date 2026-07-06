import type { Connection } from "@/types/instance";

export function validateIntList(text: string, field: string): string | null {
  for (const token of text.split(",")) {
    const t = token.trim();
    if (!t) continue;
    if (!/^-?\d+$/.test(t)) {
      return `${field}: '${t}' não é um número inteiro válido.`;
    }
  }
  return null;
}

export interface ValidateInput {
  name: string;
  num_trains: number | null;
  num_routes: number | null;
  num_points: number | null;
  num_intervals: number | null;
  num_trips: number[];
  routes: number[][];
  service_time_min: number[];
  service_time_max: number[];
  demands: number[][];
  connections: Connection[];
  intervalsSeconds: number[][];
  initial_point: number | null;
  max_time_seconds: number | null;
  alpha: number | null;
  stations: string;
  crossings: string;
  depots: string;
}

export function validate(input: ValidateInput): string[] {
  const errors: string[] = [];
  const {
    name,
    num_trains,
    num_routes,
    num_points,
    num_intervals,
    num_trips,
    routes,
    service_time_min: stmin,
    service_time_max: stmax,
    demands,
    connections,
    intervalsSeconds,
    initial_point,
    max_time_seconds,
    alpha,
    stations,
    crossings,
    depots,
  } = input;

  if (!name.trim()) errors.push("Nome da instância é obrigatório.");
  if (!num_trains) errors.push("Número de trens é obrigatório.");
  if (!num_routes) errors.push("Número de rotas é obrigatório.");
  if (!num_points) errors.push("Número de pontos é obrigatório.");
  if (!num_intervals) errors.push("Número de intervalos é obrigatório.");

  if (num_trains && num_routes) {
    if (num_trips.length < num_trains) {
      errors.push("Preencha o máximo de viagens para todos os trens.");
    }
    const emptyRoutes = routes
      .map((r, i) => (r.length === 0 ? i : -1))
      .filter((i) => i >= 0);
    if (emptyRoutes.length) {
      errors.push(`Rota(s) vazia(s): ${emptyRoutes}.`);
    }
  }

  if (num_points) {
    const n = num_points;
    const matrixSize = n * 2;
    if (stmin.length < n) {
      errors.push("Preencha o service time mínimo para todos os pontos.");
    }
    if (stmax.length < n) {
      errors.push("Preencha o service time máximo para todos os pontos.");
    }
    const demandsOk =
      demands.length >= matrixSize &&
      demands.every(
        (row, i) =>
          i < matrixSize &&
          row.length >= (num_intervals ?? 0) &&
          row.every((v) => !Number.isNaN(v)),
      );
    if (!demandsOk) {
      errors.push(`Preencha a demand para todos os ${matrixSize} nós.`);
    }
    if (!connections.length) {
      errors.push("Adicione pelo menos uma ligação na cost matrix.");
    }
  }

  if (num_intervals && !intervalsSeconds.length) {
    errors.push("Preencha os intervalos de tempo.");
  }

  if (initial_point === null) errors.push("initial_point é obrigatório.");
  if (max_time_seconds === null) errors.push("max_time é obrigatório.");
  if (alpha === null) errors.push("alpha é obrigatório.");

  for (const field of ["stations", "crossings", "depots"] as const) {
    const val = { stations, crossings, depots }[field].trim();
    if (!val) errors.push(`${field} é obrigatório.`);
    else {
      const err = validateIntList(val, field);
      if (err) errors.push(err);
    }
  }

  return errors;
}
