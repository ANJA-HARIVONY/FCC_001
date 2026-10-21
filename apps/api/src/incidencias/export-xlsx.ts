import ExcelJS from "exceljs";

export const INCIDENT_EXPORT_COLUMNS = [
  "ID",
  "Tipo cliente",
  "Cliente",
  "Dirección",
  "Asunto",
  "Estado",
  "Ref. Bitrix",
  "Usuario",
  "Fecha/Hora",
] as const;

const COLUMN_WIDTHS = [8, 14, 28, 32, 36, 14, 12, 22, 18];

export interface IncidentExportSource {
  id: number;
  intitule: string;
  status: string;
  ref_bitrix: string | null;
  date_heure: string;
  client: { nom: string; adresse: string; categoria: string };
  operateur: { nom: string };
}

export function categoriaClienteLabel(value: string | null | undefined): string {
  return value === "corporativo" ? "Corporativo" : "Particular";
}

export function formatExportDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function incidentsExportFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `incidencias_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;
}

export function incidentExportRow(item: IncidentExportSource): (string | number)[] {
  return [
    item.id,
    categoriaClienteLabel(item.client.categoria),
    item.client.nom,
    item.client.adresse ?? "",
    item.intitule ?? "",
    item.status ?? "",
    item.ref_bitrix ?? "",
    item.operateur.nom ?? "",
    formatExportDate(item.date_heure),
  ];
}

export async function buildIncidentsWorkbook(items: IncidentExportSource[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Incidencias");
  sheet.addRow([...INCIDENT_EXPORT_COLUMNS]);
  sheet.getRow(1).font = { bold: true };
  for (const item of items) {
    sheet.addRow(incidentExportRow(item));
  }
  COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}
