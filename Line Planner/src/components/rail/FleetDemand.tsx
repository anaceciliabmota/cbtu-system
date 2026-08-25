import { Plus, Trash2, TrainFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toHHMM } from "@/lib/rail/time";
import type { DemandMap, Instance, Train } from "@/lib/rail/types";
import { uid } from "@/lib/rail/store";
import { cn } from "@/lib/utils";

interface Props {
  instance: Instance;
  onTrains: (trains: Train[]) => void;
  onDemand: (demand: DemandMap) => void;
}

export function FleetDemand({ instance, onTrains, onDemand }: Props) {
  const max = Math.max(1, ...Object.values(instance.demand));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Frota</h3>
            <p className="text-xs text-muted-foreground">
              Os trens partem de {instance.stations.find((s) => s.id === instance.initialStationId)?.name}.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onTrains([
                ...instance.trains,
                {
                  id: uid("tr"),
                  name: `Trem ${instance.trains.length + 1}`,
                  maxTrips: 6,
                  routeId: instance.routes[0]?.id ?? "",
                },
              ])
            }
          >
            <Plus className="size-4" /> Adicionar trem
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {instance.trains.map((t) => (
            <div key={t.id} className="panel space-y-3 p-4">
              <div className="flex items-center gap-2">
                <TrainFront className="size-4 text-primary" />
                <Input
                  value={t.name}
                  className="h-8 border-0 px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                  onChange={(e) =>
                    onTrains(
                      instance.trains.map((x) =>
                        x.id === t.id ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="ml-auto size-7 text-muted-foreground"
                  onClick={() => onTrains(instance.trains.filter((x) => x.id !== t.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Máx. de viagens por dia</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={t.maxTrips}
                  className="h-9 tabular"
                  onChange={(e) =>
                    onTrains(
                      instance.trains.map((x) =>
                        x.id === t.id ? { ...x, maxTrips: Number(e.target.value) || 1 } : x,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Demanda de trens</h3>
          <p className="text-xs text-muted-foreground">
            Número de trens que devem partir de cada ponto, por sentido, dentro de cada período.
            Pontos extremos possuem apenas um sentido possível.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Ponto</th>
                <th className="px-3 py-2 text-left font-medium">Sentido</th>
                {instance.intervals.map((iv) => (
                  <th key={iv.id} className="px-3 py-2 text-left font-medium">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 rounded-full",
                          iv.color === "peak" ? "bg-peak" : "bg-offpeak",
                        )}
                      />
                      {iv.name} {toHHMM(iv.start)}–{toHHMM(iv.end)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instance.stations.flatMap((s, si) => {
                const next = instance.stations[si + 1];
                const prev = instance.stations[si - 1];
                const dirs: { dir: "ida" | "volta"; label: string }[] = [];
                if (next) dirs.push({ dir: "ida", label: `→ ${next.name}` });
                if (prev) dirs.push({ dir: "volta", label: `← ${prev.name}` });

                return dirs.map((d, di) => (
                  <tr key={`${s.id}:${d.dir}`} className="border-t border-border">
                    {di === 0 ? (
                      <td
                        className="px-3 py-1.5 align-middle font-medium"
                        rowSpan={dirs.length}
                      >
                        {s.name}
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {d.dir === "ida" ? "Ida" : "Volta"}
                      </span>{" "}
                      {d.label}
                    </td>
                    {instance.intervals.map((iv) => {
                      const key = `${s.id}:${d.dir}:${iv.id}`;
                      const value = instance.demand[key] ?? 0;
                      return (
                        <td key={iv.id} className="px-3 py-1.5">
                          <div className="relative w-24">
                            <div
                              className="absolute inset-y-1 left-0 rounded bg-primary/20"
                              style={{ width: `${(value / max) * 100}%` }}
                            />
                            <Input
                              type="number"
                              min={0}
                              value={value}
                              className="relative h-8 w-24 border-transparent bg-transparent tabular shadow-none focus-visible:border-input"
                              onChange={(e) =>
                                onDemand({
                                  ...instance.demand,
                                  [key]: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
