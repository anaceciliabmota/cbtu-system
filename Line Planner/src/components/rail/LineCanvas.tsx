import { Building2, User } from "lucide-react";
import type { Instance } from "@/lib/rail/types";
import { cn } from "@/lib/utils";

interface Props {
  instance: Instance;
  selectedStationId?: string | null;
  onSelectStation?: (id: string) => void;
  /** station id sequence to highlight as a route path */
  highlight?: string[];
  /** when true, the single track is drawn twice (ida / volta) to show route paths */
  showDirection?: boolean;
}


const PAD = 90;
const GAP = 196;
const UPPER = 62;
const LOWER = 168;
const MID = (UPPER + LOWER) / 2;

export function LineCanvas({
  instance,
  selectedStationId,
  onSelectStation,
  highlight,
  showDirection = true,
}: Props) {

  const stations = instance.stations;
  const width = PAD * 2 + Math.max(1, stations.length - 1) * GAP;
  const height = 268;

  // single physical track: one rail unless directions must be shown
  const rails = showDirection ? [UPPER, LOWER] : [MID];

  const x = (i: number) => PAD + i * GAP;
  const idx = (id: string) => stations.findIndex((s) => s.id === id);

  const legs: { from: number; to: number; upper: boolean }[] = [];
  const turns: number[] = [];
  if (highlight && highlight.length > 1) {
    for (let i = 1; i < highlight.length; i++) {
      const a = idx(highlight[i - 1]!);
      const b = idx(highlight[i]!);
      if (a < 0 || b < 0 || a === b) continue;
      legs.push({ from: a, to: b, upper: b > a });
    }
    for (let i = 1; i < legs.length; i++) {
      if (legs[i]!.upper !== legs[i - 1]!.upper) turns.push(legs[i]!.from);
    }
  }

  const segDistance = (a: string, b: string) =>
    instance.segments.find(
      (s) => (s.fromId === a && s.toId === b) || (s.fromId === b && s.toId === a),
    )?.distance ?? "—";

  const distanceY = showDirection ? MID : MID - 38;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full select-none"
        role="img"
        aria-label={`${instance.lineName} schematic`}
      >
        {/* selection band — sits behind rails so the line appears to cross it */}
        {stations.map((s, i) =>
          selectedStationId === s.id ? (
            <rect
              key={`sel-${s.id}`}
              x={x(i) - 78}
              y={20}
              width={156}
              height={LOWER + 12}
              rx={12}
              className="fill-selection"
            />
          ) : null,
        )}

        {/* base rail */}
        {rails.map((y) => (
          <line
            key={`rail-${y}`}
            x1={PAD - 46}
            x2={width - PAD + 46}
            y1={y}
            y2={y}
            className="stroke-rail"
            strokeWidth={7}
            strokeLinecap="round"
          />
        ))}

        {showDirection ? (
          <>
            <text x={8} y={UPPER - 16} className="fill-outbound text-[11px] font-medium">
              Ida →
            </text>
            <text x={8} y={LOWER + 26} className="fill-inbound text-[11px] font-medium">
              ← Volta
            </text>
            {/* bracket making it explicit that both paths share one physical rail */}
            <path
              d={`M ${width - 26} ${UPPER} h 10 V ${LOWER} h -10`}
              className="stroke-muted-foreground"
              strokeWidth={1.5}
              fill="none"
              opacity={0.7}
            />
            <text
              x={width - 6}
              y={MID}
              textAnchor="middle"
              transform={`rotate(-90 ${width - 6} ${MID})`}
              className="fill-muted-foreground text-[10px] uppercase tracking-wide"
            >
              Trilho único
            </text>
          </>
        ) : (
          <text x={8} y={MID - 18} className="fill-muted-foreground text-[11px] font-medium">
            Trilho único
          </text>
        )}

        {/* crossings */}
        {stations.map((s, i) =>
          s.roles.includes("crossing") ? (
            showDirection ? (
              <line
                key={`x-${s.id}`}
                x1={x(i)}
                x2={x(i)}
                y1={UPPER}
                y2={LOWER}
                className="stroke-crossing"
                strokeWidth={2}
                strokeDasharray="5 5"
                opacity={0.75}
              />
            ) : (
              // desvio: short siding alongside the single track
              <path
                key={`x-${s.id}`}
                d={`M ${x(i) - 56} ${MID} C ${x(i) - 34} ${MID}, ${x(i) - 30} ${MID + 26}, ${x(i)} ${MID + 26} C ${x(i) + 30} ${MID + 26}, ${x(i) + 34} ${MID}, ${x(i) + 56} ${MID}`}
                className="stroke-crossing"
                strokeWidth={3}
                fill="none"
                opacity={0.8}
              />
            )
          ) : null,
        )}

        {/* segment distances */}
        {stations.slice(0, -1).map((s, i) => {
          const next = stations[i + 1]!;
          const mid = (x(i) + x(i + 1)) / 2;
          return (
            <g key={`d-${s.id}`}>
              <rect
                x={mid - 26}
                y={distanceY - 12}
                width={52}
                height={22}
                rx={11}
                className="fill-surface stroke-border"
                strokeWidth={1}
              />
              <text
                x={mid}
                y={distanceY + 3}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px] tabular"
              >
                {segDistance(s.id, next.id)}
              </text>
            </g>
          );
        })}

        {/* highlighted legs */}
        {legs.map((leg, i) => {
          const y = showDirection ? (leg.upper ? UPPER : LOWER) : MID;
          const from = x(Math.min(leg.from, leg.to));
          const to = x(Math.max(leg.from, leg.to));
          return (
            <line
              key={`leg-${i}`}
              x1={from}
              x2={to}
              y1={y}
              y2={y}
              className={cn(leg.upper ? "stroke-outbound" : "stroke-inbound", "animate-in fade-in")}
              strokeWidth={7}
              strokeLinecap="round"
              opacity={0.95}
            />
          );
        })}
        {showDirection &&
          turns.map((t, i) => (
            <line
              key={`turn-${i}`}
              x1={x(t)}
              x2={x(t)}
              y1={UPPER}
              y2={LOWER}
              className="stroke-crossing"
              strokeWidth={5}
              strokeLinecap="round"
            />
          ))}

        {/* station nodes */}
        {stations.map((s, i) => {
          const selected = selectedStationId === s.id;
          const isInitial = instance.initialStationId === s.id;
          return (
            <g
              key={s.id}
              className="cursor-pointer outline-none [&:focus-visible_.node]:stroke-primary"
              onClick={() => onSelectStation?.(s.id)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelectStation?.(s.id);
              }}
            >
              {rails.map((y) => (
                <circle
                  key={`node-${s.id}-${y}`}
                  cx={x(i)}
                  cy={y}
                  r={selected ? 10 : 8}
                  className={cn(
                    "node fill-surface transition-all",
                    selected ? "stroke-primary" : "stroke-foreground/70",
                  )}
                  strokeWidth={selected ? 4 : 3}
                />
              ))}
              <rect
                x={x(i) - 74}
                y={LOWER + 40}
                width={148}
                height={44}
                rx={10}
                className={cn(
                  "transition-colors",
                  selected ? "fill-selection stroke-primary/40" : "fill-surface stroke-border",
                )}
                strokeWidth={1}
              />

              <text
                x={x(i)}
                y={LOWER + 60}
                textAnchor="middle"
                className="fill-foreground text-[13px] font-semibold"
              >
                {s.name}
              </text>
              <text
                x={x(i)}
                y={LOWER + 76}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] uppercase tracking-wide"
              >
                {isInitial ? "Início" : ""}
              </text>
              {s.roles.includes("station") && (
                <g
                  transform={`translate(${
                    s.roles.includes("depot") ? x(i) - 20 : x(i) - 9
                  }, ${LOWER + 18})`}
                >
                  <title>Estação</title>
                  <User className="text-foreground" size={18} strokeWidth={1.5} />
                </g>
              )}
              {s.roles.includes("depot") && (
                <g
                  transform={`translate(${
                    s.roles.includes("station") ? x(i) + 2 : x(i) - 9
                  }, ${LOWER + 18})`}
                >
                  <title>Depósito</title>
                  <Building2 className="text-depot" size={18} strokeWidth={1.5} />
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
