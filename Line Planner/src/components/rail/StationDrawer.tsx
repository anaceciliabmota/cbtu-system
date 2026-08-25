import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Trash2, MapPin, GitCommitVertical, Building2 } from "lucide-react";
import { toDuration } from "@/lib/rail/time";
import { cn } from "@/lib/utils";
import type { Instance, Station, StationRole } from "@/lib/rail/types";

interface Props {
  instance: Instance;
  station: Station | null;
  onClose: () => void;
  onChange: (patch: Partial<Station>) => void;
  onDelete: () => void;
}

const roles: { key: StationRole; label: string; hint: string; icon: React.ReactNode }[] = [
  { key: "station", label: "Estação", hint: "Passageiros embarcam aqui", icon: <MapPin className="size-4" /> },
  { key: "crossing", label: "Cruzamento (desvio)", hint: "Trens podem trocar de trilho / inverter", icon: <GitCommitVertical className="size-4" /> },
  { key: "depot", label: "Depósito", hint: "Pátio ou terminal — é sempre estação e cruzamento", icon: <Building2 className="size-4" /> },
];


export function StationDrawer({ instance, station, onClose, onChange, onDelete }: Props) {
  if (!station) return null;
  const neighborDistance = instance.segments
    .filter((s) => s.fromId === station.id || s.toId === station.id)
    .reduce((a, s) => a + s.distance, 0);

  return (
    <Sheet open={!!station} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[400px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>{station.name}</SheetTitle>
          <SheetDescription>
            Ponto em {instance.lineName} · {neighborDistance} unidades de distância até os vizinhos
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-7 px-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="st-name">Nome</Label>
            <Input
              id="st-name"
              value={station.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Funções</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => {
                const isDepot = station.roles.includes("depot");
                const locked = isDepot && r.key !== "depot";
                const pressed = station.roles.includes(r.key) || locked;
                return (
                  <Toggle
                    key={r.key}
                    pressed={pressed}
                    disabled={locked}
                    onPressedChange={(p) =>
                      onChange({
                        roles: p
                          ? r.key === "depot"
                            ? (["station", "crossing", "depot"] as StationRole[])
                            : [...station.roles, r.key]
                          : station.roles.filter((x) => x !== r.key),
                      })
                    }
                    variant="outline"
                    className={cn(
                      "gap-2 px-3 h-10 transition-all active:scale-[0.98]",
                      "hover:scale-[1.02] hover:bg-muted hover:text-muted-foreground",
                      "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:shadow-sm data-[state=on]:hover:bg-primary/90",
                      locked && "opacity-100 disabled:opacity-100 cursor-not-allowed",
                    )}
                    title={locked ? `Incluído automaticamente pelo depósito · ${r.hint}` : r.hint}
                  >
                    {r.icon}
                    {r.label}
                  </Toggle>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {station.roles.includes("depot")
                ? "Todo depósito é automaticamente estação e cruzamento."
                : "Somente cruzamentos permitem que uma rota troque entre as vias de ida e volta."}
            </p>
          </div>


          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <Label>Tempo de parada</Label>
              <span className="tabular text-sm font-medium">
                {toDuration(station.dwellMin)} – {toDuration(station.dwellMax)}
              </span>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Parada mínima</span>
              <Slider
                value={[station.dwellMin]}
                min={30}
                max={900}
                step={1}
                onValueChange={([v]) =>
                  onChange({ dwellMin: Math.min(v ?? 30, station.dwellMax) })
                }
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Parada máxima</span>
              <Slider
                value={[station.dwellMax]}
                min={30}
                max={900}
                step={1}
                onValueChange={([v]) =>
                  onChange({ dwellMax: Math.max(v ?? 900, station.dwellMin) })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O trem para aqui ~{toDuration(Math.round((station.dwellMin + station.dwellMax) / 2))} em
              média.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full text-destructive"
            onClick={() => {
              onDelete();
              onClose();
            }}
            disabled={instance.stations.length <= 2}
          >
            <Trash2 className="size-4" /> Remover ponto
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
