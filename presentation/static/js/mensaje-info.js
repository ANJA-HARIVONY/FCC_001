/**
 * Ventana «Mensaje» de la cabecera (admin y superadmin).
 * El texto activo se pinta en el servidor; al guardar se recarga la página.
 */
(function () {
    var openBtn = document.getElementById('btn-mensaje-info');
    var modalEl = document.getElementById('modalMensajeInfo');
    if (!openBtn || !modalEl || typeof bootstrap === 'undefined') {
        return;
    }

    var modal = new bootstrap.Modal(modalEl);
    var texto = document.getElementById('mensaje-info-texto');
    var activo = document.getElementById('mensaje-info-activo');
    var feedback = document.getElementById('mensaje-info-feedback');
    var saveBtn = document.getElementById('btn-guardar-mensaje-info');
    var count = document.getElementById('mensaje-info-count');
    var max = texto && texto.maxLength > 0 ? texto.maxLength : 400;

    function message(name, fallback) {
        return modalEl.getAttribute(name) || fallback;
    }

    function setFeedback(msg, kind) {
        if (!feedback) {
            return;
        }
        if (!msg) {
            feedback.className = 'alert d-none mb-3';
            feedback.textContent = '';
            return;
        }
        feedback.className = 'alert alert-' + kind + ' mb-3';
        feedback.textContent = msg;
    }

    function updateCount() {
        if (!count || !texto) {
            return;
        }
        count.textContent = (texto.value || '').length + ' / ' + max;
    }

    openBtn.addEventListener('click', function () {
        setFeedback('');
        fetch('/api/mensaje-info')
            .then(function (response) {
                return response.json().then(function (data) {
                    return { ok: response.ok, data: data };
                });
            })
            .then(function (result) {
                if (!result.ok || !result.data || result.data.ok === false) {
                    setFeedback(
                        (result.data && result.data.error) || message('data-err-load', 'No se pudo cargar el mensaje.'),
                        'danger'
                    );
                    return;
                }
                texto.value = result.data.texto || '';
                activo.checked = !!result.data.activo;
                updateCount();
            })
            .catch(function () {
                setFeedback(message('data-err-load', 'No se pudo cargar el mensaje.'), 'danger');
            })
            .finally(function () {
                modal.show();
            });
    });

    if (texto) {
        texto.addEventListener('input', updateCount);
    }

    if (!saveBtn) {
        return;
    }

    saveBtn.addEventListener('click', function () {
        var value = (texto.value || '').trim();
        if (activo.checked && !value) {
            setFeedback(message('data-err-empty', 'Escriba un mensaje para activarlo.'), 'warning');
            return;
        }
        if (value.length > max) {
            setFeedback(message('data-err-long', 'El mensaje no puede superar ' + max + ' caracteres.'), 'warning');
            return;
        }
        saveBtn.disabled = true;
        fetch('/api/mensaje-info', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: texto.value, activo: activo.checked }),
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    return { ok: response.ok, data: data };
                });
            })
            .then(function (result) {
                if (!result.ok || !result.data || result.data.ok === false) {
                    setFeedback(
                        (result.data && result.data.error) || message('data-err-save', 'No se pudo guardar el mensaje.'),
                        'danger'
                    );
                    saveBtn.disabled = false;
                    return;
                }
                window.location.reload();
            })
            .catch(function () {
                setFeedback(message('data-err-save', 'No se pudo guardar el mensaje.'), 'danger');
                saveBtn.disabled = false;
            });
    });
})();
