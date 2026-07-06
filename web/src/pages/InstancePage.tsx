import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createInstance,
  deleteInstance,
  getInstances,
  runSolver,
  updateInstance,
} from "@/api/client";
import { BaseFields } from "@/components/BaseFields";
import { FreeFields } from "@/components/FreeFields";
import { IntervalsFields } from "@/components/IntervalsFields";
import { PointsFields } from "@/components/PointsFields";
import { SolutionView } from "@/components/SolutionView";
import { TrainFields } from "@/components/TrainFields";
import {
  buildParams,
  intervalsFromTimeStrings,
} from "@/lib/buildParams";
import { paramsToDefaults } from "@/lib/defaults";
import {
  connectionsFromDefaults,
  defaultsToFormState,
  emptyFormState,
  parseDemandsFromForm,
  parseRoutesFromForm,
  parseStFromForm,
  parseTripsFromForm,
  type InstanceFormState,
} from "@/lib/formState";
import { connectionsToMatrix } from "@/lib/matrix";
import { timeStringToSeconds } from "@/lib/time";
import { validate } from "@/lib/validate";
import type { Connection, InstanceRead, SolutionRead } from "@/types/instance";

const NEW = "__new__";

export function InstancePage() {
  const [instances, setInstances] = useState<InstanceRead[]>([]);
  const [selection, setSelection] = useState<string>(NEW);
  const [form, setForm] = useState<InstanceFormState>(emptyFormState());
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [solution, setSolution] = useState<SolutionRead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const selected =
    selection === NEW
      ? null
      : instances.find((i) => String(i.id) === selection) ?? null;

  const loadInstances = useCallback(async (): Promise<InstanceRead[]> => {
    try {
      const list = await getInstances();
      setInstances(list);
      return list;
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Erro ao carregar instâncias"]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const applySelection = useCallback(
    (sel: string, list: InstanceRead[]) => {
      setSelection(sel);
      setConfirmDelete(false);
      setSolution(null);
      setErrors([]);
      setSuccess(null);

      if (sel === NEW) {
        setForm(emptyFormState());
        setConnections([]);
        return;
      }

      const inst = list.find((i) => String(i.id) === sel);
      if (!inst) return;
      const defaults = paramsToDefaults(inst.params);
      setForm(defaultsToFormState(defaults, inst.name));
      setConnections(connectionsFromDefaults(defaults));
      setActiveId(inst.id);
    },
    [],
  );

  const handleSelectionChange = (sel: string) => {
    applySelection(sel, instances);
  };

  useEffect(() => {
    if (!loading && selection !== NEW && !selected && instances.length) {
      applySelection(NEW, instances);
    }
  }, [loading, selection, selected, instances, applySelection]);

  const updateForm = (patch: Partial<InstanceFormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if ("num_trains" in patch && patch.num_trains !== undefined) {
        const n = patch.num_trains === "" ? 0 : patch.num_trains;
        next.num_trips = Array.from({ length: n }, (_, i) => prev.num_trips[i] ?? "");
      }
      if ("num_routes" in patch && patch.num_routes !== undefined) {
        const n = patch.num_routes === "" ? 0 : patch.num_routes;
        next.routeTexts = Array.from(
          { length: n },
          (_, i) => prev.routeTexts[i] ?? "",
        );
      }
      if ("num_points" in patch || "num_intervals" in patch) {
        const pts = next.num_points === "" ? 0 : Number(next.num_points);
        const ints = next.num_intervals === "" ? 0 : Number(next.num_intervals);
        const rows = pts * 2;
        next.service_time_min = Array.from(
          { length: pts },
          (_, i) => prev.service_time_min[i] ?? "",
        );
        next.service_time_max = Array.from(
          { length: pts },
          (_, i) => prev.service_time_max[i] ?? "",
        );
        next.demands = Array.from({ length: rows }, (_, i) =>
          Array.from({ length: ints }, (_, j) => prev.demands[i]?.[j] ?? ""),
        );
      }
      if ("num_intervals" in patch && patch.num_intervals !== undefined) {
        const n = patch.num_intervals === "" ? 0 : patch.num_intervals;
        next.intervals = Array.from({ length: n }, (_, i) => ({
          start: prev.intervals[i]?.start ?? "00:00",
          end: prev.intervals[i]?.end ?? "00:00",
        }));
      }
      return next;
    });
  };

  const collectPayload = () => {
    const num_trains = form.num_trains === "" ? null : form.num_trains;
    const num_routes = form.num_routes === "" ? null : form.num_routes;
    const num_points = form.num_points === "" ? null : form.num_points;
    const num_intervals = form.num_intervals === "" ? null : form.num_intervals;
    const matrixSize = num_points ? num_points * 2 : 0;
    const routes = parseRoutesFromForm(form.routeTexts);
    const intervalsSeconds = intervalsFromTimeStrings(
      form.intervals.map((p) => [p.start, p.end]),
    );
    const max_time_seconds = timeStringToSeconds(form.max_time);

    return {
      validateInput: {
        name: form.name,
        num_trains,
        num_routes,
        num_points,
        num_intervals,
        num_trips: parseTripsFromForm(form.num_trips),
        routes,
        service_time_min: parseStFromForm(form.service_time_min),
        service_time_max: parseStFromForm(form.service_time_max),
        demands: parseDemandsFromForm(form.demands),
        connections,
        intervalsSeconds,
        initial_point: form.initial_point === "" ? null : form.initial_point,
        max_time_seconds,
        alpha: form.alpha === "" ? null : form.alpha,
        stations: form.stations,
        crossings: form.crossings,
        depots: form.depots,
      },
      buildInput:
        num_trains && num_points && num_intervals
          ? {
              num_trains,
              num_routes: num_routes ?? 0,
              num_points,
              num_intervals,
              num_trips: parseTripsFromForm(form.num_trips),
              routes,
              service_time_min: parseStFromForm(form.service_time_min),
              service_time_max: parseStFromForm(form.service_time_max),
              cost_matrix: connectionsToMatrix(connections, matrixSize),
              demands: parseDemandsFromForm(form.demands).map((row) =>
                row.map((v) => (Number.isNaN(v) ? 0 : v)),
              ),
              intervalsSeconds,
              initial_point: Number(form.initial_point),
              max_time_seconds,
              alpha: Number(form.alpha),
              stations: form.stations,
              crossings: form.crossings,
              depots: form.depots,
            }
          : null,
    };
  };

  const handleSaveNew = async () => {
    setErrors([]);
    setSuccess(null);
    const { validateInput, buildInput } = collectPayload();
    const validationErrors = validate(validateInput);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    if (!buildInput) return;
    try {
      const result = await createInstance(form.name, buildParams(buildInput));
      setActiveId(result.id);
      setSolution(null);
      setSuccess(`Instância criada — id=${result.id}`);
      const list = await loadInstances();
      applySelection(String(result.id), list);
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.details.length ? e.details : [e.message]);
      else setErrors([e instanceof Error ? e.message : "Erro ao salvar"]);
    }
  };

  const handleSaveUpdate = async () => {
    if (!selected) return;
    setErrors([]);
    setSuccess(null);
    const { validateInput, buildInput } = collectPayload();
    const validationErrors = validate(validateInput);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    if (!buildInput) return;
    try {
      const result = await updateInstance(
        selected.id,
        form.name,
        buildParams(buildInput),
      );
      setActiveId(result.id);
      setSolution(null);
      setSuccess(`Instância atualizada — id=${result.id}`);
      await loadInstances();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.details.length ? e.details : [e.message]);
      else setErrors([e instanceof Error ? e.message : "Erro ao atualizar"]);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteInstance(selected.id);
      if (activeId === selected.id) {
        setActiveId(null);
        setSolution(null);
      }
      setConfirmDelete(false);
      setSuccess(`Instância id=${selected.id} excluída.`);
      const list = await loadInstances();
      applySelection(NEW, list);
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.details.length ? e.details : [e.message]);
      else setErrors([e instanceof Error ? e.message : "Erro ao excluir"]);
    }
  };

  const handleRunSolver = async () => {
    const id = activeId ?? selected?.id ?? null;
    if (!id) return;
    setRunning(true);
    setErrors([]);
    try {
      const sol = await runSolver(id);
      setSolution(sol);
      setActiveId(id);
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.details.length ? e.details : [e.message]);
      else setErrors([e instanceof Error ? e.message : "Erro ao executar"]);
    } finally {
      setRunning(false);
    }
  };

  const effectiveActiveId = activeId ?? selected?.id ?? null;
  const showTrains = form.num_trains !== "" && form.num_routes !== "";
  const showPoints =
    form.num_points !== "" && form.num_intervals !== "";
  const showIntervals = form.num_intervals !== "";

  return (
    <div className="app">
      <h1>CBTU Solver</h1>

      {errors.map((e, i) => (
        <div key={i} className="alert alert-error">
          {e}
        </div>
      ))}
      {success && <div className="alert alert-success">{success}</div>}

      <section className="section">
        <div className="header-row">
          <div className="field field-grow">
            <label htmlFor="instance_select">Instância</label>
            <select
              id="instance_select"
              value={selection}
              onChange={(e) => handleSelectionChange(e.target.value)}
              disabled={loading}
            >
              <option value={NEW}>Nova instância</option>
              {instances.map((i) => (
                <option key={i.id} value={String(i.id)}>
                  {i.name} (id={i.id})
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <button
              type="button"
              className="danger"
              title="Excluir instância selecionada"
              onClick={() => setConfirmDelete(true)}
            >
              Excluir
            </button>
          )}
        </div>

        {confirmDelete && selected && (
          <div className="alert alert-warning">
            <p>
              Excluir a instância <strong>{selected.name}</strong> (id=
              {selected.id})? Esta ação não pode ser desfeita.
            </p>
            <div className="actions">
              <button type="button" className="primary danger" onClick={handleDelete}>
                Confirmar exclusão
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="field" style={{ marginTop: "1rem" }}>
          <label htmlFor="name">Nome da instância</label>
          <input
            id="name"
            type="text"
            placeholder="ex: instancia-1"
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            style={{ width: "100%" }}
          />
        </div>
      </section>

      <section className="section">
        <h2>Parâmetros base</h2>
        <BaseFields
          numTrains={form.num_trains}
          numRoutes={form.num_routes}
          numPoints={form.num_points}
          numIntervals={form.num_intervals}
          onChange={(field, value) =>
            updateForm({ [field]: value } as Partial<InstanceFormState>)
          }
        />
      </section>

      <section className="section">
        {showTrains ? (
          <TrainFields
            numTrains={Number(form.num_trains)}
            numRoutes={Number(form.num_routes)}
            numTrips={form.num_trips}
            routeTexts={form.routeTexts}
            onTripChange={(i, v) => {
              const next = [...form.num_trips];
              next[i] = v;
              updateForm({ num_trips: next });
            }}
            onRouteChange={(i, v) => {
              const next = [...form.routeTexts];
              next[i] = v;
              updateForm({ routeTexts: next });
            }}
          />
        ) : (
          <p className="hint">
            Preencha o número de trens e de rotas para definir viagens e rotas.
          </p>
        )}
      </section>

      <section className="section">
        {showPoints ? (
          <PointsFields
            numPoints={Number(form.num_points)}
            numIntervals={Number(form.num_intervals)}
            serviceTimeMin={form.service_time_min}
            serviceTimeMax={form.service_time_max}
            demands={form.demands}
            connections={connections}
            onStMinChange={(i, v) => {
              const next = [...form.service_time_min];
              next[i] = v;
              updateForm({ service_time_min: next });
            }}
            onStMaxChange={(i, v) => {
              const next = [...form.service_time_max];
              next[i] = v;
              updateForm({ service_time_max: next });
            }}
            onDemandChange={(node, interval, v) => {
              const next = form.demands.map((row) => [...row]);
              if (!next[node]) next[node] = [];
              next[node][interval] = v;
              updateForm({ demands: next });
            }}
            onConnectionsChange={setConnections}
          />
        ) : (
          <p className="hint">
            Preencha o número de pontos e intervalos para service times, cost
            matrix e demands.
          </p>
        )}
      </section>

      <section className="section">
        {showIntervals ? (
          <IntervalsFields
            numIntervals={Number(form.num_intervals)}
            intervals={form.intervals}
            onChange={(i, field, value) => {
              const next = form.intervals.map((p) => ({ ...p }));
              next[i] = { ...next[i], [field]: value };
              updateForm({ intervals: next });
            }}
          />
        ) : (
          <p className="hint">
            Preencha o número de intervalos para definir os intervalos de tempo.
          </p>
        )}
      </section>

      <section className="section">
        <h2>Parâmetros adicionais</h2>
        <FreeFields
          initialPoint={form.initial_point}
          maxTime={form.max_time}
          alpha={form.alpha}
          stations={form.stations}
          crossings={form.crossings}
          depots={form.depots}
          onChange={(field, value) =>
            updateForm({ [field]: value } as Partial<InstanceFormState>)
          }
        />
      </section>

      <section className="section">
        <div className="actions">
          <button type="button" onClick={handleSaveNew}>
            Salvar como nova instância
          </button>
          <button
            type="button"
            onClick={handleSaveUpdate}
            disabled={!selected}
          >
            Salvar alterações
          </button>
        </div>
      </section>

      <section className="section">
        {effectiveActiveId && (
          <p className="caption">Instância ativa: id={effectiveActiveId}</p>
        )}
        <button
          type="button"
          className="primary"
          disabled={!effectiveActiveId || running}
          onClick={handleRunSolver}
        >
          Executar Solver
        </button>
        {running && <span className="spinner">Executando solver…</span>}
      </section>

      {solution && <SolutionView solution={solution} />}
    </div>
  );
}
