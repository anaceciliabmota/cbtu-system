import * as XLSX from "xlsx";
import { toHHMM, toHHMMSS } from "./time";
import type { Instance, SolverResult } from "./types";

function inlineSvgStyles(source: SVGElement): SVGElement {
  const clone = source.cloneNode(true) as SVGElement;
  const sourceNodes = [source, ...source.querySelectorAll("*")];
  const cloneNodes = [clone, ...clone.querySelectorAll("*")];
  const props = [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-dasharray",
    "stroke-linejoin",
    "stroke-linecap",
    "opacity",
    "font-size",
    "font-family",
    "font-weight",
    "text-anchor",
    "dominant-baseline",
  ];
  for (let i = 0; i < sourceNodes.length; i++) {
    const src = sourceNodes[i]!;
    const dst = cloneNodes[i]!;
    const computed = window.getComputedStyle(src);
    const existing = dst.getAttribute("style") ?? "";
    const inline = new Map<string, string>();
    for (const rule of existing.split(";")) {
      const [k, v] = rule.split(":");
      if (k && v) inline.set(k.trim(), v.trim());
    }
    for (const prop of props) {
      const value = computed.getPropertyValue(prop);
      if (value && value !== "none" && value !== "rgba(0, 0, 0, 0)") {
        inline.set(prop, value);
      }
    }
    const style = Array.from(inline.entries())
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
    if (style) dst.setAttribute("style", style);
  }
  return clone;
}

export async function exportSpaceTimePng(inst: Instance, container: HTMLDivElement | null) {
  if (!container) return;
  const svg = container.querySelector("svg");
  if (!svg) return;

  const clone = inlineSvgStyles(svg as SVGElement);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(svg.clientWidth || 980));
  clone.setAttribute("height", String(svg.clientHeight || 460));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  const scale = 2;
  const width = Number(clone.getAttribute("width"));
  const height = Number(clone.getAttribute("height"));

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  const png = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = png;
  link.download = `${slug(inst.name)}-diagrama-espaco-tempo.png`;
  link.click();
}

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function autoWidth(rows: (string | number)[][]) {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? "").length + 2;
      if (!widths[i] || widths[i] < len) widths[i] = len;
    });
  }
  return widths.map((w) => ({ wch: Math.min(Math.max(w, 8), 40) }));
}

function addSheet(wb: XLSX.WorkBook, name: string, rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = autoWidth(rows);
  if (rows.length > 1) ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: (rows[0]?.length ?? 1) - 1 } }) };
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

export function exportSolutionXlsx(inst: Instance, result: SolverResult) {
  const stationName = (id: string) => inst.stations.find((s) => s.id === id)?.name ?? id;
  const trainName = (id: string) => inst.trains.find((t) => t.id === id)?.name ?? id;
  const routeName = (id: string) => inst.routes.find((r) => r.id === id)?.name ?? id;

  const wb = XLSX.utils.book_new();

  // Resumo
  addSheet(wb, "Resumo", [
    ["Cenário", inst.name],
    ["Linha", inst.lineName],
    ["Início do dia", toHHMM(inst.dayStart)],
    ["Fim do dia", toHHMM(inst.horizon)],
    
    ["Valor objetivo", result.objective],
    ["Tempo do solver (s)", Number((result.runtimeMs / 1000).toFixed(2))],
    ["Trens utilizados", result.trainsUsed],
    ["Viagens programadas", result.tripsScheduled],
    ["Exportado em", new Date().toLocaleString("pt-BR")],
  ]);

  // Viagens
  const trips: (string | number)[][] = [
    ["Trem", "Viagem", "Rota", "Sentido", "Origem", "Destino", "Partida", "Chegada", "Duração (min)", "Paradas"],
  ];
  for (const sch of result.schedules) {
    for (const trip of sch.trips) {
      const first = trip.stops[0];
      const last = trip.stops[trip.stops.length - 1];
      if (!first || !last) continue;
      trips.push([
        trainName(sch.trainId),
        trip.index,
        routeName(trip.routeId),
        first.direction === "inbound" ? "volta" : "ida",
        stationName(first.stationId),
        stationName(last.stationId),
        toHHMM(first.departure),
        toHHMM(last.arrival),
        Math.round((last.arrival - first.departure) / 60),
        trip.stops.length,
      ]);
    }
  }
  addSheet(wb, "Viagens", trips);

  // Paradas
  const stops: (string | number)[][] = [
    ["Trem", "Viagem", "Rota", "Ordem", "Ponto", "Sentido", "Chegada", "Partida", "Parada (s)"],
  ];
  for (const sch of result.schedules) {
    for (const trip of sch.trips) {
      trip.stops.forEach((st, i) => {
        stops.push([
          trainName(sch.trainId),
          trip.index,
          routeName(trip.routeId),
          i + 1,
          stationName(st.stationId),
          st.direction === "inbound" ? "volta" : "ida",
          toHHMMSS(st.arrival),
          toHHMMSS(st.departure),
          st.departure - st.arrival,
        ]);
      });
    }
  }
  addSheet(wb, "Paradas", stops);

  // Demanda
  const demandHeader = ["Ponto", "Sentido", ...inst.intervals.map((iv) => iv.name)];
  const demandRows: (string | number)[][] = [demandHeader];
  inst.stations.forEach((st, si) => {
    const dirs: ("ida" | "volta")[] = [];
    if (inst.stations[si + 1]) dirs.push("ida");
    if (inst.stations[si - 1]) dirs.push("volta");
    for (const d of dirs) {
      demandRows.push([
        st.name,
        d,
        ...inst.intervals.map((iv) => inst.demand[`${st.id}:${d}:${iv.id}`] ?? 0),
      ]);
    }
  });
  addSheet(wb, "Demanda", demandRows);

  // Configuração da linha
  const lineRows: (string | number)[][] = [["Ordem", "Ponto", "Funções", "Parada mín (s)", "Parada máx (s)"]];
  inst.stations.forEach((st, i) => {
    lineRows.push([i + 1, st.name, st.roles.map((r) => (r === "station" ? "Estação" : r === "crossing" ? "Cruzamento" : "Depósito")).join(" · "), st.dwellMin, st.dwellMax]);
  });
  addSheet(wb, "Linha", lineRows);

  // Rotas
  const routeRows: (string | number)[][] = [["Rota", "Sentido inicial", "Sequência"]];
  for (const r of inst.routes) {
    const a = r.sequence[0];
    const b = r.sequence[1];
    const ia = a ? inst.stations.findIndex((s) => s.id === a) : -1;
    const ib = b ? inst.stations.findIndex((s) => s.id === b) : -1;
    routeRows.push([
      r.name,
      ia >= 0 && ib >= 0 ? (ib < ia ? "volta" : "ida") : "-",
      r.sequence.map(stationName).join(" → "),
    ]);
  }
  addSheet(wb, "Rotas", routeRows);

  XLSX.writeFile(wb, `${slug(inst.name)}-solucao.xlsx`, { compression: true });
}
