/** Informe de salidas y ficha técnico. Mismas reglas que materiales_service.py. */

import ExcelJS from "exceljs";

import { SALIDA_TYPES } from "@fcc/domain";

export class InformeError extends Error {}

const MATERIAL_TIPO_LABELS: Record<string, string> = {
  outillage: "Herramientas",
  material_cliente: "Materiales de cliente",
};

const SALIDA_TIPO_LABELS: Record<string, string> = {
  uso_interno: "Uso interno",
  incidencia: "Incidencia",
  instalacion: "Instalación",
};

const SALIDAS_COUNT_LABELS: Record<string, string> = {
  incidencia: "Nº incidencias",
  instalacion: "Nº instalaciones",
  uso_interno: "Nº usos internos",
};

export interface InformeFilters {
  tecnico_id: number | null;
  material_id: number | null;
  tipo_salida: string;
}

export interface InformeLinea {
  id: number;
  cantidad: number;
  id_material: number;
  material: { nombre: string; modelo: string | null; tipo: string } | null;
  salida: {
    id: number;
    fecha: Date;
    tipo_salida: string;
    tecnico_nom: string;
    client_nom: string | null;
  } | null;
}

export interface InformeResumen {
  salidas_count: number;
  salidas_count_label: string;
  materiales_distintos: number;
  material_rows: { label: string; cantidad_total: number }[];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDay(date: Date): string {
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

export function defaultInformePeriod(today = new Date()): { date_from: string; date_to: string } {
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  return { date_from: isoDay(from), date_to: isoDay(today) };
}

export function parseInformeFilters(query: Record<string, string | undefined>): InformeFilters {
  const tecnico = Number(query.tecnico);
  const material = Number(query.material);
  const tipo = (query.tipo_salida ?? "").trim();
  return {
    tecnico_id: Number.isInteger(tecnico) && tecnico > 0 ? tecnico : null,
    material_id: Number.isInteger(material) && material > 0 ? material : null,
    tipo_salida: SALIDA_TYPES.includes(tipo as (typeof SALIDA_TYPES)[number]) ? tipo : "",
  };
}

export function assertInformePeriod(dateFrom: string, dateTo: string): { from: Date; to: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    throw new InformeError("Formato de fecha inválido.");
  }
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new InformeError("Formato de fecha inválido.");
  }
  if (from.getTime() > to.getTime()) {
    throw new InformeError('La fecha "hasta" debe ser posterior a la fecha "desde".');
  }
  return { from, to };
}

export function assertInformeExportPeriod(dateFrom: string, dateTo: string): { from: Date; to: Date } {
  if (!dateFrom || !dateTo) {
    throw new InformeError("Indique el período del informe antes de exportar.");
  }
  return assertInformePeriod(dateFrom, dateTo);
}

export function informeCliente(salida: InformeLinea["salida"]): string {
  if (salida?.client_nom) {
    return salida.client_nom;
  }
  if (salida?.tipo_salida === "uso_interno") {
    return "Uso interno";
  }
  return "Uso general";
}

export function materialOptionLabel(nombre: string | null, modelo: string | null, id: number): string {
  let label = nombre || `Material #${id}`;
  if (modelo) {
    label = `${label} - ${modelo}`;
  }
  return label;
}

function groupLabel(linea: InformeLinea): string {
  if (!linea.material) {
    return "Material desconocido";
  }
  let label = linea.material.nombre || `Material #${linea.id_material}`;
  if (linea.material.modelo) {
    label = `${label} (${linea.material.modelo})`;
  }
  return label;
}

export function buildInformeResumen(lineas: InformeLinea[], tipoSalida = ""): InformeResumen {
  const salidas = new Set<number>();
  const materials = new Set<number>();
  const totals = new Map<number, { label: string; cantidad_total: number }>();
  for (const linea of lineas) {
    if (linea.salida) {
      salidas.add(linea.salida.id);
    }
    if (linea.id_material) {
      materials.add(linea.id_material);
    }
    const key = linea.id_material || 0;
    const current = totals.get(key) ?? { label: groupLabel(linea), cantidad_total: 0 };
    current.cantidad_total += linea.cantidad;
    totals.set(key, current);
  }
  return {
    salidas_count: salidas.size,
    salidas_count_label: SALIDAS_COUNT_LABELS[tipoSalida] ?? "Nº salidas",
    materiales_distintos: materials.size,
    material_rows: [...totals.values()].sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase())),
  };
}

export function sortInformeLineas(lineas: InformeLinea[]): InformeLinea[] {
  return [...lineas].sort((a, b) => {
    const fecha = (b.salida?.fecha.getTime() ?? 0) - (a.salida?.fecha.getTime() ?? 0);
    if (fecha !== 0) return fecha;
    const nom = (a.salida?.tecnico_nom ?? "").localeCompare(b.salida?.tecnico_nom ?? "", "es");
    if (nom !== 0) return nom;
    return a.id - b.id;
  });
}

export function paginateInforme<T>(rows: T[], pageRaw: number) {
  const perPage = 50;
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const page = Math.max(1, Math.min(pageRaw || 1, pages));
  const start = (page - 1) * perPage;
  return { items: rows.slice(start, start + perPage), page, per_page: perPage, total: rows.length, pages };
}

const COLUMNS = ["Fecha", "Técnico", "Cliente", "Material", "Tipo material", "Tipo salida", "Cantidad"];

export function informeRowValues(linea: InformeLinea): (string | number)[] {
  const salida = linea.salida;
  const material = linea.material;
  return [
    salida?.fecha ? formatDay(salida.fecha) : "",
    salida?.tecnico_nom ?? "",
    informeCliente(salida),
    material?.nombre ?? "",
    material ? (MATERIAL_TIPO_LABELS[material.tipo] ?? material.tipo) : "",
    salida ? (SALIDA_TIPO_LABELS[salida.tipo_salida] ?? salida.tipo_salida) : "",
    linea.cantidad,
  ];
}

export async function buildInformeWorkbook(lineas: InformeLinea[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Informe salidas");
  COLUMNS.forEach((header, index) => {
    const cell = ws.getCell(1, index + 1);
    cell.value = header;
    cell.font = { bold: true };
  });
  lineas.forEach((linea, rowIndex) => {
    informeRowValues(linea).forEach((value, col) => {
      ws.getCell(rowIndex + 2, col + 1).value = value;
    });
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

export function informeExportFilename(now = new Date()): string {
  return `informe_salidas_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;
}

export function tecnicoFichaAccess(
  tecnico: { categoria: string; id_agencia: number; id_ciudad: number } | null,
  scope: { agenciaId: number | null; ciudadId: number | null },
): "missing" | "not_tecnico" | "out_of_scope" | "ok" {
  if (!tecnico) {
    return "missing";
  }
  if (tecnico.categoria !== "tecnico") {
    return "not_tecnico";
  }
  if (
    scope.agenciaId != null &&
    (tecnico.id_agencia !== scope.agenciaId || tecnico.id_ciudad !== scope.ciudadId)
  ) {
    return "out_of_scope";
  }
  return "ok";
}

export function materialTipoLabel(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  return MATERIAL_TIPO_LABELS[tipo] ?? tipo;
}

export function salidaTipoLabel(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  return SALIDA_TIPO_LABELS[tipo] ?? tipo;
}
