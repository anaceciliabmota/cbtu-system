import { forwardRef, useMemo } from "react";
import { toHHMM, toHHMMSS } from "@/lib/rail/time";
import type { Instance, SolverResult, Trip } from "@/lib/rail/types";
import { cn } from "@/lib/utils";

/** Mesma paleta do script LaTeX (COLOR_TRAIN). */
const TRAIN_COLORS = [
  "#FF0000",
  "#00AA00",
  "#0000FF",
  "#FF9900",
  "#AA00AA",
  "#00AAAA",
  "#880000",
  "#008800",
  "#000088",
  "#666600",
  "#880088",
  "#008888",
  "#444444",
  "#AA5500",
  "#5555AA",
];

interface Props {
  instance: Instance;
  result: SolverResult;
  /** viagem destacada (as demais ficam esmaecidas) */
  activeTrip?: Trip | null;
  onSelectTrip?: (trip: Trip) => void;
}

const W = 980;
const H = 460;
const M = { top: 16, right: 20, bottom: 34, left: 116 };

export const SpaceTimeChart = forwardRef<HTMLDivElement, Props>(function SpaceTimeChart(
  { instance, result, activeTrip, onSelectTrip },
  ref,
) {
  const points = instance.stations;

  const series = useMemo(() => {
    const indexOf = new Map(points.map((s, i) => [s.id, i]));
    return result.schedules
      .map((sch, si) => {
        const train = instance.trains.find((t) => t.id === sch.trainId);
        const trips = sch.trips.map((trip) => {
          const coords: { t: number; p: number }[] = [];
          for (const st of trip.stops) {
            const p = indexOf.get(st.stationId);
            if (p === undefined) continue;
            const last = coords[coords.length - 1];
            if (!last || last.t !== st.arrival || last.p !== p) coords.push({ t: st.arrival, p });
            coords.push({ t: st.departure, p });
          }
          return { trip, coords };
        });
        return {
          trainId: sch.trainId,
          name: train?.name ?? sch.trainId,
          color: TRAIN_COLORS[si % TRAIN_COLORS.length]!,
          trips,
        };
      })
      .filter((s) => s.trips.length > 0);
  }, [instance.trains, points, result.schedules]);

  const times = series.flatMap((s) => s.trips.flatMap((t) => t.coords.map((c) => c.t)));
  const tMin = times.length ? Math.min(instance.dayStart, ...times) : instance.dayStart;
  const tMax = times.length ? Math.max(instance.horizon, ...times) : instance.horizon;
  const span = Math.max(tMax - tMin, 3600);

  const x = (t: number) => M.left + ((t - tMin) / span) * (W - M.left - M.right);
  const y = (p: number) =>
    M.top +
    (points.length <= 1 ? 0 : (p / (points.length - 1)) * (H - M.top - M.bottom));

  const tickStep = span > 8 * 3600 ? 2 * 3600 : span > 4 * 3600 ? 3600 : 1800;
  const ticks: number[] = [];
  const firstTick = Math.ceil(tMin / tickStep) * tickStep;
  for (let t = firstTick; t <= tMax; t += tickStep) ticks.push(t);

  return (
    <div ref={ref} className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        {/* grid horizontal + rótulos dos pontos */}
        {points.map((s, i) => (
          <g key={s.id}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(i)}
              y2={y(i)}
              className="stroke-border"
              strokeDasharray="3 4"
            />
            <text
              x={M.left - 10}
              y={y(i) + 3.5}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {s.name}
            </text>
          </g>
        ))}

        {/* grid vertical + eixo do tempo */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              x2={x(t)}
              y1={M.top}
              y2={H - M.bottom}
              className="stroke-border"
              strokeDasharray="3 4"
            />
            <text
              x={x(t)}
              y={H - M.bottom + 16}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] tabular"
            >
              {toHHMM(t)}
            </text>
          </g>
        ))}

        {/* eixos */}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={H - M.bottom}
          y2={H - M.bottom}
          className="stroke-foreground/40"
        />
        <line x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} className="stroke-foreground/40" />
        <text
          x={(W + M.left) / 2}
          y={H - 4}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] uppercase tracking-wide"
        >
          Tempo
        </text>

        {/* trajetórias */}
        {series.map((s) =>
          s.trips.map(({ trip, coords }) => {
            const dim = activeTrip ? activeTrip.stops !== trip.stops : false;
            return (
              <g
                key={`${s.trainId}-${trip.index}`}
                onClick={() => onSelectTrip?.(trip)}
                className={cn(onSelectTrip && "cursor-pointer")}
                opacity={dim ? 0.28 : 1}
              >
                <title>{`${s.name} · Viagem ${trip.index} · ${toHHMMSS(coords[0]?.t ?? 0)}`}</title>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={dim ? 1.2 : 1.8}
                  strokeLinejoin="round"
                  points={coords.map((c) => `${x(c.t)},${y(c.p)}`).join(" ")}
                />
                {coords.map((c, i) => (
                  <circle key={i} cx={x(c.t)} cy={y(c.p)} r={1.6} fill={s.color} />
                ))}
              </g>
            );
          }),
        )}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {series.map((s) => (
          <span key={s.trainId} className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
});
