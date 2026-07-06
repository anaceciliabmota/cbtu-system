import type { Connection, FormDefaults } from "@/types/instance";
import { matrixToConnections } from "./matrix";
import { parseRouteText } from "./buildParams";

export interface IntervalPair {
  start: string;
  end: string;
}

export interface InstanceFormState {
  name: string;
  num_trains: number | "";
  num_routes: number | "";
  num_points: number | "";
  num_intervals: number | "";
  num_trips: (number | "")[];
  routeTexts: string[];
  service_time_min: (number | "")[];
  service_time_max: (number | "")[];
  demands: (number | "")[][];
  intervals: IntervalPair[];
  max_time: string;
  initial_point: number | "";
  alpha: number | "";
  stations: string;
  crossings: string;
  depots: string;
}

export function emptyFormState(): InstanceFormState {
  return {
    name: "",
    num_trains: "",
    num_routes: "",
    num_points: "",
    num_intervals: "",
    num_trips: [],
    routeTexts: [],
    service_time_min: [],
    service_time_max: [],
    demands: [],
    intervals: [],
    max_time: "00:00",
    initial_point: "",
    alpha: "",
    stations: "",
    crossings: "",
    depots: "",
  };
}

export function defaultsToFormState(
  d: FormDefaults,
  name: string,
): InstanceFormState {
  const numTrains = d.num_trains ?? "";
  const numRoutes = d.num_routes ?? "";
  const numPoints = d.num_points ?? "";
  const numIntervals = d.num_intervals ?? "";

  return {
    name,
    num_trains: numTrains,
    num_routes: numRoutes,
    num_points: numPoints,
    num_intervals: numIntervals,
    num_trips: resizeTrips(d.num_trips, numTrains),
    routeTexts: resizeRoutes(d.routes, numRoutes),
    service_time_min: resizeNumbers(d.service_time_min, numPoints),
    service_time_max: resizeNumbers(d.service_time_max, numPoints),
    demands: resizeDemands(d.demands, numPoints, numIntervals),
    intervals: resizeIntervals(d.time_intervals, numIntervals),
    max_time: d.max_time,
    initial_point: d.initial_point ?? "",
    alpha: d.alpha ?? "",
    stations: d.stations,
    crossings: d.crossings,
    depots: d.depots,
  };
}

export function connectionsFromDefaults(d: FormDefaults): Connection[] {
  return matrixToConnections(d.cost_matrix);
}

function resizeTrips(
  trips: number[],
  numTrains: number | "",
): (number | "")[] {
  const n = typeof numTrains === "number" ? numTrains : 0;
  return Array.from({ length: n }, (_, i) => trips[i] ?? "");
}

function resizeRoutes(routes: number[][], numRoutes: number | ""): string[] {
  const n = typeof numRoutes === "number" ? numRoutes : 0;
  return Array.from({ length: n }, (_, i) =>
    routes[i] ? routes[i].join(" ") : "",
  );
}

function resizeNumbers(
  values: number[],
  count: number | "",
): (number | "")[] {
  const n = typeof count === "number" ? count : 0;
  return Array.from({ length: n }, (_, i) => values[i] ?? "");
}

function resizeDemands(
  demands: number[][],
  numPoints: number | "",
  numIntervals: number | "",
): (number | "")[][] {
  const rows = typeof numPoints === "number" ? numPoints * 2 : 0;
  const cols = typeof numIntervals === "number" ? numIntervals : 0;
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => demands[i]?.[j] ?? ""),
  );
}

function resizeIntervals(
  intervals: string[][],
  numIntervals: number | "",
): IntervalPair[] {
  const n = typeof numIntervals === "number" ? numIntervals : 0;
  return Array.from({ length: n }, (_, i) => ({
    start: intervals[i]?.[0] ?? "00:00",
    end: intervals[i]?.[1] ?? "00:00",
  }));
}

export function parseRoutesFromForm(routeTexts: string[]): number[][] {
  return routeTexts.map(parseRouteText);
}

export function parseDemandsFromForm(
  demands: (number | "")[][],
): number[][] {
  return demands.map((row) =>
    row.map((v) => (v === "" ? NaN : Number(v))),
  );
}

export function parseTripsFromForm(num_trips: (number | "")[]): number[] {
  return num_trips.filter((v) => v !== "").map(Number);
}

export function parseStFromForm(values: (number | "")[]): number[] {
  return values.filter((v) => v !== "").map(Number);
}
