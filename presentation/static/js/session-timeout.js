(function () {
    if (!window.sessionTimeoutConfig || !window.bootstrap) {
        return;
    }

    const config = window.sessionTimeoutConfig;
    const idleTimeoutMs = config.idleTimeoutSeconds * 1000;
    const warningBeforeMs = config.warningBeforeSeconds * 1000;
    const warningDelayMs = Math.max(idleTimeoutMs - warningBeforeMs, 1000);
    const activityPingMinIntervalMs = 60000;
    const modalElement = document.getElementById('session-timeout-modal');
    const stayConnectedBtn = document.getElementById('session-stay-connected');
    const logoutNowBtn = document.getElementById('session-logout-now');
    if (!modalElement || !stayConnectedBtn || !logoutNowBtn) {
        return;
    }

    const timeoutModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
    });

    let warningTimer = null;
    let logoutTimer = null;
    let lastPingAt = 0;

    async function pingSession() {
        try {
            await fetch(config.pingUrl, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
        } catch (_err) {
            // Ignore network errors; server timeout remains authoritative.
        }
    }

    function clearTimers() {
        if (warningTimer) {
            clearTimeout(warningTimer);
        }
        if (logoutTimer) {
            clearTimeout(logoutTimer);
        }
    }

    function startTimers() {
        clearTimers();
        warningTimer = setTimeout(() => {
            timeoutModal.show();
        }, warningDelayMs);
        logoutTimer = setTimeout(() => {
            window.location.href = config.logoutUrl;
        }, idleTimeoutMs);
    }

    function registerActivity() {
        const now = Date.now();
        if (now - lastPingAt >= activityPingMinIntervalMs) {
            lastPingAt = now;
            pingSession();
        }
        startTimers();
    }

    stayConnectedBtn.addEventListener('click', function () {
        timeoutModal.hide();
        lastPingAt = 0;
        registerActivity();
    });

    logoutNowBtn.addEventListener('click', function () {
        window.location.href = config.logoutUrl;
    });

    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach((eventName) => {
        window.addEventListener(eventName, registerActivity, { passive: true });
    });

    startTimers();
})();
