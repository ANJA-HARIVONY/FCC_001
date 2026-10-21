/** Retrasos de la ficha Atención al cliente. Misma regla que incident_status_delay_service.py. */

import ExcelJS from "exceljs";

export const STATUS_DELAY_TARGET = ["Bitrix", "Solucionadas"] as const;

const ALLOWED = new Set([
  "→Bitrix",
  "→Solucionadas",
  "Pendiente→Bitrix",
  "Pendiente→Solucionadas",
  "Bitrix→Solucionadas",
]);

export interface DelayHistorial {
  id: number;
  id_incident: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  cambiado_en: Date;
  ref_bitrix: string | null;
}

export interface DelayIncident {
  id: number;
  intitule: string | null;
  date_heure: Date | null;
  observations: string | null;
  ref_bitrix: string | null;
  client: { nom: string; ville: string | null; categoria: string | null } | null;
}

export interface DelayComment {
  id_incident: number;
  contenido: string;
  creado_en: Date;
}

export interface DelayFilters {
  date_from: string;
  date_to: string;
  estado_destino: string;
  umbral: number;
}

export interface DelayRow {
  historial_id: number;
  incident_id: number;
  cliente: string;
  cliente_ville: string;
  categoria_cliente: string | null;
  asunto: string;
  estado_inicial: string;
  estado_destino: string;
  fecha_creacion: string;
  fecha_cambio: string;
  retraso_min: number;
  retraso_label: string;
  ref_bitrix: string;
  comentarios_count: number;
  ultimo_comentario: string;
  observaciones: string;
  tiempo_pendiente_min: number | null;
  ciudad: string;
}

export interface DelayKpis {
  total: number;
  retraso_medio: number;
  retraso_max: number;
  pct_bitrix: number;
  pct_solucionadas: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function stamp(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function formatRetraso(minutes: number): string {
  const value = Math.trunc(minutes);
  if (value < 60) {
    return `${value} min`;
  }
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`;
}

export function parseFichaFilters(query: Record<string, string | undefined>, today = new Date()): DelayFilters {
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  let dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(query.date_from ?? "") ? query.date_from! : isoDay(monthStart);
  let dateTo = /^\d{4}-\d{2}-\d{2}$/.test(query.date_to ?? "") ? query.date_to! : isoDay(monthEnd);
  if (!query.date_from || !query.date_to) {
    dateFrom = isoDay(monthStart);
    dateTo = isoDay(monthEnd);
  }
  if (dateFrom > dateTo) {
    [dateFrom, dateTo] = [dateTo, dateFrom];
  }
  const destino = (query.estado_destino ?? "").trim();
  const parsed = Number(query.umbral);
  const umbral = Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.min(1440, Math.trunc(parsed))) : 30;
  return {
    date_from: dateFrom,
    date_to: dateTo,
    estado_destino: destino === "Bitrix" || destino === "Solucionadas" ? destino : "",
    umbral,
  };
}

function transitionKey(anterior: string | null, nuevo: string): string {
  return `${anterior ?? ""}→${nuevo}`;
}

function truncate(text: string, max = 200): string {
  const value = text.trim();
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

function startOfDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function endOfDay(iso: string): Date {
  return new Date(`${iso}T23:59:59.999`);
}

export function buildStatusDelayRows(
  candidates: DelayHistorial[],
  incidents: DelayIncident[],
  history: DelayHistorial[],
  comments: DelayComment[],
  filters: DelayFilters,
): { rows: DelayRow[]; kpis: DelayKpis } {
  const start = startOfDay(filters.date_from).getTime();
  const end = endOfDay(filters.date_to).getTime();
  const byIncident = new Map(incidents.map((row) => [row.id, row]));
  const ordered = [...history].sort((a, b) => {
    if (a.id_incident !== b.id_incident) return a.id_incident - b.id_incident;
    const delta = a.cambiado_en.getTime() - b.cambiado_en.getTime();
    return delta !== 0 ? delta : a.id - b.id;
  });
  const previous = new Map<number, DelayHistorial>();
  let last: DelayHistorial | undefined;
  let lastIncident = 0;
  for (const row of ordered) {
    if (row.id_incident !== lastIncident) {
      last = undefined;
      lastIncident = row.id_incident;
    }
    if (last) previous.set(row.id, last);
    last = row;
  }
  const commentsByIncident = new Map<number, DelayComment[]>();
  for (const comment of [...comments].sort((a, b) => a.creado_en.getTime() - b.creado_en.getTime())) {
    const list = commentsByIncident.get(comment.id_incident) ?? [];
    list.push(comment);
    commentsByIncident.set(comment.id_incident, list);
  }

  const rows: DelayRow[] = [];
  for (const row of candidates) {
    if (row.estado_nuevo !== "Bitrix" && row.estado_nuevo !== "Solucionadas") continue;
    if (filters.estado_destino && row.estado_nuevo !== filters.estado_destino) continue;
    const changed = row.cambiado_en.getTime();
    if (changed < start || changed > end) continue;
    if (!ALLOWED.has(transitionKey(row.estado_anterior, row.estado_nuevo))) continue;
    const incident = byIncident.get(row.id_incident);
    if (!incident?.date_heure) continue;
    const prev = previous.get(row.id);
    const startTs =
      row.estado_anterior === "Bitrix" && row.estado_nuevo === "Solucionadas" && prev
        ? prev.cambiado_en
        : incident.date_heure;
    const delay = Math.floor((row.cambiado_en.getTime() - startTs.getTime()) / 60_000);
    if (delay <= filters.umbral) continue;
    const before = (commentsByIncident.get(incident.id) ?? []).filter(
      (comment) => comment.creado_en.getTime() <= changed,
    );
    const lastComment = before.at(-1)?.contenido ?? "";
    rows.push({
      historial_id: row.id,
      incident_id: incident.id,
      cliente: incident.client?.nom || "—",
      cliente_ville: incident.client?.ville ?? "",
      categoria_cliente: incident.client?.categoria ?? null,
      asunto: incident.intitule ?? "",
      estado_inicial: row.estado_anterior || "Pendiente",
      estado_destino: row.estado_nuevo,
      fecha_creacion: stamp(incident.date_heure),
      fecha_cambio: stamp(row.cambiado_en),
      retraso_min: delay,
      retraso_label: formatRetraso(delay),
      ref_bitrix: row.ref_bitrix || incident.ref_bitrix || "",
      comentarios_count: before.length,
      ultimo_comentario: truncate(lastComment),
      observaciones: truncate(incident.observations ?? ""),
      tiempo_pendiente_min: Math.floor((row.cambiado_en.getTime() - incident.date_heure.getTime()) / 60_000),
      ciudad: incident.client?.ville ?? "",
    });
  }
  return { rows, kpis: buildKpis(rows) };
}

export function buildKpis(rows: DelayRow[]): DelayKpis {
  if (!rows.length) {
    return { total: 0, retraso_medio: 0, retraso_max: 0, pct_bitrix: 0, pct_solucionadas: 0 };
  }
  const delays = rows.map((row) => row.retraso_min);
  const bitrix = rows.filter((row) => row.estado_destino === "Bitrix").length;
  const sol = rows.filter((row) => row.estado_destino === "Solucionadas").length;
  return {
    total: rows.length,
    retraso_medio: Math.round(delays.reduce((sum, value) => sum + value, 0) / rows.length),
    retraso_max: Math.max(...delays),
    pct_bitrix: Math.round((100 * bitrix) / rows.length),
    pct_solucionadas: Math.round((100 * sol) / rows.length),
  };
}

export function paginateRows<T>(rows: T[], pageRaw: number, perPageRaw: number) {
  const perPage = Math.max(1, Math.min(Number(perPageRaw) || 50, 200));
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const page = Math.max(1, Math.min(Number(pageRaw) || 1, pages));
  const start = (page - 1) * perPage;
  return { items: rows.slice(start, start + perPage), page, per_page: perPage, total: rows.length, pages };
}

const COLUMNS = [
  "ID",
  "Cliente",
  "Ciudad",
  "Asunto",
  "Estado inicial",
  "Estado destino",
  "Fecha creación",
  "Fecha cambio",
  "Retraso (min)",
  "Ref. Bitrix",
  "Comentarios",
  "Último comentario",
  "Observaciones",
];

export async function buildFichaWorkbook(
  usuario: string,
  rows: DelayRow[],
  filters: DelayFilters,
  kpis: DelayKpis,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detalle incidencias");
  const meta: [string, string | number][] = [
    ["Usuario", usuario],
    ["Período desde", dayLabel(filters.date_from)],
    ["Período hasta", dayLabel(filters.date_to)],
    ["Estado destino", filters.estado_destino || "Todos"],
    ["Umbral (min)", filters.umbral],
    ["Total con retraso", kpis.total],
    ["Retraso medio", kpis.retraso_medio],
    ["Retraso máximo", kpis.retraso_max],
    ["Generado", stamp(new Date())],
  ];
  meta.forEach(([label, value], index) => {
    ws.getCell(index + 1, 1).value = label;
    ws.getCell(index + 1, 1).font = { bold: true };
    ws.getCell(index + 1, 2).value = value;
  });
  const headerRow = meta.length + 2;
  COLUMNS.forEach((header, index) => {
    const cell = ws.getCell(headerRow, index + 1);
    cell.value = header;
    cell.font = { bold: true };
  });
  rows.forEach((row, index) => {
    const values = [
      row.incident_id,
      row.cliente,
      row.ciudad,
      row.asunto,
      row.estado_inicial,
      row.estado_destino,
      row.fecha_creacion,
      row.fecha_cambio,
      row.retraso_min,
      row.ref_bitrix,
      row.comentarios_count,
      row.ultimo_comentario,
      row.observaciones,
    ];
    values.forEach((value, col) => {
      ws.getCell(headerRow + 1 + index, col + 1).value = value;
    });
  });
  ws.views = [{ state: "frozen", ySplit: headerRow }];
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

export function fichaExportFilename(nom: string, now = new Date()): string {
  const slug = (nom || "usuario").replace(/ /g, "_").slice(0, 40);
  return `ficha_retrasos_${slug}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;
}
