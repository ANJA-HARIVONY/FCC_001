/**
 * Helper CSRF global pour FCC_001.
 *
 * - Lit le token depuis <meta name="csrf-token"> (injecte par base.html).
 * - Patche window.fetch pour ajouter automatiquement le header X-CSRFToken
 *   sur les requetes mutantes (POST, PUT, PATCH, DELETE) vers la meme origine.
 * - Expose window.fcc.csrfToken() et window.fcc.csrfHeaders() pour les
 *   appels manuels (XMLHttpRequest, fetch verbeux).
 *
 * Aucune dependance externe.
 */
(function () {
    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function isSameOrigin(url) {
        if (!url) {
            return true;
        }
        try {
            const u = new URL(url, window.location.href);
            return u.origin === window.location.origin;
        } catch (_e) {
            return true;
        }
    }

    const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

    if (typeof window.fetch === 'function' && !window.__fccFetchPatched) {
        const originalFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
            init = init || {};
            const method = (init.method || (input && input.method) || 'GET').toUpperCase();
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            if (MUTATING_METHODS.has(method) && isSameOrigin(url)) {
                const token = getCsrfToken();
                if (token) {
                    const headers = new Headers(init.headers || (input && input.headers) || {});
                    if (!headers.has('X-CSRFToken')) {
                        headers.set('X-CSRFToken', token);
                    }
                    init.headers = headers;
                }
            }
            return originalFetch(input, init);
        };
        window.__fccFetchPatched = true;
    }

    window.fcc = window.fcc || {};
    window.fcc.csrfToken = getCsrfToken;
    window.fcc.csrfHeaders = function (extra) {
        const headers = Object.assign({}, extra || {});
        const token = getCsrfToken();
        if (token) {
            headers['X-CSRFToken'] = token;
        }
        return headers;
    };
})();
