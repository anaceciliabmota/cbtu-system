export type StationRole = "station" | "crossing" | "depot";

export interface Station {
  id: string;
  name: string;
  roles: StationRole[];
  dwellMin: number; // seconds
  dwellMax: number; // seconds
}

export interface Segment {
  fromId: string;
  toId: string;
  distance: number;
}

export interface RailRoute {
  id: string;
  name: string;
  /** explicit sequence of station ids, including return legs */
  sequence: string[];
  startsInbound: boolean;
}

export interface Train {
  id: string;
  name: string;
  maxTrips: number;
  routeId: string;
}

export interface DemandInterval {
  id: string;
  name: string;
  start: number; // seconds from midnight
  end: number;
  color: string; // css color token
}

export type Direction = "inbound" | "outbound";

/** key: `${stationId}:${"ida"|"volta"}:${intervalId}` */
export type DemandMap = Record<string, number>;

export interface Instance {
  id: string;
  name: string;
  lineName: string;
  updatedAt: string;
  lastRun: "never" | "success" | "stale";
  stations: Station[];
  segments: Segment[];
  routes: RailRoute[];
  trains: Train[];
  intervals: DemandInterval[];
  demand: DemandMap;
  dayStart: number; // seconds
  horizon: number; // seconds
  alpha: number; // seconds
  minHeadway: number; // seconds — headway mínimo entre partidas
  initialStationId: string;
}

export interface Stop {
  stationId: string;
  arrival: number;
  departure: number;
  direction: Direction;
}

export interface Trip {
  index: number;
  routeId: string;
  stops: Stop[];
}

export interface TrainSchedule {
  trainId: string;
  trips: Trip[];
}

export interface SolverResult {
  objective: number;
  runtimeMs: number;
  trainsUsed: number;
  tripsScheduled: number;
  schedules: TrainSchedule[];
}
