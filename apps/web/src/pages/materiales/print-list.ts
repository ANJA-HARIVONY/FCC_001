import { formatSalidaFecha, salidaClienteLabel, type SalidaListItem } from "./types";

export interface SalidaPrintFilters {
  busqueda: string;
  tipo: string;
  tecnico: string;
  material: string;
  desde: string;
  hasta: string;
  paginacion: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNow(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildSalidasPrintHtml(options: {
  items: SalidaListItem[];
  filters: SalidaPrintFilters;
  generatedAt?: string;
  hasActiveFilters: boolean;
}): string {
  const generatedAt = options.generatedAt ?? formatNow(new Date());
  const stats = {
    total: options.items.length,
    usoInterno: options.items.filter((item) => item.tipo_salida === "uso_interno").length,
    incidencia: options.items.filter((item) => item.tipo_salida === "incidencia").length,
    instalacion: options.items.filter((item) => item.tipo_salida === "instalacion").length,
  };
  const rows = options.items
    .map(
      (item) => `<tr>
        <td><strong>#${item.id}</strong></td>
        <td>${escapeHtml(formatSalidaFecha(item.fecha))}</td>
        <td>${escapeHtml(item.tipo_label)}</td>
        <td>${escapeHtml(item.tecnico.nom)}</td>
        <td>${escapeHtml(salidaClienteLabel(item))}</td>
        <td>${escapeHtml(item.materiales)}</td>
      </tr>`,
    )
    .join("");
  const table =
    options.items.length > 0
      ? `<table><thead><tr>
          <th>ID</th><th>Fecha</th><th>Tipo</th><th>Técnico</th><th>Cliente</th><th>Materiales</th>
        </tr></thead><tbody>${rows}</tbody></table>`
      : `<div class="empty-state"><h3>No se encontraron salidas</h3>${
          options.hasActiveFilters ? "<p>Intente cambiar los filtros de búsqueda.</p>" : ""
        }</div>`;
  const filters = options.filters;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Listado de Salidas de material - CONNEXIA</title>
  <style>
    :root { --brand: #c82333; --ink: #212529; --muted: #6c757d; --border: #dee2e6; --zebra: #f8f9fa; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; color: var(--ink); margin: 24px; font-size: 13px; line-height: 1.45; }
    .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid var(--brand); }
    .header h1 { margin: 0 0 6px; font-size: 22px; text-transform: uppercase; color: var(--brand); }
    .header .subtitle, .header .generated { margin: 8px 0 0; font-size: 12px; color: var(--muted); }
    .section-title { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; }
    .filters, .stats-wrap { background: var(--zebra); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; }
    .filters-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 20px; font-size: 12px; }
    .filters-grid span { color: var(--muted); }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .stat-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 12px 8px; text-align: center; }
    .stat-number { font-size: 22px; font-weight: 700; color: var(--brand); }
    .stat-label { font-size: 11px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #343a40; color: #fff; padding: 9px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
    tr:nth-child(even) td { background: var(--zebra); }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px; }
    .footer { text-align: center; margin-top: 28px; padding-top: 14px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Listado de Salidas de material</h1>
    <p class="subtitle">CONNEXIA — Atención al cliente</p>
    <p class="generated">Generado el: ${escapeHtml(generatedAt)}</p>
  </div>
  <div class="filters">
    <h2 class="section-title">Filtros aplicados</h2>
    <div class="filters-grid">
      <div><span>Búsqueda:</span> ${escapeHtml(filters.busqueda)}</div>
      <div><span>Tipo:</span> ${escapeHtml(filters.tipo)}</div>
      <div><span>Técnico:</span> ${escapeHtml(filters.tecnico)}</div>
      <div><span>Material:</span> ${escapeHtml(filters.material)}</div>
      <div><span>Desde:</span> ${escapeHtml(filters.desde)}</div>
      <div><span>Hasta:</span> ${escapeHtml(filters.hasta)}</div>
      <div><span>Paginación:</span> ${escapeHtml(filters.paginacion)}</div>
    </div>
  </div>
  <div class="stats-wrap">
    <h2 class="section-title">Resumen de esta página</h2>
    <div class="stats">
      <div class="stat-card"><div class="stat-number">${stats.total}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-number">${stats.usoInterno}</div><div class="stat-label">Uso interno</div></div>
      <div class="stat-card"><div class="stat-number">${stats.incidencia}</div><div class="stat-label">Incidencia</div></div>
      <div class="stat-card"><div class="stat-number">${stats.instalacion}</div><div class="stat-label">Instalación</div></div>
    </div>
  </div>
  ${table}
  <div class="footer"><p><strong>CONNEXIA</strong> — Documento generado automáticamente</p></div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 600); };</script>
</body>
</html>`;
}

export function printSalidasList(html: string): "ok" | "blocked" {
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    return "blocked";
  }
  printWindow.document.write(html);
  printWindow.document.close();
  return "ok";
}
