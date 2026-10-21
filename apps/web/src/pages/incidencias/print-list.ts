import { formatIncidentDate, type IncidentListItem } from "./types";

export interface IncidentPrintFilters {
  busqueda: string;
  estado: string;
  usuario: string;
  ciudad: string;
  agencia: string;
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

function statusClass(estado: string): string {
  if (estado === "Solucionadas") return "resolut";
  if (estado === "Pendiente") return "attente";
  return "bitrix";
}

export function buildIncidentsPrintHtml(options: {
  items: IncidentListItem[];
  filters: IncidentPrintFilters;
  generatedAt: string;
  hasActiveFilters: boolean;
}): string {
  const stats = {
    total: options.items.length,
    solucionadas: options.items.filter((item) => item.status === "Solucionadas").length,
    pendientes: options.items.filter((item) => item.status === "Pendiente").length,
    bitrix: options.items.filter((item) => item.status === "Bitrix").length,
  };
  const table =
    options.items.length > 0
      ? `<table><thead><tr>
          <th>ID</th><th>Tipo cliente</th><th>Cliente</th><th>Dirección</th><th>Asunto</th>
          <th>Estado</th><th>Ref. Bitrix</th><th>Usuario</th><th>Fecha/Hora</th>
        </tr></thead><tbody>${options.items
          .map((item) => {
            const tipo = item.client.categoria === "corporativo" ? "Corporativo" : "Particular";
            return `<tr>
              <td><strong>#${item.id}</strong></td>
              <td>${escapeHtml(tipo)}</td>
              <td>${escapeHtml(item.client.nom)}</td>
              <td class="col-direccion">${escapeHtml((item.client.adresse ?? "").replace(/\n/g, " "))}</td>
              <td>${escapeHtml((item.intitule ?? "").replace(/\n/g, " "))}</td>
              <td><span class="status-badge status-${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
              <td>${escapeHtml(item.ref_bitrix ?? "")}</td>
              <td>${escapeHtml(item.operateur.nom)}</td>
              <td class="col-fecha">${escapeHtml(formatIncidentDate(item.date_heure))}</td>
            </tr>`;
          })
          .join("")}</tbody></table>`
      : `<div class="empty-state"><h3>No se encontraron incidencias</h3>${
          options.hasActiveFilters ? "<p>Intente cambiar los filtros de búsqueda.</p>" : ""
        }</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Listado de Incidencias - CONNEXIA</title>
  <style>
    :root { --brand: #c82333; --ink: #212529; --muted: #6c757d; --border: #dee2e6; --zebra: #f8f9fa; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: var(--ink); margin: 24px; font-size: 13px; line-height: 1.45; }
    .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid var(--brand); }
    .header h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--brand); }
    .header .subtitle { margin: 0; font-size: 14px; color: var(--muted); }
    .header .generated { margin: 8px 0 0; font-size: 12px; color: var(--muted); }
    .section-title { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; }
    .filters, .stats-wrap { background: var(--zebra); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; }
    .filters-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 20px; font-size: 12px; }
    .filters-grid span { color: var(--muted); }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .stat-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 12px 8px; text-align: center; }
    .stat-number { font-size: 22px; font-weight: 700; color: var(--brand); line-height: 1.2; }
    .stat-label { font-size: 11px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #343a40; color: #fff; padding: 9px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
    tr:nth-child(even) td { background: var(--zebra); }
    .col-direccion { max-width: 180px; font-size: 11px; color: var(--muted); }
    .col-fecha { white-space: nowrap; }
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .status-resolut { background: #198754; color: #fff; }
    .status-attente { background: #ffc107; color: #333; }
    .status-bitrix { background: #0d6efd; color: #fff; }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px; }
    .empty-state h3 { margin: 0 0 8px; color: var(--ink); }
    .footer { text-align: center; margin-top: 28px; padding-top: 14px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; }
    @media print { body { margin: 12px; font-size: 11px; } .filters, .stats-wrap { break-inside: avoid; } th, td { font-size: 10px; padding: 5px 4px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Listado de Incidencias</h1>
    <p class="subtitle">CONNEXIA — Atención al cliente</p>
    <p class="generated">Generado el: ${escapeHtml(options.generatedAt)}</p>
  </div>
  <div class="filters">
    <h2 class="section-title">Filtros aplicados</h2>
    <div class="filters-grid">
      <div><span>Búsqueda:</span> ${escapeHtml(options.filters.busqueda)}</div>
      <div><span>Estado:</span> ${escapeHtml(options.filters.estado)}</div>
      <div><span>Usuario:</span> ${escapeHtml(options.filters.usuario)}</div>
      <div><span>Ciudad:</span> ${escapeHtml(options.filters.ciudad)}</div>
      <div><span>Agencia:</span> ${escapeHtml(options.filters.agencia)}</div>
      <div><span>Desde:</span> ${escapeHtml(options.filters.desde)}</div>
      <div><span>Hasta:</span> ${escapeHtml(options.filters.hasta)}</div>
      <div><span>Paginación:</span> ${escapeHtml(options.filters.paginacion)}</div>
    </div>
  </div>
  <div class="stats-wrap">
    <h2 class="section-title">Resumen de esta página</h2>
    <div class="stats">
      <div class="stat-card"><div class="stat-number">${stats.total}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-number">${stats.solucionadas}</div><div class="stat-label">Solucionadas</div></div>
      <div class="stat-card"><div class="stat-number">${stats.pendientes}</div><div class="stat-label">Pendientes</div></div>
      <div class="stat-card"><div class="stat-number">${stats.bitrix}</div><div class="stat-label">Bitrix</div></div>
    </div>
  </div>
  ${table}
  <div class="footer"><p><strong>CONNEXIA</strong> — Documento generado automáticamente</p></div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 600); };</script>
</body>
</html>`;
}
