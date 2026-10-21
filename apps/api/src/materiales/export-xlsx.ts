import ExcelJS from "exceljs";

export const SALIDA_EXPORT_COLUMNS = ["ID", "Fecha", "Tipo", "Técnico", "Cliente", "Materiales"] as const;

const COLUMN_WIDTHS = [8, 12, 14, 22, 28, 40];

export interface SalidaExportLinea {
  nombre: string;
  modelo: string | null;
  cantidad: number;
}

export interface SalidaExportSource {
  id: number;
  fecha: string;
  tipo_salida: string;
  tipo_label: string;
  tecnico: { nom: string };
  client: { nom: string } | null;
  lineas_vista: SalidaExportLinea[];
}

export function salidaClienteLabel(item: { client: { nom: string } | null; tipo_salida: string }): string {
  if (item.client) {
    return item.client.nom;
  }
  if (item.tipo_salida === "uso_interno") {
    return "Uso interno";
  }
  return "Uso general";
}

export function salidaMaterialesTabla(lineas: SalidaExportLinea[]): string {
  return lineas.map((linea) => `${linea.nombre}(${linea.modelo || "?"}) x${linea.cantidad}`).join(", ");
}

export function formatSalidaFecha(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return iso;
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function salidasExportFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `salidas_material_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;
}

export function salidaExportRow(item: SalidaExportSource): (string | number)[] {
  return [
    item.id,
    formatSalidaFecha(item.fecha),
    item.tipo_label,
    item.tecnico.nom,
    salidaClienteLabel(item),
    salidaMaterialesTabla(item.lineas_vista),
  ];
}

export async function buildSalidasWorkbook(items: SalidaExportSource[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Salidas");
  sheet.addRow([...SALIDA_EXPORT_COLUMNS]);
  sheet.getRow(1).font = { bold: true };
  for (const item of items) {
    sheet.addRow(salidaExportRow(item));
  }
  sheet.columns.forEach((column, index) => {
    column.width = COLUMN_WIDTHS[index] ?? 18;
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
