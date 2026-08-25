import type { Instance } from "./types";

export function makeSampleInstance(overrides: Partial<Instance> = {}): Instance {
  const ids = {
    recife: "st-recife",
    afogados: "st-afogados",
    centro: "st-centro",
    cajueiro: "st-cajueiro",
    camaragibe: "st-camaragibe",
  };

  const inst: Instance = {
    id: "inst-metro-recife",
    name: "Metrô Recife — Dia útil",
    lineName: "Linha Centro",
    updatedAt: "2026-08-14T10:12:00Z",
    lastRun: "success",
    stations: [
      {
        id: ids.recife,
        name: "Recife",
        roles: ["station", "crossing", "depot"],
        dwellMin: 142,
        dwellMax: 592,
      },
      { id: ids.afogados, name: "Afogados", roles: ["station"], dwellMin: 120, dwellMax: 180 },
      {
        id: ids.centro,
        name: "Centro",
        roles: ["station", "crossing"],
        dwellMin: 120,
        dwellMax: 180,
      },
      { id: ids.cajueiro, name: "Cajueiro", roles: ["station"], dwellMin: 120, dwellMax: 180 },
      {
        id: ids.camaragibe,
        name: "Camaragibe",
        roles: ["station", "crossing", "depot"],
        dwellMin: 142,
        dwellMax: 592,
      },
    ],
    segments: [
      { fromId: ids.recife, toId: ids.afogados, distance: 694 },
      { fromId: ids.afogados, toId: ids.centro, distance: 618 },
      { fromId: ids.centro, toId: ids.cajueiro, distance: 703 },
      { fromId: ids.cajueiro, toId: ids.camaragibe, distance: 664 },
    ],
    routes: [
      {
        id: "rt-short",
        name: "Retorno curto",
        sequence: [ids.recife, ids.afogados, ids.centro, ids.afogados, ids.recife],
        startsInbound: false,
      },
      {
        id: "rt-full",
        name: "Linha completa",
        sequence: [
          ids.camaragibe,
          ids.cajueiro,
          ids.centro,
          ids.afogados,
          ids.recife,
          ids.afogados,
          ids.centro,
          ids.cajueiro,
          ids.camaragibe,
        ],
        startsInbound: true,
      },
    ],
    trains: [
      { id: "tr-1", name: "Trem 1", maxTrips: 6, routeId: "rt-short" },
      { id: "tr-2", name: "Trem 2", maxTrips: 6, routeId: "rt-full" },
    ],
    intervals: [
      { id: "iv-peak", name: "Pico da manhã", start: 6 * 3600, end: 9 * 3600, color: "peak" },
      {
        id: "iv-off",
        name: "Fora de pico",
        start: 9 * 3600,
        end: 17 * 3600 + 6 * 60,
        color: "offpeak",
      },
    ],
    demand: {
      [`${ids.recife}:ida:iv-peak`]: 6,
      [`${ids.afogados}:ida:iv-peak`]: 4,
      [`${ids.afogados}:volta:iv-peak`]: 4,
      [`${ids.centro}:ida:iv-peak`]: 5,
      [`${ids.centro}:volta:iv-peak`]: 5,
      [`${ids.cajueiro}:ida:iv-peak`]: 3,
      [`${ids.cajueiro}:volta:iv-peak`]: 3,
      [`${ids.camaragibe}:volta:iv-peak`]: 4,
      [`${ids.recife}:ida:iv-off`]: 3,
      [`${ids.afogados}:ida:iv-off`]: 2,
      [`${ids.afogados}:volta:iv-off`]: 2,
      [`${ids.centro}:ida:iv-off`]: 2,
      [`${ids.centro}:volta:iv-off`]: 2,
      [`${ids.cajueiro}:ida:iv-off`]: 1,
      [`${ids.cajueiro}:volta:iv-off`]: 1,
      [`${ids.camaragibe}:volta:iv-off`]: 3,
    },
    dayStart: 6 * 3600,
    horizon: 17 * 3600 + 6 * 60,
    alpha: 41,
    minHeadway: 6 * 60,
    initialStationId: ids.recife,
  };

  return { ...inst, ...overrides };
}

export function makeSecondInstance(): Instance {
  const base = makeSampleInstance();
  return {
    ...base,
    id: "inst-weekend",
    name: "Metrô Recife — Fim de semana",
    lineName: "Linha Centro",
    updatedAt: "2026-08-02T16:40:00Z",
    lastRun: "never",
    trains: [{ id: "tr-1", name: "Trem 1", maxTrips: 4, routeId: "rt-full" }],
    intervals: [
      { id: "iv-day", name: "Dia inteiro", start: 7 * 3600, end: 15 * 3600, color: "peak" },
    ],
    demand: {},
    dayStart: 7 * 3600,
    horizon: 15 * 3600,
  };
}

export function makeEmptyInstance(overrides: Partial<Instance> = {}): Instance {
  const inst: Instance = {
    id: "inst-new",
    name: "Novo cenário",
    lineName: "",
    updatedAt: new Date().toISOString(),
    lastRun: "never",
    stations: [],
    segments: [],
    routes: [],
    trains: [],
    intervals: [],
    demand: {},
    dayStart: 6 * 3600,
    horizon: 22 * 3600,
    alpha: 41,
    minHeadway: 6 * 60,
    initialStationId: "",
  };
  return { ...inst, ...overrides };
}
