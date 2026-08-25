import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  TrainFront,
  ChevronRight,
  Loader2,
  Moon,
  Play,
  Plus,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineCanvas } from "@/components/rail/LineCanvas";
import { StationDrawer } from "@/components/rail/StationDrawer";
import { RouteEditor } from "@/components/rail/RouteEditor";
import { IntervalTimeline } from "@/components/rail/IntervalTimeline";
import { FleetDemand } from "@/components/rail/FleetDemand";
import { ResultsView } from "@/components/rail/ResultsView";
import { DayTimeline } from "@/components/rail/DayTimeline";
import { Legend } from "@/components/rail/Legend";
import { toast } from "sonner";
import {
  ensureInstance,
  flushPersist,
  loadFromApi,
  runSolver as executeSolver,
  setInstance,
  toggleTheme,
  uid,
  useRailStore,
} from "@/lib/rail/store";
import { fromHHMM, toDuration, toHHMM } from "@/lib/rail/time";
import type { Station } from "@/lib/rail/types";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/editor/$instanceId")({
  head: () => ({
    meta: [
      { title: "Editor de cenário — Railplan" },
      {
        name: "description",
        content:
          "Edite o linha ferroviária, cruzamentos, rotas de serviço, frota e períodos de demanda e execute o solver de horários.",
      },
      { property: "og:title", content: "Editor de cenário — Railplan" },
      {
        property: "og:description",
        content: "Editor visual de linhas ferroviárias, padrões de serviço, períodos de demanda e horários.",
      },
    ],
  }),
  component: Editor,
});

const steps = [
  { key: "line", label: "1 · Linha" },
  { key: "routes", label: "2 · Rotas" },
  { key: "ops", label: "3 · Frota e demanda" },
  { key: "run", label: "4 · Executar" },
] as const;

function Editor() {
  const { instanceId } = Route.useParams();
  const navigate = useNavigate();
  const instances = useRailStore((s) => s.instances);
  const theme = useRailStore((s) => s.theme);
  const saving = useRailStore((s) => s.saving);
  const result = useRailStore((s) => s.results[instanceId]);
  const instance = instances.find((i) => i.id === instanceId);

  const [step, setStep] = useState<(typeof steps)[number]["key"]>("line");
  const [tab, setTab] = useState("config");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    void (async () => {
      await loadFromApi();
      const found = await ensureInstance(instanceId);
      if (!cancelled && !found) setMissing(true);
    })();
    return () => {
      cancelled = true;
      void flushPersist(instanceId);
    };
  }, [instanceId]);

  const station = useMemo(
    () => instance?.stations.find((s) => s.id === selectedStation) ?? null,
    [instance, selectedStation],
  );

  if (!instance) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        {missing ? (
          <>
            <p className="text-sm text-muted-foreground">Cenário não encontrado.</p>
            <Button asChild variant="outline">
              <Link to="/">Voltar</Link>
            </Button>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando cenário…
          </p>
        )}
      </div>
    );
  }

  const patch = (fn: Parameters<typeof setInstance>[1]) => setInstance(instanceId, fn);

  const addStation = () => {
    const newStation: Station = {
      id: uid("st"),
      name: `Ponto ${instance.stations.length + 1}`,
      roles: ["station"],
      dwellMin: 120,
      dwellMax: 180,
    };
    patch((i) => {
      const last = i.stations[i.stations.length - 1];
      return {
        ...i,
        stations: [...i.stations, newStation],
        segments: last
          ? [...i.segments, { fromId: last.id, toId: newStation.id, distance: 650 }]
          : i.segments,
        initialStationId: i.initialStationId,
      };
    });
    setSelectedStation(newStation.id);
  };

  const moveStation = (id: string, dir: -1 | 1) =>
    patch((i) => {
      const idx = i.stations.findIndex((s) => s.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= i.stations.length) return i;
      const stations = [...i.stations];
      const [moved] = stations.splice(idx, 1);
      stations.splice(to, 0, moved!);
      const segments = stations.slice(0, -1).map((s, k) => ({
        fromId: s.id,
        toId: stations[k + 1]!.id,
        distance:
          i.segments.find(
            (sg) =>
              (sg.fromId === s.id && sg.toId === stations[k + 1]!.id) ||
              (sg.toId === s.id && sg.fromId === stations[k + 1]!.id),
          )?.distance ?? 650,
      }));
      return { ...i, stations, segments };
    });

  const runSolver = async () => {
    setRunning(true);
    setTab("results");
    try {
      const next = await executeSolver(instanceId);
      if (next.tripsScheduled === 0) {
        toast.error("O solver não encontrou uma solução viável para esta configuração.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao executar o solver.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-8 py-3">
          <Button asChild size="icon" variant="ghost">
            <Link to="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <TrainFront className="size-5 text-primary" />
          <Select
            value={instance.id}
            onValueChange={(v) => navigate({ to: "/editor/$instanceId", params: { instanceId: v } })}
          >
            <SelectTrigger className="h-9 w-72 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {instances.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={instance.name}
            className="h-9 w-56"
            onChange={(e) => patch((i) => ({ ...i, name: e.target.value }))}
          />
          <Input
            value={instance.lineName}
            placeholder="Nome da linha"
            className="h-9 w-44"
            onChange={(e) => patch((i) => ({ ...i, lineName: e.target.value }))}
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {saving ? "Salvando…" : "Salvo no backend"}
            </span>
            <Button size="icon" variant="ghost" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>
            <Button onClick={() => void runSolver()} disabled={running}>
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Executar solver
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-[1440px] px-8 pb-3">
          <DayTimeline dayStart={instance.dayStart} horizon={instance.horizon} intervals={instance.intervals} />
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-8 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-6 space-y-6">
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <span key={s.key} className="flex items-center gap-1">
                  <button
                    onClick={() => setStep(s.key)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      step === s.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {s.label}
                  </button>
                  {i < steps.length - 1 && <ChevronRight className="size-4 text-muted-foreground" />}
                </span>
              ))}
            </div>

            {step === "line" && (
              <div className="space-y-5">
                <div className="panel p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold">Linha ferroviária</h2>
                      <p className="text-xs text-muted-foreground">
                        Clique em um ponto para editar nome, funções e tempo de parada.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addStation}>
                      <Plus className="size-4" /> Adicionar ponto
                    </Button>
                  </div>
                  <LineCanvas
                    instance={instance}
                    selectedStationId={selectedStation}
                    onSelectStation={setSelectedStation}
                    showDirection={false}
                  />
                  <div className="mt-4">
                    <Legend showDirection={false} />
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_360px] gap-5">
                  <div className="panel p-5">
                    <h3 className="mb-3 text-sm font-semibold">Ordem e distâncias dos trechos</h3>
                    <div className="space-y-2">
                      {instance.stations.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <span className="w-36 truncate text-sm font-medium">{s.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Parada {toDuration(s.dwellMin)} – {toDuration(s.dwellMax)}
                          </span>
                          {i < instance.stations.length - 1 && (
                            <div className="ml-auto flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                → {instance.stations[i + 1]!.name}
                              </span>
                              <Input
                                type="number"
                                className="h-8 w-24 tabular"
                                value={
                                  instance.segments.find(
                                    (sg) =>
                                      sg.fromId === s.id && sg.toId === instance.stations[i + 1]!.id,
                                  )?.distance ?? 0
                                }
                                onChange={(e) =>
                                  patch((inst) => ({
                                    ...inst,
                                    segments: inst.segments.map((sg) =>
                                      sg.fromId === s.id && sg.toId === inst.stations[i + 1]!.id
                                        ? { ...sg, distance: Number(e.target.value) || 0 }
                                        : sg,
                                    ),
                                  }))
                                }
                              />
                            </div>
                          )}
                          <div className={cn("flex gap-1", i < instance.stations.length - 1 ? "" : "ml-auto")}>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => moveStation(s.id, -1)}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => moveStation(s.id, 1)}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel space-y-5 p-5">
                    <div className="space-y-2">
                      <Label>Depósito inicial</Label>
                      {(() => {
                        const depots = instance.stations.filter((s) => s.roles.includes("depot"));
                        const value = depots.some((d) => d.id === instance.initialStationId)
                          ? instance.initialStationId
                          : "";
                        return (
                          <>
                            <Select
                              value={value}
                              disabled={depots.length === 0}
                              onValueChange={(v) =>
                                patch((i) => ({ ...i, initialStationId: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    depots.length === 0
                                      ? "Nenhum depósito definido"
                                      : "Selecione um depósito"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {depots.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Apenas depósitos podem ser o ponto de partida — todos os trens
                              iniciam e encerram as viagens em depósitos.
                            </p>
                          </>
                        );
                      })()}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <Label>Início do dia</Label>
                        <Input
                          type="time"
                          value={toHHMM(instance.dayStart)}
                          className="h-8 w-28 tabular"
                          onChange={(e) =>
                            patch((i) => {
                              const v = fromHHMM(e.target.value);
                              return { ...i, dayStart: Math.min(v, i.horizon - 1800) };
                            })
                          }
                        />
                      </div>
                      <Slider
                        value={[instance.dayStart]}
                        min={0}
                        max={22 * 3600}
                        step={300}
                        onValueChange={([v]) =>
                          patch((i) => ({
                            ...i,
                            dayStart: Math.min(v ?? i.dayStart, i.horizon - 1800),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Operação começa às {toHHMM(instance.dayStart)}.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <Label>Fim do dia</Label>
                        <Input
                          type="time"
                          value={toHHMM(instance.horizon)}
                          className="h-8 w-28 tabular"
                          onChange={(e) =>
                            patch((i) => ({
                              ...i,
                              horizon: Math.max(fromHHMM(e.target.value), i.dayStart + 1800),
                            }))
                          }
                        />
                      </div>
                      <Slider
                        value={[instance.horizon]}
                        min={6 * 3600}
                        max={24 * 3600}
                        step={300}
                        onValueChange={([v]) =>
                          patch((i) => ({
                            ...i,
                            horizon: Math.max(v ?? i.horizon, i.dayStart + 1800),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Operação até {toHHMM(instance.horizon)}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "routes" && (
              <div className="panel p-5">
                <RouteEditor
                  instance={instance}
                  onChange={(routes) => patch((i) => ({ ...i, routes }))}
                />
              </div>
            )}

            {step === "ops" && (
              <div className="space-y-5">
                <div className="panel p-5">
                  <IntervalTimeline
                    intervals={instance.intervals}
                    dayStart={instance.dayStart}
                    horizon={instance.horizon}
                    onChange={(intervals) => patch((i) => ({ ...i, intervals }))}
                  />

                </div>
                <div className="panel p-5">
                  <FleetDemand
                    instance={instance}
                    onTrains={(trains) => patch((i) => ({ ...i, trains }))}
                    onDemand={(demand) => patch((i) => ({ ...i, demand }))}
                  />
                </div>
                <div className="panel p-5">
                  <h3 className="mb-4 text-sm font-semibold">Espaçamento mínimo entre trens</h3>
                  <div className="max-w-md space-y-3">
                    <div className="flex items-baseline justify-between">
                      <Label>Intervalo mínimo</Label>
                      <span className="tabular text-sm font-medium">
                        {toDuration(instance.alpha)}
                      </span>
                    </div>
                    <Slider
                      value={[instance.alpha]}
                      min={10}
                      max={600}
                      step={1}
                      onValueChange={([v]) => patch((i) => ({ ...i, alpha: v ?? i.alpha }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Intervalo mínimo entre partidas consecutivas · {instance.alpha}s.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {step === "run" && (
              <div className="panel space-y-4 p-8 text-center">
                <h2 className="text-lg font-semibold">Pronto para programar</h2>
                <p className="mx-auto max-w-lg text-sm text-muted-foreground">
                  {instance.stations.length} pontos · {instance.routes.length} rotas ·{" "}
                  {instance.trains.length} trens · {instance.intervals.length} períodos de demanda ·
                  operação {toHHMM(instance.dayStart)}–{toHHMM(instance.horizon)} · espaçamento{" "}
                  {toDuration(instance.alpha)}.
                </p>
                <Button size="lg" onClick={() => void runSolver()} disabled={running}>
                  {running ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Executar solver
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            {running ? (
              <div className="panel flex flex-col items-center gap-3 p-16">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm font-medium">Calculando a grade de horários…</p>
                <p className="text-xs text-muted-foreground">
                  Montando viagens para {instance.trains.length} trens dentro do horizonte do dia.
                </p>
              </div>
            ) : result ? (
              <ResultsView instance={instance} result={result} />
            ) : (
              <div className="panel flex flex-col items-center gap-3 p-16">
                <p className="text-sm font-medium">Nenhum resultado ainda</p>
                <Button onClick={() => void runSolver()}>
                  <Play className="size-4" /> Executar solver
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <StationDrawer
        instance={instance}
        station={station}
        onClose={() => setSelectedStation(null)}
        onChange={(p) =>
          patch((i) => ({
            ...i,
            stations: i.stations.map((s) => (s.id === station?.id ? { ...s, ...p } : s)),
          }))
        }
        onDelete={() =>
          patch((i) => ({
            ...i,
            stations: i.stations.filter((s) => s.id !== station?.id),
            segments: i.segments.filter(
              (sg) => sg.fromId !== station?.id && sg.toId !== station?.id,
            ),
            routes: i.routes.map((r) => ({
              ...r,
              sequence: r.sequence.filter((x) => x !== station?.id),
            })),
          }))
        }
      />
    </main>
  );
}
