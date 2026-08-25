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

        if (dataDiv) {
            dataDiv.style.display = '';
            const emojiEl = block.querySelector('.bitrix-emoji');
            if (emojiEl) emojiEl.textContent = emoji;
            if (statusEl) statusEl.textContent = data.status_label;
            if (respEl) respEl.textContent = data.responsible_name;
            return;
        }

        const suffix = (block.id || '').replace(/^bitrixInfoBlock-/, '') ||
            (block.getAttribute('data-bitrix-incident-id') || '');
        const cardClass = 'bitrix-info-card' + (compact ? ' bitrix-info-card--compact' : '');
        const div = document.createElement('div');
        div.className = cardClass;
        div.id = 'bitrixDataDiv-' + suffix;
        let innerHtml =
            '<div class="d-flex align-items-center mb-1">' +
                '<span class="bitrix-emoji me-2" id="bitrixEmoji-' + suffix + '">' + emoji + '</span>' +
                '<div>' +
                    '<small class="text-uppercase text-muted">Estado de la tarea</small>' +
                    '<div class="fw-semibold ' + statusClass + '" id="bitrixStatus-' + suffix + '">' + escapeHtml(data.status_label) + '</div>' +
                '</div>' +
            '</div>';
        if (!compact) {
            innerHtml +=
            '<div class="d-flex align-items-center">' +
                '<span class="me-2">🧑‍💻</span>' +
                '<div>' +
                    '<small class="text-uppercase text-muted">Responsable</small>' +
                    '<div id="bitrixResponsable-' + suffix + '" class="' + respClass + ' fw-semibold">' + escapeHtml(data.responsible_name) + '</div>' +
                '</div>' +
            '</div>';
        }
        div.innerHTML = innerHtml;

        const refreshBtn = block.querySelector('.btn-refresh-bitrix');
        if (refreshBtn) {
            block.insertBefore(div, refreshBtn);
        } else {
            block.appendChild(div);
        }
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
})();
