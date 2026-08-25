import { useSyncExternalStore } from "react";
import {
  createInstanceApi,
  deleteInstanceApi,
  getInstance,
  listInstances,
  listSolutions,
  runInstanceApi,
  updateInstanceApi,
} from "./api";
import { mapApiSolution } from "./mapSolution";
import { makeEmptyInstance, makeSampleInstance } from "./sample";
import type { Instance, SolverResult } from "./types";

interface State {
  instances: Instance[];
  results: Record<string, SolverResult>;
  theme: "light" | "dark";
  loading: boolean;
  saving: boolean;
  error: string | null;
  loaded: boolean;
}

let state: State = {
  instances: [],
  results: {},
  theme: "light",
  loading: true,
  saving: false,
  error: null,
  loaded: false,
};

const listeners = new Set<() => void>();
const pendingPersist = new Set<string>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let loadPromise: Promise<void> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function setState(patch: Partial<State> | ((current: State) => State)) {
  state = typeof patch === "function" ? patch(state) : { ...state, ...patch };
  emit();
}

export function useRailStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export function getState() {
  return state;
}

function fromApi(line: Instance, lastRun: Instance["lastRun"]): Instance {
  return { ...line, lastRun, id: String(line.id) };
}

async function hydrateResult(id: string) {
  try {
    const solutions = await listSolutions(id);
    const latest = solutions[0];
    const inst = state.instances.find((i) => i.id === id);
    if (!latest || !inst) return;
    setState({
      results: { ...state.results, [id]: mapApiSolution(inst, latest.result) },
    });
  } catch {
    // listing solutions is optional for the editor
  }
}

export function loadFromApi(force = false): Promise<void> {
  if (loadPromise && !force) return loadPromise;
  loadPromise = (async () => {
    setState({ loading: true, error: null });
    try {
      const rows = await listInstances();
      const instances = rows.map((row) => fromApi(row.line, row.last_run));
      setState({ instances, loading: false, loaded: true, error: null });
      await Promise.all(instances.map((inst) => hydrateResult(inst.id)));
    } catch (err) {
      setState({
        loading: false,
        loaded: true,
        error: err instanceof Error ? err.message : "Falha ao carregar cenários.",
      });
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

async function persistOne(id: string) {
  const inst = state.instances.find((i) => i.id === id);
  if (!inst) return;
  await updateInstanceApi(id, inst.name, inst);
}

export async function flushPersist(id?: string) {
  const ids = id ? [id] : [...pendingPersist];
  if (ids.length === 0) return;
  ids.forEach((item) => pendingPersist.delete(item));
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  setState({ saving: true });
  try {
    for (const item of ids) {
      await persistOne(item);
    }
    setState({ saving: false, error: null });
  } catch (err) {
    ids.forEach((item) => pendingPersist.add(item));
    setState({
      saving: false,
      error: err instanceof Error ? err.message : "Falha ao salvar o cenário.",
    });
    throw err;
  }
}

function schedulePersist(id: string) {
  pendingPersist.add(id);
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void flushPersist();
  }, 800);
}

export function setInstance(id: string, updater: (inst: Instance) => Instance) {
  state = {
    ...state,
    instances: state.instances.map((i) =>
      i.id === id ? { ...updater(i), updatedAt: new Date().toISOString(), lastRun: "stale" } : i,
    ),
  };
  emit();
  schedulePersist(id);
}

export function setResult(id: string, result: SolverResult) {
  state = {
    ...state,
    results: { ...state.results, [id]: result },
    instances: state.instances.map((i) => (i.id === id ? { ...i, lastRun: "success" } : i)),
  };
  emit();
}

export async function duplicateInstance(id: string): Promise<string> {
  const src = state.instances.find((i) => i.id === id);
  if (!src) return id;
  const created = await createInstanceApi(`${src.name} (cópia)`, {
    ...src,
    name: `${src.name} (cópia)`,
    lastRun: "never",
    updatedAt: new Date().toISOString(),
  });
  const inst = fromApi(created.line, created.last_run);
  setState({ instances: [...state.instances, inst] });
  return inst.id;
}

export async function createInstance(): Promise<string> {
  const draft = makeEmptyInstance({
    name: "Novo cenário",
    updatedAt: new Date().toISOString(),
    lastRun: "never",
  });
  const created = await createInstanceApi(draft.name, draft);
  const inst = fromApi(created.line, created.last_run);
  setState({ instances: [...state.instances, inst] });
  return inst.id;
}

export async function createSampleInstance(): Promise<string> {
  const sample = makeSampleInstance({
    lastRun: "never",
    updatedAt: new Date().toISOString(),
  });
  const created = await createInstanceApi(sample.name, sample);
  const inst = fromApi(created.line, created.last_run);
  setState({ instances: [...state.instances, inst] });
  return inst.id;
}

export async function deleteInstance(id: string) {
  await deleteInstanceApi(id);
  pendingPersist.delete(id);
  setState({
    instances: state.instances.filter((i) => i.id !== id),
    results: Object.fromEntries(Object.entries(state.results).filter(([key]) => key !== id)),
  });
}

export async function ensureInstance(id: string): Promise<Instance | null> {
  const existing = state.instances.find((i) => i.id === id);
  if (existing) return existing;
  try {
    const row = await getInstance(id);
    const inst = fromApi(row.line, row.last_run);
    setState({ instances: [...state.instances, inst] });
    await hydrateResult(id);
    return inst;
  } catch {
    return null;
  }
}

export async function runSolver(id: string): Promise<SolverResult> {
  await flushPersist(id);
  const inst = state.instances.find((i) => i.id === id);
  if (!inst) throw new Error("Cenário não encontrado.");
  const solution = await runInstanceApi(id);
  const result = mapApiSolution(inst, solution.result);
  setResult(id, result);
  return result;
}

export function toggleTheme() {
  const theme = state.theme === "light" ? "dark" : "light";
  state = { ...state, theme };
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
  emit();
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
