import { useState } from "react";
import { Plus, Trash2, X, TriangleAlert, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineCanvas } from "./LineCanvas";
import type { Instance, RailRoute } from "@/lib/rail/types";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/rail/store";

interface Props {
  instance: Instance;
  onChange: (routes: RailRoute[]) => void;
}

export function RouteEditor({ instance, onChange }: Props) {
  const [activeId, setActiveId] = useState(instance.routes[0]?.id ?? "");
  const routes = instance.routes;
  const active = routes.find((r) => r.id === activeId) ?? routes[0];
  const name = (id: string) => instance.stations.find((s) => s.id === id)?.name ?? "?";

  const idxOf = (id: string) => instance.stations.findIndex((s) => s.id === id);

  // O sentido inicial é derivado da sequência: se o primeiro trecho anda no
  // sentido do ponto final, é "ida"; se anda de volta ao inicial, é "volta".
  const deriveStartsInbound = (sequence: string[], fallback: boolean) => {
    if (sequence.length < 2) return fallback;
    return idxOf(sequence[1]!) < idxOf(sequence[0]!);
  };

  const update = (patch: Partial<RailRoute>) => {
    if (!active) return;
    const next = { ...active, ...patch };
    onChange(
      routes.map((r) =>
        r.id === active.id
          ? { ...next, startsInbound: deriveStartsInbound(next.sequence, active.startsInbound) }
          : r,
      ),
    );
  };


  const isDepot = (id: string) =>
    instance.stations.find((s) => s.id === id)?.roles.includes("depot") ?? false;

  const areLinked = (a: string, b: string) => {
    const ia = idxOf(a);
    const ib = idxOf(b);
    return ia >= 0 && ib >= 0 && Math.abs(ia - ib) === 1;
  };

  const sequenceLinked = (sequence: string[]) => {
    for (let i = 1; i < sequence.length; i++) {
      if (!areLinked(sequence[i - 1]!, sequence[i]!)) return false;
    }
    return true;
  };

  const canRemoveStop = (index: number) => {
    if (!active) return false;
    return sequenceLinked(active.sequence.filter((_, j) => j !== index));
  };

  const validation = (() => {
    if (!active || active.sequence.length < 2) return "Adicione ao menos dois pontos.";
    const first = active.sequence[0]!;
    const last = active.sequence[active.sequence.length - 1]!;
    if (!isDepot(first)) return `A rota deve começar em um depósito — ${name(first)} não é depósito.`;
    if (!isDepot(last)) return `A rota deve terminar em um depósito — ${name(last)} não é depósito.`;
    for (let i = 1; i < active.sequence.length; i++) {
      const prev = active.sequence[i - 1]!;
      const cur = active.sequence[i]!;
      if (!areLinked(prev, cur)) {
        return `Não há trecho entre ${name(prev)} e ${name(cur)} — a rota só pode seguir pontos vizinhos.`;
      }
    }
    for (let i = 1; i < active.sequence.length - 1; i++) {
      const prev = idxOf(active.sequence[i - 1]!);
      const cur = idxOf(active.sequence[i]!);
      const next = idxOf(active.sequence[i + 1]!);
      const reverses = (cur - prev) * (next - cur) < 0;
      const station = instance.stations[cur];
      if (reverses && !station?.roles.includes("crossing")) {
        return `Retorno somente em cruzamentos — ${station?.name} não é um cruzamento.`;
      }
    }
    return null;
  })();


  const addStation = (id: string) => {
    if (!active) return;
    const seq = active.sequence;
    const lastId = seq[seq.length - 1];
    if (lastId === id) return;
    if (!lastId) {
      update({ sequence: [id] });
      return;
    }
    // Preenche os pontos intermediários quando o ponto escolhido não é adjacente
    const from = idxOf(lastId);
    const to = idxOf(id);
    const step = to > from ? 1 : -1;
    const filled: string[] = [];
    for (let i = from + step; i !== to + step; i += step) {
      const station = instance.stations[i];
      if (station) filled.push(station.id);
    }
    update({ sequence: [...seq, ...filled] });
  };


  return (
    <div className="grid grid-cols-[280px_1fr] gap-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Rotas</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const r: RailRoute = {
                id: uid("rt"),
                name: `Rota ${routes.length + 1}`,
                sequence: instance.initialStationId ? [instance.initialStationId] : [],
                startsInbound: false,
              };
              onChange([...routes, r]);
              setActiveId(r.id);
            }}
          >
            <Plus className="size-4" /> Adicionar rota
          </Button>
        </div>
        <div className="space-y-2">
          {routes.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                r.id === active?.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:bg-accent",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{r.name}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                    deriveStartsInbound(r.sequence, r.startsInbound)
                      ? "bg-inbound-soft text-inbound"
                      : "bg-outbound-soft text-outbound",
                  )}
                >
                  {deriveStartsInbound(r.sequence, r.startsInbound) ? "volta" : "ida"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {r.sequence.map(name).join(" → ")}
              </p>
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="route-name">Nome da rota</Label>
              <Input
                id="route-name"
                className="w-64"
                value={active.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 pb-1">
              <Label>Sentido inicial</Label>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-2 py-1 text-xs font-semibold uppercase",
                    deriveStartsInbound(active.sequence, active.startsInbound)
                      ? "bg-inbound-soft text-inbound"
                      : "bg-outbound-soft text-outbound",
                  )}
                >
                  {active.sequence.length < 2
                    ? "—"
                    : deriveStartsInbound(active.sequence, active.startsInbound)
                      ? "volta"
                      : "ida"}
                </span>
                <span className="text-xs text-muted-foreground">
                  definido pela sequência de pontos
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="ml-auto text-destructive"
              onClick={() => {
                onChange(routes.filter((r) => r.id !== active.id));
                setActiveId(routes.find((r) => r.id !== active.id)?.id ?? "");
              }}
            >
              <Trash2 className="size-4" /> Remover rota
            </Button>
          </div>

          <div>
            <Label className="mb-2 block">
              Clique nos pontos para montar a sequência — comece e termine em um depósito
            </Label>
            <div className="flex flex-wrap gap-2">
              {instance.stations.map((s) => (
                <Button key={s.id} size="sm" variant="secondary" onClick={() => addStation(s.id)}>
                  <Plus className="size-3.5" /> {s.name}
                  {s.roles.includes("depot") && (
                    <Building2 className="size-3.5 text-depot" />
                  )}
                </Button>
              ))}
            </div>
          </div>


          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {active.sequence.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhuma parada ainda.</span>
              )}
              {active.sequence.map((id, i) => {
                const removable = canRemoveStop(i);
                return (
                  <span key={`${id}-${i}`} className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1.5 text-sm font-medium">
                      {name(id)}
                      <button
                        className={cn(
                          "rounded-full p-0.5 text-muted-foreground",
                          removable ? "hover:bg-accent" : "cursor-not-allowed opacity-30",
                        )}
                        disabled={!removable}
                        title={
                          removable
                            ? `Remover ${name(id)}`
                            : "Não dá para remover: os pontos vizinhos não se ligam"
                        }
                        onClick={() =>
                          update({ sequence: active.sequence.filter((_, j) => j !== i) })
                        }
                        aria-label={`Remover ${name(id)}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                    {i < active.sequence.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {validation ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <TriangleAlert className="size-4" /> {validation}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-crossing">
              <Check className="size-4" /> Rota válida · {active.sequence.map(name).join(" → ")}
            </p>
          )}

          <div className="panel p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prévia do percurso
            </p>
            <LineCanvas instance={instance} highlight={active.sequence} />
          </div>
        </div>
      )}
    </div>
  );
}
