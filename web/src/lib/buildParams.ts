import type { InstanceParams } from "@/types/instance";
import { connectionsToMatrix } from "./matrix";
import { applyOffset, timeStringToSeconds } from "./time";

export function parseIntList(text: string): number[] {
  return text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number);
}

export interface BuildInput {
  num_trains: number;
  num_routes: number;
  num_points: number;
  num_intervals: number;
  num_trips: number[];
  routes: number[][];
  service_time_min: number[];
  service_time_max: number[];
  cost_matrix: number[][];
  demands: number[][];
  intervalsSeconds: number[][];
  initial_point: number;
  max_time_seconds: number;
  alpha: number;
  stations: string;
  crossings: string;
  depots: string;
}

export function buildParams(input: BuildInput): InstanceParams {
  const { intervals, maxTime } = applyOffset(
    input.intervalsSeconds,
    input.max_time_seconds,
  );

  return {
    num_trains: input.num_trains,
    num_trips: input.num_trips,
    time_intervals: intervals,
    num_points: input.num_points,
    stations: parseIntList(input.stations),
    crossings: parseIntList(input.crossings),
    depots: parseIntList(input.depots),
    initial_point: input.initial_point,
    routes: input.routes,
    service_time_min: input.service_time_min,
    service_time_max: input.service_time_max,
    cost_matrix: input.cost_matrix,
    demands: input.demands,
    max_time: maxTime,
    alpha: input.alpha,
  };
}

export function parseRouteText(text: string): number[] {
  return text
    .split(/\s+/)
    .map((n) => n.trim())
    .filter(Boolean)
    .map(Number);
}

export function intervalsFromTimeStrings(
  pairs: string[][],
): number[][] {
  return pairs.map(([start, end]) => [
    timeStringToSeconds(start),
    timeStringToSeconds(end),
  ]);
}

export { connectionsToMatrix };
