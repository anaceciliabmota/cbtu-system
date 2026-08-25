export const DAY = 24 * 3600;

export function toHHMM(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function toHHMMSS(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** "2m 22s" style duration */
export function toDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m === 0) return `${rest}s`;
  if (rest === 0) return `${m}m`;
  return `${m}m ${rest}s`;
}

export function fromHHMM(value: string): number {
  const parts = value.split(":").map((n) => parseInt(n, 10));
  const h = parts[0] ?? NaN;
  const m = parts[1] ?? NaN;
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 3600 + m * 60;
}

export function snap(seconds: number, step = 300): number {
  return Math.round(seconds / step) * step;
}
