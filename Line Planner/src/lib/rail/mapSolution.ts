import type { ApiSolutionResult, ApiStop, ApiTrip } from "./api";
import type { Direction, Instance, SolverResult, Stop, TrainSchedule, Trip } from "./types";

function collapsePoints(points: number[]): number[] {
  const out: number[] = [];
  for (const p of points) {
    if (out[out.length - 1] !== p) out.push(p);
  }
  return out;
}

function sequencesEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function inferRouteId(inst: Instance, stops: ApiStop[]): string {
  const seq = collapsePoints(stops.map((s) => s.point))
    .map((p) => inst.stations[p]?.id)
    .filter((id): id is string => Boolean(id));
  const match = inst.routes.find(
    (r) => sequencesEqual(r.sequence, seq) || sequencesEqual([...r.sequence].reverse(), seq),
  );
  return match?.id ?? inst.routes[0]?.id ?? "";
}

function directionAt(stops: ApiStop[], index: number): Direction {
  const current = stops[index]?.point;
  for (let i = index + 1; i < stops.length; i++) {
    const next = stops[i]?.point;
    if (current === undefined || next === undefined || next === current) continue;
    return next > current ? "outbound" : "inbound";
  }
  for (let i = index - 1; i >= 0; i--) {
    const prev = stops[i]?.point;
    if (current === undefined || prev === undefined || prev === current) continue;
    return current > prev ? "outbound" : "inbound";
  }
  return "outbound";
}

function mapStops(inst: Instance, stops: ApiStop[], offset: number): Stop[] {
  return stops.map((st, i) => ({
    stationId: inst.stations[st.point]?.id ?? `st-${st.point}`,
    arrival: st.arrival + offset,
    departure: st.departure + offset,
    direction: directionAt(stops, i),
  }));
}

function mapTrip(inst: Instance, trip: ApiTrip, offset: number): Trip {
  return {
    index: trip.id,
    routeId: inferRouteId(inst, trip.stops),
    stops: mapStops(inst, trip.stops, offset),
  };
}

export function mapApiSolution(inst: Instance, result: ApiSolutionResult): SolverResult {
  const offset = inst.dayStart;
  const schedules: TrainSchedule[] = inst.trains.map((train, i) => {
    const apiTrain = result.trains[i];
    return {
      trainId: train.id,
      trips: (apiTrain?.trips ?? []).map((trip) => mapTrip(inst, trip, offset)),
    };
  });

  if (result.trains.length > inst.trains.length) {
    for (let i = inst.trains.length; i < result.trains.length; i++) {
      const apiTrain = result.trains[i]!;
      schedules.push({
        trainId: `tr-${apiTrain.id}`,
        trips: apiTrain.trips.map((trip) => mapTrip(inst, trip, offset)),
      });
    }
  }

  const tripsScheduled = schedules.reduce((acc, s) => acc + s.trips.length, 0);
  return {
    objective: result.solution_value,
    runtimeMs: Math.round((result.total_time ?? 0) * 1000),
    trainsUsed: schedules.filter((s) => s.trips.length > 0).length,
    tripsScheduled,
    schedules,
  };
}
