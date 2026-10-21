import { CATEGORIA_LABELS, type ClientItem } from "./types";

export interface ClientPrintFilters {
  busqueda: string;
  barrio: string;
  ciudad: string;
  categoria: string;
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

export function buildClientsPrintHtml(options: {
  items: ClientItem[];
  filters: ClientPrintFilters;
  generatedAt?: string;
  hasActiveFilters: boolean;
}): string {
  const generatedAt = options.generatedAt ?? formatNow(new Date());
  const stats = {
    total: options.items.length,
    corporativo: options.items.filter((item) => item.categoria === "corporativo").length,
    particular: options.items.filter((item) => item.categoria !== "corporativo").length,
  };
  const table =
    options.items.length > 0
      ? `<table><thead><tr>
          <th>ID</th><th>Categoría</th><th>Nombre</th><th>Teléfono</th><th>Dirección</th>
          <th>Barrio</th><th>Ciudad</th><th>IP Router</th><th>IP Antea</th><th>Incidencias</th>
        </tr></thead><tbody>${options.items
          .map((item) => {
            const categoria = CATEGORIA_LABELS[item.categoria] ?? "Particular";
            return `<tr>
              <td><strong>#${item.id}</strong></td>
              <td>${escapeHtml(categoria)}</td>
              <td>${escapeHtml(item.nom)}</td>
              <td>${escapeHtml(item.telephone ?? "")}</td>
              <td class="col-direccion">${escapeHtml((item.adresse ?? "").replace(/\n/g, " "))}</td>
              <td>${escapeHtml(item.ville ?? "")}</td>
              <td>${escapeHtml(item.ciudad?.nombre ?? "")}</td>
              <td>${escapeHtml(item.ip_router ?? "")}</td>
              <td>${escapeHtml(item.ip_antea ?? "")}</td>
              <td>${item.incidencias}</td>
            </tr>`;
          })
          .join("")}</tbody></table>`
      : `<div class="empty-state"><h3>No se encontraron clientes</h3>${
          options.hasActiveFilters ? "<p>Intente cambiar los filtros de búsqueda.</p>" : ""
        }</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Listado de Clientes - CONNEXIA</title>
  <style>
    :root { --brand: #c82333; --ink: #212529; --muted: #6c757d; --border: #dee2e6; --zebra: #f8f9fa; }
    * { box-sizing: border-box; }
    @page { size: landscape; }
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: var(--ink); margin: 24px; font-size: 12px; line-height: 1.45; }
    .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid var(--brand); }
    .header h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--brand); }
    .header .subtitle { margin: 0; font-size: 14px; color: var(--muted); }
    .header .generated { margin: 8px 0 0; font-size: 12px; color: var(--muted); }
    .section-title { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; }
    .filters, .stats-wrap { background: var(--zebra); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; }
    .filters-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 20px; font-size: 12px; }
    .filters-grid span { color: var(--muted); }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stat-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 12px 8px; text-align: center; }
    .stat-number { font-size: 22px; font-weight: 700; color: var(--brand); line-height: 1.2; }
    .stat-label { font-size: 11px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #343a40; color: #fff; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 6px; border-bottom: 1px solid var(--border); vertical-align: top; font-size: 11px; }
    tr:nth-child(even) td { background: var(--zebra); }
    .col-direccion { max-width: 180px; color: var(--muted); }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px; }
    .empty-state h3 { margin: 0 0 8px; color: var(--ink); }
    .footer { text-align: center; margin-top: 28px; padding-top: 14px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; }
    @media print { body { margin: 12px; font-size: 10px; } .filters, .stats-wrap { break-inside: avoid; } th, td { font-size: 9px; padding: 4px 3px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Listado de Clientes</h1>
    <p class="subtitle">CONNEXIA — Atención al cliente</p>
    <p class="generated">Generado el: ${escapeHtml(generatedAt)}</p>
  </div>
  <div class="filters">
    <h2 class="section-title">Filtros aplicados</h2>
    <div class="filters-grid">
      <div><span>Búsqueda:</span> ${escapeHtml(options.filters.busqueda)}</div>
      <div><span>Barrio:</span> ${escapeHtml(options.filters.barrio)}</div>
      <div><span>Ciudad:</span> ${escapeHtml(options.filters.ciudad)}</div>
      <div><span>Categoría:</span> ${escapeHtml(options.filters.categoria)}</div>
      <div><span>Paginación:</span> ${escapeHtml(options.filters.paginacion)}</div>
    </div>
  </div>
  <div class="stats-wrap">
    <h2 class="section-title">Resumen de esta página</h2>
    <div class="stats">
      <div class="stat-card"><div class="stat-number">${stats.total}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-number">${stats.corporativo}</div><div class="stat-label">Corporativo</div></div>
      <div class="stat-card"><div class="stat-number">${stats.particular}</div><div class="stat-label">Particular</div></div>
    </div>
  </div>
  ${table}
  <div class="footer"><p><strong>CONNEXIA</strong> — Documento generado automáticamente</p></div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 600); };</script>
</body>
</html>`;
}
