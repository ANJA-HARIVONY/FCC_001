import ExcelJS from "exceljs";

export const CLIENT_EXPORT_COLUMNS = [
  "ID",
  "Categoría",
  "Nombre",
  "Teléfono",
  "Dirección",
  "Barrio",
  "Ciudad",
  "IP Router",
  "IP Antea",
  "Incidencias",
] as const;

const COLUMN_WIDTHS = [8, 14, 28, 16, 32, 18, 16, 16, 16, 12];

export interface ClientExportSource {
  id: number;
  categoria: string;
  nom: string;
  telephone: string;
  adresse: string;
  ville: string;
  ip_router: string | null;
  ip_antea: string | null;
  ciudad: { nombre: string } | null;
  incidencias: number;
}

export function categoriaClienteLabel(value: string | null | undefined): string {
  return value === "corporativo" ? "Corporativo" : "Particular";
}

export function clientsExportFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `clientes_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;
}

export function clientExportRow(item: ClientExportSource): (string | number)[] {
  return [
    item.id,
    categoriaClienteLabel(item.categoria),
    item.nom ?? "",
    item.telephone ?? "",
    item.adresse ?? "",
    item.ville ?? "",
    item.ciudad?.nombre ?? "",
    item.ip_router ?? "",
    item.ip_antea ?? "",
    item.incidencias ?? 0,
  ];
}

export async function buildClientsWorkbook(items: ClientExportSource[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Clientes");
  sheet.addRow([...CLIENT_EXPORT_COLUMNS]);
  sheet.getRow(1).font = { bold: true };
  for (const item of items) {
    sheet.addRow(clientExportRow(item));
  }
  COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}
