/** Seconds since midnight → "HH:MM" */
export function secondsToTimeString(seconds: number): string {
  const h = Math.floor(seconds / 3600) % 24;
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" or "HH:MM:SS" → seconds since midnight */
export function timeStringToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 3600 + m * 60;
}

export function applyOffset(
  intervalsSeconds: number[][],
  maxTimeSeconds: number,
): { intervals: number[][]; maxTime: number } {
  const offset = intervalsSeconds[0]?.[0] ?? 0;
  const intervals = intervalsSeconds.map(([s, e]) => [s - offset, e - offset]);
  return { intervals, maxTime: maxTimeSeconds - offset };
}
