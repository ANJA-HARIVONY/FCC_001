/**
 * Requêtes AJAX vers /api/incidents/<id>/bitrix-info et rendu du statut Bitrix.
 */
(function () {
    'use strict';

    var bitrixNetworkFailed = false;
    var BITRIX_LIST_UNAVAILABLE = 'Estado no disponible';
    var BITRIX_NETWORK_MARKERS = [
        'name resolution',
        'getaddrinfo',
        'errno -3',
        'errno -2',
        'no se puede contactar con bitrix24',
        'bitrix24_api',
        'tiempo de espera agotado',
        'conexión de red'
    ];

    function getBlocks(incidentId) {
        return Array.prototype.slice.call(
            document.querySelectorAll('.bitrix-info-block[data-bitrix-incident-id="' + incidentId + '"]')
        );
    }

    function isBlockVisible(block) {
        return !!(block && block.getClientRects && block.getClientRects().length);
    }

    function hideLoading(block) {
        const loading = block.querySelector('.bitrix-loading');
        if (loading) loading.style.display = 'none';
    }

    function isIconOnly(block) {
        return block.getAttribute('data-bitrix-icon-only') === '1';
    }

    function isCompact(block) {
        return block.classList.contains('bitrix-info-block--compact');
    }

    function isNetworkErrorMessage(message) {
        const msg = String(message || '').toLowerCase();
        return BITRIX_NETWORK_MARKERS.some(function (marker) {
            return msg.indexOf(marker) !== -1;
        });
    }

    function formatErrorMessage(message, block) {
        if (isCompact(block) && isNetworkErrorMessage(message)) {
            return BITRIX_LIST_UNAVAILABLE;
        }
        return message || 'Error';
    }

    var BITRIX_LABELS_FALLBACK = {
        titulo: 'Estado',
        bitrix: 'Bitrix',
        estado: 'Estado de la tarea',
        responsable: 'Responsable',
        vencimiento: 'Vencimiento',
        prioridad: 'Prioridad',
        cerrada: 'Cerrada el',
        modificacion: 'Última modificación',
        movida: 'Movida',
        movidaEl: 'Movida el',
        retrasada: 'Retrasada desde {tiempo}',
        quedan: 'Quedan {tiempo}'
    };

    function getLabels(block) {
        var raw = block.getAttribute('data-bitrix-labels');
        if (!raw) return BITRIX_LABELS_FALLBACK;
        try {
            return Object.assign({}, BITRIX_LABELS_FALLBACK, JSON.parse(raw));
        } catch (err) {
            return BITRIX_LABELS_FALLBACK;
        }
    }

    function withTiempo(label, value) {
        return escapeHtml(String(label).replace('{tiempo}', value == null ? '' : String(value)));
    }

    function statusRow(iconClass, label, valueHtml, valueId, iconExtraClass) {
        return '' +
        '<div class="bitrix-status-row">' +
            '<i class="ui-icon fas ' + iconClass + (iconExtraClass ? ' ' + iconExtraClass : '') + '" aria-hidden="true"></i>' +
            '<div>' +
                '<small class="text-uppercase text-muted">' + escapeHtml(label) + '</small>' +
                '<div class="fw-semibold text-dark" id="' + valueId + '">' + valueHtml + '</div>' +
            '</div>' +
        '</div>';
    }

    function buildExtrasHtml(data, suffix, labels) {
        var html = '';
        if (data.show_plazo) {
            var plazo = '';
            if (data.deadline_label && data.is_overdue) {
                plazo = ' <span class="badge badge-attente ms-1">' + withTiempo(labels.retrasada, data.plazo_label) + '</span>';
            } else if (data.deadline_label) {
                plazo = ' <small class="text-muted">(' + withTiempo(labels.quedan, data.plazo_label) + ')</small>';
            }
            html += statusRow('fa-calendar-day', labels.vencimiento,
                escapeHtml(data.deadline_label || '—') + plazo, 'bitrixDeadline-' + suffix);
            if (data.priority_label) {
                html += statusRow(data.priority_icon || 'fa-flag', labels.prioridad,
                    escapeHtml(data.priority_label), 'bitrixPriority-' + suffix);
            }
        } else if (data.is_closed && data.closed_label) {
            html += statusRow('fa-flag-checkered', labels.cerrada,
                escapeHtml(data.closed_label), 'bitrixClosed-' + suffix);
        }
        if (data.changed_label) {
            var movida = data.moved_recently
                ? ' <span class="badge badge-bitrix ms-1" title="' + escapeHtml(labels.movidaEl + ' ' + data.moved_label) + '">' +
                    escapeHtml(labels.movida) + '</span>'
                : '';
            html += statusRow('fa-history', labels.modificacion,
                escapeHtml(data.changed_label) + movida, 'bitrixChanged-' + suffix);
        }
        return html;
    }

    function replaceExtras(block, data, suffix) {
        var existing = block.querySelector('.bitrix-extras');
        var html = buildExtrasHtml(data, suffix, getLabels(block));
        if (!html) {
            if (existing) existing.remove();
            return;
        }
        var wrapper = existing || document.createElement('div');
        wrapper.className = 'bitrix-extras';
        wrapper.innerHTML = html;
        if (!existing) {
            var host = block.querySelector('.bitrix-status-card .card-body') ||
                block.querySelector('.bitrix-info-card');
            if (host) host.appendChild(wrapper);
        }
    }

    function updateStatusIcon(block, data) {
        var iconEl = block.querySelector('.bitrix-status-icon');
        if (iconEl && data.status_icon) {
            iconEl.className = 'ui-icon fas ' + data.status_icon + ' bitrix-status-icon';
        }
    }

    function renderBitrixData(block, data) {
        const compact = isCompact(block);
        const iconOnly = isIconOnly(block);
        hideLoading(block);

        const errEl = block.querySelector('.bitrix-error');
        const dataDiv = block.querySelector('.bitrix-info-card');
        const statusEl = block.querySelector('[id^="bitrixStatus-"]');
        const respEl = block.querySelector('[id^="bitrixResponsable-"]');
        const noConfigEl = block.querySelector('.bitrix-no-config');

        if (errEl) errEl.style.display = 'none';
        if (noConfigEl) noConfigEl.style.display = 'none';

        const emoji = data.status_emoji || '📋';

        if (iconOnly) {
            let emojiEl = block.querySelector('.bitrix-emoji-inline');
            if (!emojiEl) {
                emojiEl = document.createElement('span');
                emojiEl.className = 'bitrix-emoji-inline';
                block.appendChild(emojiEl);
            }
            emojiEl.textContent = emoji;
            emojiEl.title = data.status_label || '';
            return;
        }

        const statusClass = compact ? 'text-white' : 'text-dark';
        const respClass = compact ? 'text-white' : 'text-dark';
        const suffix = (block.id || '').replace(/^bitrixInfoBlock-/, '') ||
            (block.getAttribute('data-bitrix-incident-id') || '');

        if (dataDiv) {
            dataDiv.style.display = '';
            const emojiEl = block.querySelector('.bitrix-emoji');
            if (emojiEl) emojiEl.textContent = emoji;
            if (statusEl) statusEl.textContent = data.status_label;
            if (respEl) respEl.textContent = data.responsible_name;
            if (!compact) {
                updateStatusIcon(block, data);
                replaceExtras(block, data, suffix);
            }
            return;
        }

        const div = document.createElement('div');
        div.id = 'bitrixDataDiv-' + suffix;

        if (compact) {
            div.className = 'bitrix-info-card bitrix-info-card--compact';
            div.innerHTML =
            '<div class="d-flex align-items-center mb-1">' +
                '<span class="bitrix-emoji me-2" id="bitrixEmoji-' + suffix + '">' + emoji + '</span>' +
                '<div>' +
                    '<small class="text-uppercase text-muted">Estado de la tarea</small>' +
                    '<div class="fw-semibold ' + statusClass + '" id="bitrixStatus-' + suffix + '">' + escapeHtml(data.status_label) + '</div>' +
                '</div>' +
            '</div>';
            const compactRefresh = block.querySelector('.btn-refresh-bitrix');
            if (compactRefresh) {
                block.insertBefore(div, compactRefresh);
            } else {
                block.appendChild(div);
            }
            return;
        }

        const labels = getLabels(block);
        const taskUrl = block.getAttribute('data-bitrix-task-url') || '';
        const ref = block.getAttribute('data-bitrix-ref') || '';
        div.className = 'card bitrix-info-card bitrix-status-card status-detail-card shadow-sm';
        let header = '';
        if (taskUrl && ref) {
            header =
            '<div class="card-header d-flex align-items-center justify-content-between">' +
                '<span class="d-inline-flex align-items-center fw-semibold">' +
                    '<i class="ui-icon fas fa-info-circle me-2" aria-hidden="true"></i>' + escapeHtml(labels.titulo) +
                    ' <span class="badge badge-bitrix ms-2">' + escapeHtml(labels.bitrix) + '</span>' +
                '</span>' +
                '<a href="' + escapeHtml(taskUrl) + '" target="_blank" rel="noopener noreferrer" class="text-decoration-none">' +
                    escapeHtml(ref) + ' <i class="fas fa-external-link-alt"></i>' +
                '</a>' +
            '</div>';
        }
        let body =
            statusRow(data.status_icon || 'fa-tasks', labels.estado,
                escapeHtml(data.status_label), 'bitrixStatus-' + suffix, 'bitrix-status-icon') +
            statusRow('fa-user-tie', labels.responsable,
                escapeHtml(data.responsible_name), 'bitrixResponsable-' + suffix);
        const extrasHtml = buildExtrasHtml(data, suffix, labels);
        if (extrasHtml) {
            body += '<div class="bitrix-extras">' + extrasHtml + '</div>';
        }
        const refreshBtn = block.querySelector('.btn-refresh-bitrix');
        div.innerHTML = header + '<div class="card-body">' + body + '</div>';
        if (refreshBtn) {
            const footerEl = document.createElement('div');
            footerEl.className = 'card-footer bg-transparent py-2';
            refreshBtn.classList.remove('mt-1');
            footerEl.appendChild(refreshBtn);
            div.appendChild(footerEl);
        }
        block.appendChild(div);
    }

    function renderBitrixError(block, message) {
        hideLoading(block);

        if (isIconOnly(block)) {
            let emojiEl = block.querySelector('.bitrix-emoji-inline');
            if (!emojiEl) {
                emojiEl = document.createElement('span');
                emojiEl.className = 'bitrix-emoji-inline text-white-50';
                block.appendChild(emojiEl);
            }
            emojiEl.textContent = '⚠️';
            emojiEl.title = formatErrorMessage(message, block);
            return;
        }

        const dataDiv = block.querySelector('.bitrix-info-card');
        const noConfigEl = block.querySelector('.bitrix-no-config');
        if (noConfigEl) noConfigEl.style.display = 'none';
        if (dataDiv) dataDiv.style.display = 'none';

        const displayMessage = formatErrorMessage(message, block);
        const suffix = (block.id || '').replace(/^bitrixInfoBlock-/, '') ||
            (block.getAttribute('data-bitrix-incident-id') || '');

        let errEl = block.querySelector('.bitrix-error');
        if (!errEl) {
            errEl = document.createElement('div');
            errEl.className = 'small text-warning bitrix-error';
            errEl.id = 'bitrixError-' + suffix;
            const refreshBtn = block.querySelector('.btn-refresh-bitrix');
            if (refreshBtn) {
                block.insertBefore(errEl, refreshBtn);
            } else {
                block.appendChild(errEl);
            }
        }
        errEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + escapeHtml(displayMessage);
        errEl.style.display = 'block';
        if (isCompact(block)) {
            errEl.title = message || displayMessage;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    function fetchBitrixInfo(block, force) {
        let url = block.getAttribute('data-bitrix-url');
        if (!url) return Promise.resolve();
        if (force) {
            url += (url.indexOf('?') >= 0 ? '&' : '?') + 'force=1';
        }

        if (bitrixNetworkFailed && isCompact(block)) {
            renderBitrixError(block, BITRIX_LIST_UNAVAILABLE);
            return Promise.resolve();
        }

        return fetch(url, { headers: { 'Accept': 'application/json' } })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.ok && data.data) {
                    renderBitrixData(block, data.data);
                    return;
                }
                const errorMessage = data.error || 'Error';
                if (isNetworkErrorMessage(errorMessage)) {
                    bitrixNetworkFailed = true;
                }
                renderBitrixError(block, errorMessage);
            })
            .catch(function (err) {
                bitrixNetworkFailed = true;
                renderBitrixError(block, err.message);
            });
    }

    function refreshBitrixInfo(incidentId) {
        const blocks = getBlocks(incidentId);
        const block = blocks.filter(isBlockVisible)[0] || blocks[0];
        if (!block) return;

        bitrixNetworkFailed = false;

        const btn = block.querySelector('.btn-refresh-bitrix');
        const icon = btn ? btn.querySelector('i') : null;
        if (btn) btn.disabled = true;
        if (icon) icon.className = 'fas fa-spinner fa-spin';

        fetchBitrixInfo(block, true).finally(function () {
            if (btn) btn.disabled = false;
            if (icon) icon.className = 'fas fa-sync-alt';
        });
    }

    function initAutoLoad() {
        const blocks = Array.prototype.slice.call(
            document.querySelectorAll('[data-bitrix-auto-load="1"]')
        ).filter(function (block) {
            return isBlockVisible(block) && block.getAttribute('data-bitrix-loaded') !== '1';
        });
        if (!blocks.length) return;

        blocks.reduce(function (chain, block) {
            return chain.then(function () {
                block.setAttribute('data-bitrix-loaded', '1');
                if (bitrixNetworkFailed && isCompact(block)) {
                    renderBitrixError(block, BITRIX_LIST_UNAVAILABLE);
                    return Promise.resolve();
                }
                return fetchBitrixInfo(block);
            });
        }, Promise.resolve());
    }

    document.addEventListener('click', function (event) {
        const btn = event.target.closest('.btn-refresh-bitrix');
        if (!btn) return;
        const incidentId = btn.getAttribute('data-bitrix-incident-id');
        if (incidentId) refreshBitrixInfo(incidentId);
    });

    document.addEventListener('DOMContentLoaded', initAutoLoad);

    if (window.matchMedia) {
        window.matchMedia('(max-width: 991.98px)').addEventListener('change', function () {
            initAutoLoad();
        });
    }

    window.refreshBitrixInfo = refreshBitrixInfo;
    window.fetchBitrixInfo = fetchBitrixInfo;
    window.initBitrixAutoLoad = initAutoLoad;
})();
