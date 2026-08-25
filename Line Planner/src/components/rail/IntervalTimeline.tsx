import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toHHMM, toDuration, snap } from "@/lib/rail/time";
import type { DemandInterval } from "@/lib/rail/types";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/rail/store";
import {
  MIN_INTERVAL,
  fitIntervals,
  intervalsNeedFit,
  moveBoundary,
  removeInterval,
  splitLargest,
} from "@/lib/rail/intervals";

interface Props {
  intervals: DemandInterval[];
  dayStart: number;
  horizon: number;
  onChange: (intervals: DemandInterval[]) => void;
}

export function IntervalTimeline({ intervals, dayStart, horizon, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const span = Math.max(horizon - dayStart, 1);
  const pct = (s: number) => ((s - dayStart) / span) * 100;

  // A cobertura precisa ser total e contígua dentro da janela de operação.
  useEffect(() => {
    if (intervalsNeedFit(intervals, dayStart, horizon)) {
      onChange(fitIntervals(intervals, dayStart, horizon));
    }
  }, [intervals, dayStart, horizon, onChange]);

  const posFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return dayStart;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return snap(dayStart + ratio * span, 300);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragIndex === null) return;
    onChange(moveBoundary(intervals, dragIndex, posFromEvent(e.clientX)));
  };

  const ticks: number[] = [];
  for (let h = Math.ceil(dayStart / 3600); h * 3600 <= horizon; h += 1) ticks.push(h);

  const canSplit = intervals.some((iv) => iv.end - iv.start >= MIN_INTERVAL * 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Intervalos de demanda</h3>
          <p className="text-xs text-muted-foreground">
            Os intervalos cobrem toda a operação de {toHHMM(dayStart)} a {toHHMM(horizon)}, sem
            lacunas nem sobreposição. Arraste as divisórias para mudar onde um período termina e o
            próximo começa.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange(splitLargest(intervals, uid("iv")))}
          disabled={!canSplit}
        >
          <Plus className="size-4" /> Adicionar intervalo
        </Button>
      </div>

      <div
        ref={trackRef}
        className="relative h-24 select-none rounded-lg border border-border bg-muted/50"
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragIndex(null)}
        onPointerLeave={() => setDragIndex(null)}
      >
        {ticks.map((h) => (
          <div
            key={h}
            className="absolute inset-y-0 border-l border-border/70"
            style={{ left: `${pct(h * 3600)}%` }}
          >
            <span className="absolute bottom-0.5 left-1 text-[10px] tabular text-muted-foreground">
              {String(h % 24).padStart(2, "0")}h
            </span>
          </div>
        ))}

        {intervals.map((iv, i) => (
          <div
            key={iv.id}
            className={cn(
              "absolute top-2 flex h-14 items-center justify-center rounded-md border text-xs font-medium shadow-sm",
              iv.color === "peak"
                ? "border-peak/60 bg-peak/25 text-foreground"
                : "border-offpeak/60 bg-offpeak/25 text-foreground",
            )}
            style={{ left: `${pct(iv.start)}%`, width: `${(100 * (iv.end - iv.start)) / span}%` }}
            title={`${iv.name} · ${toHHMM(iv.start)}–${toHHMM(iv.end)}`}
          >
            <span className="pointer-events-none truncate px-3 text-center leading-tight">
              {iv.name}
              <br />
              <span className="tabular text-[11px] text-muted-foreground">
                {toHHMM(iv.start)} – {toHHMM(iv.end)}
              </span>
            </span>
            {i < intervals.length - 1 && (
              <span
                className="absolute -right-1.5 top-0 z-10 h-full w-3 cursor-ew-resize rounded bg-foreground/25 hover:bg-foreground/60"
                onPointerDown={() => setDragIndex(i)}
                title="Arraste para mover a divisória"
              />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {intervals.map((iv) => (
          <div key={iv.id} className="flex items-center gap-2">
            <span
              className={cn("size-3 rounded-full", iv.color === "peak" ? "bg-peak" : "bg-offpeak")}
            />
            <Input
              value={iv.name}
              className="h-9 max-w-56"
              onChange={(e) =>
                onChange(intervals.map((x) => (x.id === iv.id ? { ...x, name: e.target.value } : x)))
              }
            />
            <span className="tabular text-sm text-muted-foreground">
              {toHHMM(iv.start)} – {toHHMM(iv.end)} · {toDuration(iv.end - iv.start)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="ml-auto text-muted-foreground"
              disabled={intervals.length <= 1}
              onClick={() => onChange(removeInterval(intervals, iv.id))}
              title="Remover — o período vizinho ocupa o espaço"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
