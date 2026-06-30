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

    function getBlock(incidentId) {
        return document.getElementById('bitrixInfoBlock-' + incidentId);
    }

    function hideLoading(block) {
        const loading = block.querySelector('.bitrix-loading');
        if (loading) loading.style.display = 'none';
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

    function renderBitrixData(block, data) {
        const incidentId = block.getAttribute('data-bitrix-incident-id');
        const compact = isCompact(block);
        hideLoading(block);

        const errEl = document.getElementById('bitrixError-' + incidentId);
        const dataDiv = document.getElementById('bitrixDataDiv-' + incidentId);
        const statusEl = document.getElementById('bitrixStatus-' + incidentId);
        const respEl = document.getElementById('bitrixResponsable-' + incidentId);
        const noConfigEl = block.querySelector('.bitrix-no-config');

        if (errEl) errEl.style.display = 'none';
        if (noConfigEl) noConfigEl.style.display = 'none';

        const emoji = data.status_emoji || '📋';
        const statusClass = compact ? 'text-white' : 'text-dark';
        const respClass = compact ? 'text-white' : 'text-dark';

        if (dataDiv) {
            dataDiv.style.display = '';
            const emojiEl = document.getElementById('bitrixEmoji-' + incidentId);
            if (emojiEl) emojiEl.textContent = emoji;
            if (statusEl) statusEl.textContent = data.status_label;
            if (respEl) respEl.textContent = data.responsible_name;
            return;
        }

        const cardClass = 'bitrix-info-card' + (compact ? ' bitrix-info-card--compact' : '');
        const div = document.createElement('div');
        div.className = cardClass;
        div.id = 'bitrixDataDiv-' + incidentId;
        div.innerHTML =
            '<div class="d-flex align-items-center mb-1">' +
                '<span class="bitrix-emoji me-2" id="bitrixEmoji-' + incidentId + '">' + emoji + '</span>' +
                '<div>' +
                    '<small class="text-uppercase text-muted">Estado de la tarea</small>' +
                    '<div class="fw-semibold ' + statusClass + '" id="bitrixStatus-' + incidentId + '">' + escapeHtml(data.status_label) + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="d-flex align-items-center">' +
                '<span class="me-2">🧑‍💻</span>' +
                '<div>' +
                    '<small class="text-uppercase text-muted">Responsable</small>' +
                    '<div id="bitrixResponsable-' + incidentId + '" class="' + respClass + ' fw-semibold">' + escapeHtml(data.responsible_name) + '</div>' +
                '</div>' +
            '</div>';

        const refreshBtn = block.querySelector('.btn-refresh-bitrix');
        if (refreshBtn) {
            block.insertBefore(div, refreshBtn);
        } else {
            block.appendChild(div);
        }
    }

    function renderBitrixError(block, message) {
        const incidentId = block.getAttribute('data-bitrix-incident-id');
        hideLoading(block);

        const dataDiv = document.getElementById('bitrixDataDiv-' + incidentId);
        const noConfigEl = block.querySelector('.bitrix-no-config');
        if (noConfigEl) noConfigEl.style.display = 'none';
        if (dataDiv) dataDiv.style.display = 'none';

        const displayMessage = formatErrorMessage(message, block);

        let errEl = document.getElementById('bitrixError-' + incidentId);
        if (!errEl) {
            errEl = document.createElement('div');
            errEl.className = 'small text-warning bitrix-error';
            errEl.id = 'bitrixError-' + incidentId;
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

    function fetchBitrixInfo(block) {
        const url = block.getAttribute('data-bitrix-url');
        if (!url) return Promise.resolve();

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
        const block = getBlock(incidentId);
        if (!block) return;

        bitrixNetworkFailed = false;

        const btn = block.querySelector('.btn-refresh-bitrix');
        const icon = btn ? btn.querySelector('i') : null;
        if (btn) btn.disabled = true;
        if (icon) icon.className = 'fas fa-spinner fa-spin';

        fetchBitrixInfo(block).finally(function () {
            if (btn) btn.disabled = false;
            if (icon) icon.className = 'fas fa-sync-alt';
        });
    }

    function initAutoLoad() {
        const blocks = Array.prototype.slice.call(
            document.querySelectorAll('[data-bitrix-auto-load="1"]')
        );
        if (!blocks.length) return;

        blocks.reduce(function (chain, block) {
            return chain.then(function () {
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

    window.refreshBitrixInfo = refreshBitrixInfo;
    window.fetchBitrixInfo = fetchBitrixInfo;
})();
