/** Classeur d'un informe généré. Même feuilles que `etats_export_service.py`. */

import ExcelJS from "exceljs";

const TYPE_LABELS: Record<string, string> = {
  summary: "Estado General",
  analysis: "Evolución de Registros",
  performance: "Actividad por Usuario",
  custom: "Análisis Personalizado",
};

const KPI_LABELS: Record<string, string> = {
  TOTAL_INCIDENTS: "Total incidentes",
  TOTAL_INCIDENTES: "Total incidentes",
  SOLUCIONADAS_DISTANCIA: "Solucionadas (a distancia)",
  SOLUCIONADAS: "Solucionadas (a distancia)",
  BITRIX: "Bitrix (terreno)",
  BITRIX_TERRENO: "Bitrix (terreno)",
  PENDIENTES: "Pendientes",
  TAUX_RESOLUTION: "Tasa de resolución",
  USUARIOS_ACTIVOS: "Usuarios activos",
  INCIDENTES_CORPORATIVO: "Incidencias corporativos",
  INCIDENTES_PARTICULAR: "Incidencias particulares",
};

export interface EtatExportSource {
  id: number;
  titre: string;
  type_etat: string;
  statut: string;
  periode_debut: Date | null;
  periode_fin: Date | null;
  date_creation: Date;
  contenu: Record<string, unknown>;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatStamp(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDay(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function bold(cell: ExcelJS.Cell): void {
  cell.font = { bold: true };
}

function periodeLabel(etat: EtatExportSource): string {
  if (etat.periode_debut && etat.periode_fin) {
    return `${formatDay(etat.periode_debut)} - ${formatDay(etat.periode_fin)}`;
  }
  if (etat.periode_debut) {
    return `Desde el ${formatDay(etat.periode_debut)}`;
  }
  return "No definido";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function appendNotas(ws: ExcelJS.Worksheet, row: number, notas: unknown[]): number {
  bold(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Notas del día";
  row += 1;
  ["Fecha", "Ciudad", "Agencia", "Nota"].forEach((header, index) => {
    const cell = ws.getCell(row, index + 1);
    cell.value = header;
    bold(cell);
  });
  row += 1;
  for (const nota of notas) {
    const item = asRecord(nota);
    ws.getCell(row, 1).value = String(item.fecha ?? "");
    ws.getCell(row, 2).value = String(item.ciudad ?? "");
    ws.getCell(row, 3).value = String(item.agencia ?? "");
    ws.getCell(row, 4).value = String(item.texto ?? "");
    row += 1;
  }
  return row;
}

export function informeExportFilename(etat: { id: number; date_creation: Date }): string {
  const ts = `${etat.date_creation.getFullYear()}${pad(etat.date_creation.getMonth() + 1)}${pad(etat.date_creation.getDate())}_${pad(etat.date_creation.getHours())}${pad(etat.date_creation.getMinutes())}`;
  return `informe_${etat.id}_${ts}.xlsx`;
}

export async function buildEtatWorkbook(etat: EtatExportSource): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const resumen = wb.addWorksheet("Resumen");
  const rows: [string, string][] = [
    ["Campo", "Valor"],
    ["Título", etat.titre],
    ["Tipo", TYPE_LABELS[etat.type_etat] ?? etat.type_etat],
    ["Período", periodeLabel(etat)],
    ["Agencia", String(etat.contenu.agence_label ?? "Todas las agencias")],
    ["Estado", etat.statut],
    ["Generado el", formatStamp(etat.date_creation)],
  ];
  rows.forEach((pair, index) => {
    resumen.getCell(index + 1, 1).value = pair[0];
    resumen.getCell(index + 1, 2).value = pair[1];
    if (index === 0) {
      bold(resumen.getCell(1, 1));
      bold(resumen.getCell(1, 2));
    }
  });
  resumen.getColumn(1).width = 22;
  resumen.getColumn(2).width = 48;

  const datos = wb.addWorksheet("Datos");
  if (etat.type_etat === "analysis") {
    writeAnalysis(datos, etat.contenu);
  } else if (etat.type_etat === "performance") {
    writePerformance(datos, etat.contenu);
  } else if (etat.type_etat === "custom") {
    writeCustom(datos, etat.contenu);
  } else {
    writeSummary(datos, etat.contenu);
  }
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

function writeSummary(ws: ExcelJS.Worksheet, contenu: Record<string, unknown>): void {
  bold(ws.getCell(1, 1));
  bold(ws.getCell(1, 2));
  ws.getCell(1, 1).value = "Indicador";
  ws.getCell(1, 2).value = "Valor";
  let row = 2;
  for (const [key, value] of Object.entries(asRecord(contenu.kpis_cles))) {
    ws.getCell(row, 1).value = KPI_LABELS[key] ?? key;
    ws.getCell(row, 2).value = value as ExcelJS.CellValue;
    row += 1;
  }
  row += 1;
  for (const [title, key] of [
    ["Puntos positivos", "points_positifs"],
    ["Puntos de atención", "points_attention"],
    ["Recomendaciones", "recommandations"],
  ] as const) {
    const items = asList(contenu[key]);
    if (!items.length) {
      continue;
    }
    bold(ws.getCell(row, 1));
    ws.getCell(row, 1).value = title;
    row += 1;
    for (const item of items) {
      ws.getCell(row, 1).value = String(item);
      row += 1;
    }
    row += 1;
  }
  if (contenu.resume_executif) {
    bold(ws.getCell(row, 1));
    ws.getCell(row, 1).value = "Resumen ejecutivo";
    row += 1;
    ws.getCell(row, 1).value = String(contenu.resume_executif);
    row += 2;
  }
  const notas = asList(contenu.notas_del_dia);
  if (notas.length) {
    appendNotas(ws, row, notas);
  }
  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 24;
}

function writeAnalysis(ws: ExcelJS.Worksheet, contenu: Record<string, unknown>): void {
  ["Fecha", "Total", "Solucionadas", "Bitrix", "Nota del día"].forEach((header, index) => {
    const cell = ws.getCell(1, index + 1);
    cell.value = header;
    bold(cell);
  });
  const evolution = asList(contenu.evolution);
  evolution.forEach((point, index) => {
    const item = asRecord(point);
    const row = index + 2;
    ws.getCell(row, 1).value = String(item.label ?? "");
    ws.getCell(row, 2).value = Number(item.count ?? 0);
    ws.getCell(row, 3).value = Number(item.solucionadas ?? 0);
    ws.getCell(row, 4).value = Number(item.bitrix ?? 0);
    ws.getCell(row, 5).value = String(item.apreciacion ?? "");
  });
  const tendances = asList(contenu.tendances_principales);
  if (tendances.length) {
    const start = evolution.length + 3;
    bold(ws.getCell(start, 1));
    ws.getCell(start, 1).value = "Tendencias principales";
    tendances.forEach((item, index) => {
      ws.getCell(start + 1 + index, 1).value = String(item);
    });
  }
}

function writePerformance(ws: ExcelJS.Worksheet, contenu: Record<string, unknown>): void {
  ["Usuario", "Total", "Solucionadas", "Bitrix", "Eficacia (%)"].forEach((header, index) => {
    const cell = ws.getCell(1, index + 1);
    cell.value = header;
    bold(cell);
  });
  asList(contenu.activite_utilisateurs).forEach((point, index) => {
    const item = asRecord(point);
    const total = Number(item.total ?? 0);
    const solucionadas = Number(item.solucionadas ?? 0);
    const row = index + 2;
    ws.getCell(row, 1).value = String(item.usuario ?? "");
    ws.getCell(row, 2).value = total;
    ws.getCell(row, 3).value = solucionadas;
    ws.getCell(row, 4).value = Number(item.bitrix ?? 0);
    ws.getCell(row, 5).value = total ? Math.round((solucionadas / total) * 1000) / 10 : 0;
  });
}

function writeCustom(ws: ExcelJS.Worksheet, contenu: Record<string, unknown>): void {
  bold(ws.getCell(1, 1));
  ws.getCell(1, 1).value = "Análisis personalizado";
  const text = String(contenu.analyse_personnalisee ?? "");
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    ws.getCell(index + 2, 1).value = line;
  });
  const notas = asList(contenu.notas_del_dia);
  if (notas.length) {
    appendNotas(ws, lines.length + 3, notas);
  }
  ws.getColumn(1).width = 80;
}
