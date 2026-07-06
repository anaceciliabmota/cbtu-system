import type { FormDefaults, InstanceParams } from "@/types/instance";
import { secondsToTimeString } from "./time";

export function emptyDefaults(): FormDefaults {
  return {
    num_trains: null,
    num_routes: null,
    num_points: null,
    num_intervals: null,
    num_trips: [],
    routes: [],
    service_time_min: [],
    service_time_max: [],
    cost_matrix: [],
    demands: [],
    time_intervals: [],
    max_time: "00:00",
    stations: "",
    crossings: "",
    depots: "",
    initial_point: null,
    alpha: null,
  };
}

export function paramsToDefaults(params: Partial<InstanceParams>): FormDefaults {
  const stmin = params.service_time_min ?? [];
  const intervals = params.time_intervals ?? [];
  return {
    num_trains: params.num_trains ?? null,
    num_points:
      params.num_points ??
      (stmin.length > 0 ? stmin.length : null),
    num_intervals: intervals.length > 0 ? intervals.length : null,
    num_routes: params.routes?.length ? params.routes.length : null,
    num_trips: params.num_trips ?? [],
    routes: params.routes ?? [],
    service_time_min: params.service_time_min ?? [],
    service_time_max: params.service_time_max ?? [],
    cost_matrix: params.cost_matrix ?? [],
    demands: params.demands ?? [],
    time_intervals: intervals.map(([s, e]) => [
      secondsToTimeString(s),
      secondsToTimeString(e),
    ]),
    max_time: secondsToTimeString(params.max_time ?? 0),
    stations: (params.stations ?? []).join(", "),
    crossings: (params.crossings ?? []).join(", "),
    depots: (params.depots ?? []).join(", "),
    initial_point: params.initial_point ?? null,
    alpha: params.alpha ?? null,
  };
}
