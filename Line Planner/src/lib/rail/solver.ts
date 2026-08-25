import type { Instance, SolverResult, Stop, TrainSchedule, Trip } from "./types";

const SPEED_FACTOR = 0.78; // distance unit -> seconds

function segmentTime(inst: Instance, a: string, b: string): number {
  const seg = inst.segments.find(
    (s) => (s.fromId === a && s.toId === b) || (s.fromId === b && s.toId === a),
  );
  const distance = seg?.distance ?? 600;
  return Math.round(distance * SPEED_FACTOR);
}

function stationIndex(inst: Instance, id: string): number {
  return inst.stations.findIndex((s) => s.id === id);
}

function pathBetween(inst: Instance, a: string, b: string): string[] {
  const ia = stationIndex(inst, a);
  const ib = stationIndex(inst, b);
  if (ia < 0 || ib < 0) return [b];
  const step = ib > ia ? 1 : -1;
  const out: string[] = [];
  for (let i = ia + step; ; i += step) {
    out.push(inst.stations[i]!.id);
    if (i === ib) break;
  }
  return out;
}

/** Mocked solver: deterministic, physically consistent schedule. */
export function runMockSolver(inst: Instance): SolverResult {
  const schedules: TrainSchedule[] = [];
  let tripsScheduled = 0;

  inst.trains.forEach((train, trainIdx) => {
    const route = inst.routes.find((r) => r.id === train.routeId) ?? inst.routes[0];
    const trips: Trip[] = [];
    if (!route) {
      schedules.push({ trainId: train.id, trips });
      return;
    }

    let clock = inst.dayStart + trainIdx * (inst.minHeadway + inst.alpha);

    for (let t = 0; t < train.maxTrips; t++) {
      const expanded: string[] = [route.sequence[0]!];
      for (let i = 1; i < route.sequence.length; i++) {
        expanded.push(...pathBetween(inst, route.sequence[i - 1]!, route.sequence[i]!));
      }

      const stops: Stop[] = [];
      let direction: "inbound" | "outbound" = route.startsInbound ? "inbound" : "outbound";
      let time = clock;

      expanded.forEach((stationId, i) => {
        if (i > 0) {
          time += segmentTime(inst, expanded[i - 1]!, stationId);
          const prevIdx = stationIndex(inst, expanded[i - 1]!);
          const curIdx = stationIndex(inst, stationId);
          const goingRight = curIdx > prevIdx;
          const firstGoesRight =
            stationIndex(inst, expanded[1] ?? expanded[0]!) > stationIndex(inst, expanded[0]!);
          const baseDirection: "inbound" | "outbound" = route.startsInbound
            ? "inbound"
            : "outbound";
          const flipped: "inbound" | "outbound" =
            baseDirection === "inbound" ? "outbound" : "inbound";
          direction = goingRight === firstGoesRight ? baseDirection : flipped;
        }
        const station = inst.stations.find((s) => s.id === stationId);
        const arrival = time;
        const dwell = i === 0 || i === expanded.length - 1 ? (station?.dwellMin ?? 120) : 60;
        const departure = arrival + dwell;
        time = departure;
        stops.push({ stationId, arrival, departure, direction });
      });

      const last = stops[stops.length - 1]!;
      if (last.departure > inst.horizon) break;

      trips.push({ index: t + 1, routeId: route.id, stops });
      tripsScheduled += 1;
      clock = last.departure + inst.minHeadway + inst.alpha;
    }

    schedules.push({ trainId: train.id, trips });
  });

  const objective = schedules.reduce(
    (acc, s) =>
      acc +
      s.trips.reduce((a, t) => a + (t.stops[t.stops.length - 1]!.departure - t.stops[0]!.arrival), 0),
    0,
  );

  return {
    objective: Math.round(objective / 60),
    runtimeMs: 2340,
    trainsUsed: schedules.filter((s) => s.trips.length > 0).length,
    tripsScheduled,
    schedules,
  };
}

export { segmentTime };
