import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Copy,
  Plus,
  TrainFront,
  Moon,
  Sun,
  CircleCheck,
  CircleDashed,
  CircleAlert,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useRailStore,
  duplicateInstance,
  createInstance,
  createSampleInstance,
  deleteInstance,
  loadFromApi,
  toggleTheme,
} from "@/lib/rail/store";
import { toHHMM } from "@/lib/rail/time";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Railplan — Sistema de Planejamento Ferroviário" },
      {
        name: "description",
        content:
          "Modele linhas ferroviárias, rotas de serviço, frota e períodos de demanda, e gere a grade de horários de cada trem.",
      },
      { property: "og:title", content: "Railplan — Sistema de Planejamento Ferroviário" },
      {
        property: "og:description",
        content:
          "Estúdio visual de programação ferroviária: linhas, cruzamentos, padrões de serviço, períodos de demanda e horários gerados.",
      },
    ],
  }),
  component: Dashboard,
});

const statusMeta = {
  success: { icon: CircleCheck, label: "Última execução concluída", cls: "text-crossing" },
  never: { icon: CircleDashed, label: "Nunca executado", cls: "text-muted-foreground" },
  stale: { icon: CircleAlert, label: "Configuração alterada desde a última execução", cls: "text-outbound" },
} as const;

function Dashboard() {
  const instances = useRailStore((s) => s.instances);
  const theme = useRailStore((s) => s.theme);
  const loading = useRailStore((s) => s.loading);
  const loaded = useRailStore((s) => s.loaded);
  const error = useRailStore((s) => s.error);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadFromApi();
  }, []);

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-8 py-4">
          <TrainFront className="size-5 text-primary" />
          <span className="font-display text-lg font-semibold">Railplan</span>
          <span className="text-sm text-muted-foreground">Estúdio de planejamento ferroviário</span>
          <Button size="icon" variant="ghost" className="ml-auto" onClick={toggleTheme}>
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-8 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Cenários</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cada cenário contém uma linha, suas rotas de serviço, frota e períodos de demanda.
            </p>
          </div>
          <div className="flex gap-2">
            {instances.length === 0 && loaded && !error ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  withBusy(async () => {
                    const id = await createSampleInstance();
                    navigate({ to: "/editor/$instanceId", params: { instanceId: id } });
                  })
                }
              >
                Carregar exemplo
              </Button>
            ) : null}
            <Button
              disabled={busy}
              onClick={() =>
                withBusy(async () => {
                  const id = await createInstance();
                  navigate({ to: "/editor/$instanceId", params: { instanceId: id } });
                })
              }
            >
              <Plus className="size-4" /> Novo cenário
            </Button>
          </div>
        </div>

        {error ? (
          <div className="panel mt-8 space-y-3 p-6">
            <p className="text-sm font-medium">Não foi possível falar com o backend.</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void loadFromApi(true)}>
              Tentar de novo
            </Button>
          </div>
        ) : null}

        {loading && !instances.length ? (
          <div className="mt-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando cenários…
          </div>
        ) : null}

        {!loading && loaded && !error && instances.length === 0 ? (
          <p className="mt-16 text-center text-sm text-muted-foreground">
            Nenhum cenário ainda. Crie um novo ou carregue o exemplo do Metrô Recife.
          </p>
        ) : null}

        <div className="mt-8 grid grid-cols-3 gap-5">
          {instances.map((inst) => {
            const meta = statusMeta[inst.lastRun];
            return (
              <div key={inst.id} className="panel flex flex-col p-5">
                <h2 className="text-base font-semibold">{inst.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{inst.lineName}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{inst.stations.length} pontos</span>
                  <span>{inst.routes.length} rotas</span>
                  <span>{inst.trains.length} trens</span>
                  <span className="tabular">até {toHHMM(inst.horizon)}</span>
                </div>
                <div className={`mt-4 flex items-center gap-2 text-xs ${meta.cls}`}>
                  <meta.icon className="size-3.5" /> {meta.label}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Editado em{" "}
                  {inst.updatedAt
                    ? new Date(inst.updatedAt).toLocaleDateString("pt-BR")
                    : "—"}
                </p>
                <div className="mt-5 flex gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/editor/$instanceId" params={{ instanceId: inst.id }}>
                      Abrir
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      withBusy(async () => {
                        await duplicateInstance(inst.id);
                      })
                    }
                    title="Duplicar cenário"
                  >
                    <Copy className="size-4" /> Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={busy}
                    title="Excluir cenário"
                    onClick={() =>
                      withBusy(async () => {
                        if (!window.confirm(`Excluir “${inst.name}”?`)) return;
                        await deleteInstance(inst.id);
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
