/**
 * CONNEXIA app shell — sidebar, overlay mobile, theme dark/light (L0)
 */
(function () {
    'use strict';

    var STORAGE_THEME = 'sidebarTheme';
    var STORAGE_COLLAPSED = 'sidebarCollapsed';
    var MOBILE_BP = 992;

    function isMobile() {
        return window.matchMedia('(max-width: 991.98px)').matches;
    }

    function getStoredTheme() {
        var theme = localStorage.getItem(STORAGE_THEME);
        return theme === 'light' || theme === 'dark' ? theme : 'dark';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-sidebar-theme', theme);
        document.documentElement.setAttribute('data-app-theme', theme);
        var toggle = document.getElementById('sidebar-theme-toggle');
        if (toggle) {
            var label = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
            toggle.setAttribute('aria-label', label);
            toggle.setAttribute('title', label);
        }
    }

    function setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            return;
        }
        localStorage.setItem(STORAGE_THEME, theme);
        applyTheme(theme);
    }

    function toggleTheme() {
        setTheme(getStoredTheme() === 'dark' ? 'light' : 'dark');
    }

    function isCollapsed() {
        return localStorage.getItem(STORAGE_COLLAPSED) === '1';
    }

    function setCollapsed(collapsed) {
        localStorage.setItem(STORAGE_COLLAPSED, collapsed ? '1' : '0');
        document.body.classList.toggle('closed-sidebar', collapsed && !isMobile());
    }

    function closeMobileSidebar() {
        document.body.classList.remove('sidebar-mobile-open');
        var toggle = document.getElementById('sidebar-toggle');
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
        }
    }

    function openMobileSidebar() {
        document.body.classList.add('sidebar-mobile-open');
        var toggle = document.getElementById('sidebar-toggle');
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'true');
        }
    }

    function toggleSidebar() {
        if (isMobile()) {
            if (document.body.classList.contains('sidebar-mobile-open')) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
            return;
        }
        setCollapsed(!document.body.classList.contains('closed-sidebar'));
    }

    function syncLayoutMode() {
        if (isMobile()) {
            document.body.classList.remove('closed-sidebar');
        } else {
            document.body.classList.remove('sidebar-mobile-open');
            document.body.classList.toggle('closed-sidebar', isCollapsed());
            var toggle = document.getElementById('sidebar-toggle');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        }
    }

    function initThemeToggle() {
        var btn = document.getElementById('sidebar-theme-toggle');
        if (!btn) {
            return;
        }
        btn.addEventListener('click', toggleTheme);
    }

    function initSidebarToggle() {
        var btn = document.getElementById('sidebar-toggle');
        if (!btn) {
            return;
        }
        btn.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            toggleSidebar();
        });
    }

    function initOverlay() {
        var overlay = document.querySelector('.sidebar-mobile-overlay');
        if (!overlay) {
            return;
        }
        overlay.addEventListener('click', closeMobileSidebar);
    }

    function initSidebarLinks() {
        var sidebar = document.getElementById('app-sidebar');
        if (!sidebar) {
            return;
        }
        sidebar.addEventListener('click', function (event) {
            var link = event.target.closest('a');
            if (link && isMobile()) {
                closeMobileSidebar();
            }
        });
    }

    function hoistModalsToBody() {
        /* Backdrop Bootstrap est sur body ; un modal dans .app-main (z-index)
           reste sous le backdrop et devient inutilisable. */
        var nodes = document.querySelectorAll('.app-main .modal, .app-container .modal');
        Array.prototype.forEach.call(nodes, function (modal) {
            if (modal.parentElement !== document.body) {
                document.body.appendChild(modal);
            }
        });
    }

    function init() {
        if (!document.body.classList.contains('app-layout-v2')) {
            return;
        }

        applyTheme(getStoredTheme());
        syncLayoutMode();
        initThemeToggle();
        initSidebarToggle();
        initOverlay();
        initSidebarLinks();
        hoistModalsToBody();

        window.addEventListener('resize', syncLayoutMode);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
