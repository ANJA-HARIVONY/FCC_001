/**
 * Ficha cliente — geolocalización, previsualización y límite de fotos.
 */
(function () {
    const root = document.getElementById('instalacionSection');
    if (!root) return;

    const maxFotos = parseInt(root.dataset.maxFotos || '10', 10);
    const fotosActuales = parseInt(root.dataset.fotosActuales || '0', 10);
    const fileInput = document.getElementById('fotos');
    const preview = document.getElementById('fotosPreview');
    const limitAlert = document.getElementById('fotosLimitAlert');
    const sectionAlert = document.getElementById('instalacionAlert');
    const geoBtn = document.getElementById('usarUbicacionBtn');
    const latInput = document.getElementById('latitud');
    const lngInput = document.getElementById('longitud');
    const pairInput = document.getElementById('gps_pair');
    const fotosForm = document.getElementById('clientFotosForm');
    const deleteForm = document.getElementById('eliminarFotoForm');

    function showAlert(el, message) {
        if (!el) return;
        el.textContent = message || '';
        el.classList.toggle('d-none', !message);
    }

    function showLimit(message) {
        showAlert(limitAlert || sectionAlert, message);
    }

    function showGeo(message) {
        showAlert(sectionAlert || limitAlert, message);
    }

    function formatCoord(value) {
        return Number(value).toFixed(7);
    }

    if (pairInput && latInput && lngInput) {
        pairInput.addEventListener('change', function () {
            const raw = (pairInput.value || '').replace(';', ',');
            const parts = raw.split(',').map(function (p) { return p.trim(); }).filter(Boolean);
            if (parts.length === 2) {
                latInput.value = parts[0];
                lngInput.value = parts[1];
            }
        });
    }

    if (geoBtn && latInput && lngInput) {
        geoBtn.addEventListener('click', function () {
            if (!navigator.geolocation) {
                showGeo('La geolocalización no está disponible en este navegador.');
                return;
            }
            geoBtn.disabled = true;
            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    latInput.value = formatCoord(pos.coords.latitude);
                    lngInput.value = formatCoord(pos.coords.longitude);
                    showGeo('');
                    geoBtn.disabled = false;
                },
                function () {
                    showGeo('No se pudo obtener la ubicación. Permita el acceso o introdúzcala manualmente.');
                    geoBtn.disabled = false;
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', function () {
            const selected = Array.from(fileInput.files || []);
            const remaining = Math.max(0, maxFotos - fotosActuales);
            if (selected.length > remaining) {
                showLimit('Solo puede añadir ' + remaining + ' foto(s) más (máx. ' + maxFotos + ').');
                fileInput.value = '';
                if (preview) preview.innerHTML = '';
                return;
            }
            showLimit('');
            if (!preview) return;
            preview.innerHTML = '';
            selected.forEach(function (file) {
                if (!file.type || file.type.indexOf('image/') !== 0) return;
                const col = document.createElement('div');
                col.className = 'col-4 col-md-3';
                const img = document.createElement('img');
                img.className = 'w-100 rounded border';
                img.style.height = '90px';
                img.style.objectFit = 'cover';
                img.alt = file.name;
                img.src = URL.createObjectURL(file);
                col.appendChild(img);
                preview.appendChild(col);
            });
        });
    }

    if (fotosForm) {
        fotosForm.addEventListener('submit', function (event) {
            const selected = fileInput ? Array.from(fileInput.files || []) : [];
            const remaining = Math.max(0, maxFotos - fotosActuales);
            if (selected.length > remaining) {
                event.preventDefault();
                showLimit('Solo puede añadir ' + remaining + ' foto(s) más (máx. ' + maxFotos + ').');
            }
        });
    }

    const modal = document.getElementById('eliminarFotoModal');
    function setDeleteAction(action) {
        if (!deleteForm || !action) return;
        deleteForm.setAttribute('action', action);
        const submit = deleteForm.querySelector('[type="submit"]');
        if (submit) submit.setAttribute('formaction', action);
    }
    if (modal && deleteForm) {
        modal.addEventListener('show.bs.modal', function (event) {
            const btn = event.relatedTarget;
            setDeleteAction(btn && btn.getAttribute('data-action'));
        });
        deleteForm.addEventListener('submit', function (event) {
            if (!deleteForm.getAttribute('action')) {
                event.preventDefault();
            }
        });
    }
})();
