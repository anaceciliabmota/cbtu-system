import { useRef, useState } from "react";
import {
  ChevronDown,
  Clock,
  Gauge,
  TrainFront,
  Route as RouteIcon,
  FileSpreadsheet,
  Image,
} from "lucide-react";
import { toDuration, toHHMM, toHHMMSS } from "@/lib/rail/time";
import { exportSolutionXlsx, exportSpaceTimePng } from "@/lib/rail/export";
import type { Instance, SolverResult, Trip } from "@/lib/rail/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SpaceTimeChart } from "@/components/rail/SpaceTimeChart";

interface Props {
  instance: Instance;
  result: SolverResult;
}



export function ResultsView({ instance, result }: Props) {
  const [open, setOpen] = useState<string | null>(result.schedules[0]?.trainId ?? null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(result.schedules[0]?.trips[0] ?? null);
  const spaceTimeRef = useRef<HTMLDivElement>(null);
  const START = instance.dayStart - 3600;
  const span = Math.max(instance.horizon - START, 3600);
  const stationName = (id: string) => instance.stations.find((s) => s.id === id)?.name ?? id;

  // --- escala em pixels para a timeline dos trens (evita sobreposição dos cartões)
  const CARD_W = 131;
  const CARD_GAP = 6;
  let minGap = Infinity;
  for (const sch of result.schedules) {
    for (let i = 1; i < sch.trips.length; i++) {
      const gap = sch.trips[i]!.stops[0]!.arrival - sch.trips[i - 1]!.stops[0]!.arrival;
      if (gap > 0) minGap = Math.min(minGap, gap);
    }
  }
  const pxPerSec = Number.isFinite(minGap)
    ? Math.max((CARD_W + CARD_GAP) / minGap, 900 / span)
    : 900 / span;
  const trackWidth = span * pxPerSec + CARD_W;
  const px = (s: number) => (s - START) * pxPerSec;

  const axisTick = pxPerSec * 3600 * 2 < 46 ? 3600 * 4 : 3600 * 2;
  const axisPx = [];
  for (let t = instance.dayStart; t <= instance.horizon; t += axisTick) axisPx.push(t);


  const BandsPx = () => (
    <>
      {instance.intervals.map((iv) => (
        <div
          key={iv.id}
          className={cn(
            "absolute inset-y-0",
            iv.color === "peak" ? "bg-peak/12" : "bg-offpeak/12",
          )}
          style={{ left: `${px(iv.start)}px`, width: `${px(iv.end) - px(iv.start)}px` }}
        />
      ))}
    </>
  );


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" onClick={() => exportSolutionXlsx(instance, result)}>
          <FileSpreadsheet className="size-4" /> Exportar planilha
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Gauge, label: "Valor objetivo", value: `${result.objective}` },
          { icon: Clock, label: "Tempo do solver", value: `${(result.runtimeMs / 1000).toFixed(2)}s` },
          { icon: TrainFront, label: "Trens usados", value: `${result.trainsUsed}` },
          { icon: RouteIcon, label: "Viagens programadas", value: `${result.tripsScheduled}` },
        ].map((m) => (
          <div key={m.label} className="panel p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <m.icon className="size-3.5" /> {m.label}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="panel p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Linhas de tempo dos trens</h3>
          <span className="text-xs text-muted-foreground">
            Faixas sombreadas = períodos de demanda · o dia vai de {toHHMM(instance.dayStart)} até {toHHMM(instance.horizon)}
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div style={{ width: `${trackWidth}px`, minWidth: "100%" }}>
            <div className="relative mb-2 h-4 border-b border-border">
              <BandsPx />
              {axisPx.map((t) => (
                <span
                  key={t}
                  className="absolute -translate-x-1/2 text-[10px] tabular text-muted-foreground"
                  style={{ left: `${px(t)}px` }}
                >
                  {toHHMM(t)}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              {result.schedules.map((sch) => {
                const train = instance.trains.find((t) => t.id === sch.trainId);
                return (
                  <div key={sch.trainId}>
                    <button
                      className="sticky left-0 flex items-center gap-2 py-1 text-left text-sm font-medium"
                      onClick={() => setOpen(open === sch.trainId ? null : sch.trainId)}
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform",
                          open === sch.trainId ? "" : "-rotate-90",
                        )}
                      />
                      {train?.name} · {sch.trips.length} viagens ·{" "}
                      <span className="text-muted-foreground">
                        {instance.routes.find((r) => r.id === train?.routeId)?.name}
                      </span>
                    </button>

                    <div className="relative h-10 overflow-hidden rounded-md border border-border bg-muted/40">
                      <BandsPx />
                      {sch.trips.map((trip) => {
                        const a = trip.stops[0]!.arrival;
                        const b = trip.stops[trip.stops.length - 1]!.departure;
                        const inbound = trip.stops[1] ? trip.stops[1].direction === "inbound" : true;
                        return (
                          <button
                            key={trip.index}
                            onClick={() => setActiveTrip(trip)}
                            className={cn(
                              "absolute inset-y-1.5 box-border flex items-center justify-center whitespace-nowrap rounded px-2 text-[11px] font-medium text-background transition-transform hover:scale-[1.02] w-[131px]",
                              inbound ? "bg-inbound" : "bg-outbound",
                              activeTrip?.stops === trip.stops ? "ring-2 ring-foreground" : "",
                            )}
                            style={{ left: `${px(a)}px` }}
                            title={`Viagem ${trip.index}: ${toHHMMSS(a)} → ${toHHMMSS(b)}`}
                          >
                            Viagem {trip.index}
                          </button>
                        );
                      })}
                    </div>

                    {open === sch.trainId && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {sch.trips.map((trip) => (
                          <Button
                            key={trip.index}
                            size="sm"
                            variant={activeTrip?.stops === trip.stops ? "default" : "outline"}
                            onClick={() => setActiveTrip(trip)}
                          >
                            Viagem {trip.index} · {toHHMM(trip.stops[0]!.arrival)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      <div className="panel p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Diagrama espaço-tempo</h3>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportSpaceTimePng(instance, spaceTimeRef.current)}
            >
              <Image className="size-4" /> Exportar imagem
            </Button>
            <span className="text-xs text-muted-foreground">
              Uma linha por trem · eixo Y = pontos de parada · clique numa trajetória para ver as paradas
            </span>
          </div>
        </div>
        <SpaceTimeChart
          ref={spaceTimeRef}
          instance={instance}
          result={result}
          activeTrip={activeTrip}
          onSelectTrip={setActiveTrip}
        />
      </div>

      {activeTrip && (
        <div className="grid grid-cols-1 gap-6">


          <div className="panel overflow-hidden">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">
              Paradas da viagem {activeTrip.index}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Ponto</th>
                  <th className="px-3 py-2 text-left">Chegada</th>
                  <th className="px-3 py-2 text-left">Partida</th>
                  <th className="px-3 py-2 text-left">Parada</th>
                </tr>
              </thead>
              <tbody>
                {activeTrip.stops.map((st, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            st.direction === "inbound" ? "bg-inbound" : "bg-outbound",
                          )}
                        />
                        {stationName(st.stationId)}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular" title={toHHMMSS(st.arrival)}>
                      {toHHMM(st.arrival)}
                    </td>
                    <td className="px-3 py-2 tabular" title={toHHMMSS(st.departure)}>
                      {toHHMM(st.departure)}
                    </td>
                    <td className="px-3 py-2 tabular text-muted-foreground">
                      {toDuration(st.departure - st.arrival)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
