// Toast de confirmación (español)
function afficherToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = [
        'position: fixed',
        'top: 20px',
        'right: 20px',
        'background: #198754',
        'color: white',
        'padding: 14px 18px',
        'border-radius: 8px',
        'box-shadow: 0 4px 12px rgba(0,0,0,0.15)',
        'z-index: 9999',
        'font-family: "Segoe UI", Arial, sans-serif',
        'font-size: 14px',
        'max-width: 320px',
        'word-wrap: break-word',
    ].join(';');

    toast.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <span>${message}</span>
            <button type="button" onclick="this.parentElement.parentElement.remove()"
                    style="background:none;border:none;color:white;cursor:pointer;font-size:18px;line-height:1;">×</button>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(function() {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function selectedOptionLabel(selectId, defaultLabel) {
    const select = document.getElementById(selectId);
    if (!select || !select.value) {
        return defaultLabel;
    }
    return select.selectedOptions[0] ? select.selectedOptions[0].text.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ().,\-/@]/gu, '').trim() : defaultLabel;
}

function formatDateTimeEs(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function collectIncidentsFromTable() {
    const rows = document.querySelectorAll('tr.incident-export-row');
    return Array.from(rows).map(function(row) {
        return {
            id: row.getAttribute('data-export-id') || '',
            tipo: row.getAttribute('data-export-tipo') || '',
            cliente: row.getAttribute('data-export-cliente') || '',
            direccion: row.getAttribute('data-export-direccion') || '',
            asunto: row.getAttribute('data-export-asunto') || '',
            estado: row.getAttribute('data-export-estado') || '',
            bitrix: row.getAttribute('data-export-bitrix') || '',
            usuario: row.getAttribute('data-export-usuario') || '',
            fecha: row.getAttribute('data-export-fecha') || '',
        };
    });
}

function statusClass(estado) {
    if (estado === 'Solucionadas') return 'resolut';
    if (estado === 'Pendiente') return 'attente';
    return 'bitrix';
}

function buildPrintHtml(options) {
    const {
        incidents,
        filters,
        stats,
        generatedAt,
        hasActiveFilters,
    } = options;

    let tableContent = '';
    if (incidents.length > 0) {
        const bodyRows = incidents.map(function(inc) {
            const estadoClass = statusClass(inc.estado);
            return '<tr>'
                + `<td><strong>${escapeHtml(inc.id)}</strong></td>`
                + `<td>${escapeHtml(inc.tipo)}</td>`
                + `<td>${escapeHtml(inc.cliente)}</td>`
                + `<td class="col-direccion">${escapeHtml(inc.direccion)}</td>`
                + `<td>${escapeHtml(inc.asunto)}</td>`
                + `<td><span class="status-badge status-${estadoClass}">${escapeHtml(inc.estado)}</span></td>`
                + `<td>${escapeHtml(inc.bitrix)}</td>`
                + `<td>${escapeHtml(inc.usuario)}</td>`
                + `<td class="col-fecha">${escapeHtml(inc.fecha)}</td>`
                + '</tr>';
        }).join('');

        tableContent = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tipo cliente</th>
                        <th>Cliente</th>
                        <th>Dirección</th>
                        <th>Asunto</th>
                        <th>Estado</th>
                        <th>Ref. Bitrix</th>
                        <th>Usuario</th>
                        <th>Fecha/Hora</th>
                    </tr>
                </thead>
                <tbody>${bodyRows}</tbody>
            </table>
        `;
    } else {
        const hint = hasActiveFilters
            ? '<p>Intente cambiar los filtros de búsqueda.</p>'
            : '';
        tableContent = `
            <div class="empty-state">
                <h3>No se encontraron incidencias</h3>
                ${hint}
            </div>
        `;
    }

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Listado de Incidencias - CONNEXIA</title>
    <style>
        :root {
            --brand: #c82333;
            --ink: #212529;
            --muted: #6c757d;
            --border: #dee2e6;
            --zebra: #f8f9fa;
        }
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            color: var(--ink);
            margin: 24px;
            font-size: 13px;
            line-height: 1.45;
        }
        .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 3px solid var(--brand);
        }
        .header h1 {
            margin: 0 0 6px;
            font-size: 22px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--brand);
        }
        .header .subtitle {
            margin: 0;
            font-size: 14px;
            color: var(--muted);
        }
        .header .generated {
            margin: 8px 0 0;
            font-size: 12px;
            color: var(--muted);
        }
        .section-title {
            margin: 0 0 10px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--ink);
        }
        .filters, .stats-wrap {
            background: var(--zebra);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 18px;
        }
        .filters-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px 20px;
            font-size: 12px;
        }
        .filters-grid span { color: var(--muted); }
        .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }
        .stat-card {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 8px;
            text-align: center;
        }
        .stat-number {
            font-size: 22px;
            font-weight: 700;
            color: var(--brand);
            line-height: 1.2;
        }
        .stat-label {
            font-size: 11px;
            text-transform: uppercase;
            color: var(--muted);
            margin-top: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background: #343a40;
            color: #fff;
            padding: 9px 8px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
        }
        tr:nth-child(even) td { background: var(--zebra); }
        .col-direccion { max-width: 180px; font-size: 11px; color: var(--muted); }
        .col-fecha { white-space: nowrap; }
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        .status-resolut { background: #198754; color: #fff; }
        .status-attente { background: #ffc107; color: #333; }
        .status-bitrix { background: #0d6efd; color: #fff; }
        .empty-state {
            text-align: center;
            padding: 48px 16px;
            color: var(--muted);
            border: 1px dashed var(--border);
            border-radius: 8px;
        }
        .empty-state h3 { margin: 0 0 8px; color: var(--ink); }
        .footer {
            text-align: center;
            margin-top: 28px;
            padding-top: 14px;
            border-top: 1px solid var(--border);
            color: var(--muted);
            font-size: 11px;
        }
        @media print {
            body { margin: 12px; font-size: 11px; }
            .filters, .stats-wrap { break-inside: avoid; }
            th, td { font-size: 10px; padding: 5px 4px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Listado de Incidencias</h1>
        <p class="subtitle">CONNEXIA — Atención al cliente</p>
        <p class="generated">Generado el: ${escapeHtml(generatedAt)}</p>
    </div>

    <div class="filters">
        <h2 class="section-title">Filtros aplicados</h2>
        <div class="filters-grid">
            <div><span>Búsqueda:</span> ${escapeHtml(filters.busqueda)}</div>
            <div><span>Estado:</span> ${escapeHtml(filters.estado)}</div>
            <div><span>Usuario:</span> ${escapeHtml(filters.usuario)}</div>
            <div><span>Ciudad:</span> ${escapeHtml(filters.ciudad)}</div>
            <div><span>Agencia:</span> ${escapeHtml(filters.agencia)}</div>
            <div><span>Desde:</span> ${escapeHtml(filters.desde)}</div>
            <div><span>Hasta:</span> ${escapeHtml(filters.hasta)}</div>
            <div><span>Paginación:</span> ${escapeHtml(filters.paginacion)}</div>
        </div>
    </div>

    <div class="stats-wrap">
        <h2 class="section-title">Resumen de esta página</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.solucionadas}</div>
                <div class="stat-label">Solucionadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.pendientes}</div>
                <div class="stat-label">Pendientes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.bitrix}</div>
                <div class="stat-label">Bitrix</div>
            </div>
        </div>
    </div>

    ${tableContent}

    <div class="footer">
        <p><strong>CONNEXIA</strong> — Documento generado automáticamente</p>
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 600);
        };
    <\/script>
</body>
</html>`;
}

function printReport() {
    try {
        const searchQuery = document.getElementById('search') ? document.getElementById('search').value.trim() : '';
        const statusFilter = document.getElementById('status') ? document.getElementById('status').value : '';
        const dateFrom = document.getElementById('date_from') ? document.getElementById('date_from').value : '';
        const dateTo = document.getElementById('date_to') ? document.getElementById('date_to').value : '';

        const meta = document.getElementById('incidents-export-meta');
        const page = meta ? meta.getAttribute('data-page') || '1' : '1';
        const pages = meta ? meta.getAttribute('data-pages') || '1' : '1';
        const perPage = meta ? meta.getAttribute('data-per-page') || '50' : '50';

        const incidents = collectIncidentsFromTable();
        const stats = {
            total: incidents.length,
            solucionadas: incidents.filter(function(i) { return i.estado === 'Solucionadas'; }).length,
            pendientes: incidents.filter(function(i) { return i.estado === 'Pendiente'; }).length,
            bitrix: incidents.filter(function(i) { return i.estado === 'Bitrix'; }).length,
        };

        const hasActiveFilters = Boolean(
            searchQuery || statusFilter || dateFrom || dateTo
            || (document.getElementById('operateur') && document.getElementById('operateur').value)
            || (document.getElementById('ciudad') && document.getElementById('ciudad').value)
            || (document.getElementById('agencia') && document.getElementById('agencia').value)
        );

        const filters = {
            busqueda: searchQuery || '(ninguna)',
            estado: statusFilter || 'Todos',
            usuario: selectedOptionLabel('operateur', 'Todos'),
            ciudad: selectedOptionLabel('ciudad', 'Todas'),
            agencia: selectedOptionLabel('agencia', 'Todas'),
            desde: dateFrom || 'Todas',
            hasta: dateTo || 'Todas',
            paginacion: `Página ${page} de ${pages} — ${perPage} registros por página`,
        };

        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) {
            alert('No se pudo abrir la ventana de impresión. Compruebe que las ventanas emergentes no estén bloqueadas.');
            return;
        }

        const printContent = buildPrintHtml({
            incidents: incidents,
            filters: filters,
            stats: stats,
            generatedAt: formatDateTimeEs(new Date()),
            hasActiveFilters: hasActiveFilters,
        });

        printWindow.document.write(printContent);
        printWindow.document.close();
        afficherToast('Listado de impresión generado correctamente');
    } catch (error) {
        console.error('Error en printReport:', error);
        alert('Error al generar el listado: ' + error.message);
    }
}
