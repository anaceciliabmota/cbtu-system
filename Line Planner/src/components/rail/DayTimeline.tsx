import { toHHMM } from "@/lib/rail/time";
import type { DemandInterval } from "@/lib/rail/types";
import { cn } from "@/lib/utils";

interface Props {
  dayStart: number;
  horizon: number;
  intervals: DemandInterval[];
  className?: string;
  label?: string;
}

export const TIMELINE_END = 24 * 3600;

export function DayTimeline({ dayStart, horizon, intervals, className, label = "Horizonte do dia" }: Props) {
  const pct = (s: number) => (s / TIMELINE_END) * 100;
  const hours = [0, 3, 6, 9, 12, 15, 18, 21, 24];

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">{label}</span>
        <span className="tabular">
          Operação de <span className="font-semibold text-foreground">{toHHMM(dayStart)}</span> até{" "}
          <span className="font-semibold text-foreground">{toHHMM(horizon)}</span>
        </span>
      </div>
      <div className="relative h-7 overflow-hidden rounded-md border border-border bg-muted/60">
        <div
          className="absolute inset-y-0 bg-background/70"
          style={{ left: `${pct(dayStart)}%`, width: `${pct(horizon - dayStart)}%` }}
        />
        {intervals.map((iv) => (
          <div
            key={iv.id}
            className={cn(
              "absolute inset-y-0 border-x border-background/60",
              iv.color === "peak" ? "bg-peak/35" : "bg-offpeak/35",
            )}
            style={{ left: `${pct(iv.start)}%`, width: `${pct(iv.end - iv.start)}%` }}
            title={`${iv.name} · ${toHHMM(iv.start)}–${toHHMM(iv.end)}`}
          />
        ))}
        <div
          className="absolute inset-y-0 w-0.5 bg-primary"
          style={{ left: `${pct(dayStart)}%` }}
          title={`Início do dia ${toHHMM(dayStart)}`}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-destructive"
          style={{ left: `${pct(horizon)}%` }}
          title={`Fim do dia ${toHHMM(horizon)}`}
        />
      </div>
      <div className="relative h-4">
        {hours.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 text-[10px] tabular text-muted-foreground"
            style={{ left: `${pct(h * 3600)}%` }}
          >
            {String(h % 24).padStart(2, "0")}:00
          </span>
        ))}
      </div>
    </div>
  );
}
