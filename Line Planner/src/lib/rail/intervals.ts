import type { DemandInterval } from "./types";

export const MIN_INTERVAL = 300; // 5 min

const colorFor = (i: number) => (i % 2 === 0 ? "peak" : "offpeak");

/**
 * Garante que os intervalos cubram exatamente [dayStart, horizon],
 * sem sobreposição e sem lacunas.
 */
export function fitIntervals(
  intervals: DemandInterval[],
  dayStart: number,
  horizon: number,
): DemandInterval[] {
  const span = horizon - dayStart;
  if (span <= 0) return [];

  if (intervals.length === 0) {
    return [
      { id: "iv-1", name: "Período 1", start: dayStart, end: horizon, color: "peak" },
    ];
  }

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const oldStart = sorted[0]!.start;
  const oldEnd = sorted[sorted.length - 1]!.end;
  const oldSpan = oldEnd - oldStart;
  const map = (t: number) =>
    oldSpan > 0 ? dayStart + ((t - oldStart) / oldSpan) * span : dayStart;

  // Limita a quantidade de intervalos ao que cabe com duração mínima
  const maxCount = Math.max(1, Math.floor(span / MIN_INTERVAL));
  const list = sorted.slice(0, maxCount);

  const out: DemandInterval[] = [];
  let cursor = dayStart;
  list.forEach((iv, i) => {
    const remaining = list.length - i - 1;
    const rawEnd = i === list.length - 1 ? horizon : Math.round(map(iv.end));
    const end = Math.min(
      Math.max(rawEnd, cursor + MIN_INTERVAL),
      horizon - remaining * MIN_INTERVAL,
    );
    out.push({ ...iv, start: cursor, end, color: iv.color || colorFor(i) });
    cursor = end;
  });
  out[out.length - 1]!.end = horizon;
  return out;
}

export function intervalsNeedFit(
  intervals: DemandInterval[],
  dayStart: number,
  horizon: number,
): boolean {
  const fitted = fitIntervals(intervals, dayStart, horizon);
  if (fitted.length !== intervals.length) return true;
  return fitted.some(
    (iv, i) =>
      iv.start !== intervals[i]!.start ||
      iv.end !== intervals[i]!.end ||
      iv.id !== intervals[i]!.id,
  );
}

/** Divide o maior intervalo em dois. */
export function splitLargest(intervals: DemandInterval[], newId: string): DemandInterval[] {
  if (intervals.length === 0) return intervals;
  let idx = 0;
  intervals.forEach((iv, i) => {
    if (iv.end - iv.start > intervals[idx]!.end - intervals[idx]!.start) idx = i;
  });
  const target = intervals[idx]!;
  if (target.end - target.start < MIN_INTERVAL * 2) return intervals;
  const mid = Math.round((target.start + target.end) / 2);
  const next: DemandInterval[] = [
    ...intervals.slice(0, idx),
    { ...target, end: mid },
    {
      id: newId,
      name: `Período ${intervals.length + 1}`,
      start: mid,
      end: target.end,
      color: target.color === "peak" ? "offpeak" : "peak",
    },
    ...intervals.slice(idx + 1),
  ];
  return next;
}

/** Remove um intervalo, estendendo o vizinho para não deixar lacuna. */
export function removeInterval(intervals: DemandInterval[], id: string): DemandInterval[] {
  if (intervals.length <= 1) return intervals;
  const idx = intervals.findIndex((iv) => iv.id === id);
  if (idx < 0) return intervals;
  const rest = intervals.filter((iv) => iv.id !== id);
  const target = intervals[idx]!;
  if (idx > 0) {
    const prev = rest[idx - 1]!;
    rest[idx - 1] = { ...prev, end: target.end };
  } else {
    const nextIv = rest[0]!;
    rest[0] = { ...nextIv, start: target.start };
  }
  return rest;
}

/** Move a fronteira entre o intervalo i e i+1. */
export function moveBoundary(
  intervals: DemandInterval[],
  index: number,
  t: number,
): DemandInterval[] {
  const a = intervals[index];
  const b = intervals[index + 1];
  if (!a || !b) return intervals;
  const clamped = Math.min(Math.max(t, a.start + MIN_INTERVAL), b.end - MIN_INTERVAL);
  return intervals.map((iv, i) =>
    i === index ? { ...iv, end: clamped } : i === index + 1 ? { ...iv, start: clamped } : iv,
  );
}
