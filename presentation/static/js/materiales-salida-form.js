/**
 * Formulario de salida de material — autocompletado técnico/cliente y líneas dinámicas.
 */
(function () {
    let tecnicosData = [];
    let clientsData = [];

    async function loadTecnicos() {
        try {
            const r = await fetch('/api/tecnicos-search');
            if (r.ok) tecnicosData = await r.json();
        } catch (e) {
            console.error('Error cargando técnicos', e);
        }
    }

    async function loadClients() {
        try {
            const r = await fetch('/api/clients-search');
            if (r.ok) clientsData = await r.json();
        } catch (e) {
            console.error('Error cargando clientes', e);
        }
    }

    function searchItems(data, query, fields) {
        if (!query || query.length < 2) return [];
        const term = query.toLowerCase();
        return data.filter(item =>
            fields.some(f => (item[f] || '').toLowerCase().includes(term))
        ).slice(0, 10);
    }

    function setupAutocomplete(inputId, hiddenId, dropdownId, selectedBoxId, selectedInfoId, clearBtnId, dataLoader, searchFields, renderItem, onSelect) {
        const input = document.getElementById(inputId);
        const hidden = document.getElementById(hiddenId);
        const dropdown = document.getElementById(dropdownId);
        const selectedBox = document.getElementById(selectedBoxId);
        const selectedInfo = document.getElementById(selectedInfoId);
        const clearBtn = document.getElementById(clearBtnId);
        if (!input || !hidden || !dropdown) return;

        function showResults(results) {
            if (!results.length) {
                dropdown.innerHTML = '<div class="dropdown-item-text text-muted">No se encontraron resultados</div>';
            } else {
                dropdown.innerHTML = results.map(renderItem).join('');
            }
            dropdown.style.display = 'block';
        }

        input.addEventListener('input', function () {
            hidden.value = '';
            if (selectedBox) selectedBox.style.display = 'none';
            showResults(searchItems(dataLoader(), input.value, searchFields));
        });

        input.addEventListener('focus', function () {
            if (input.value.length >= 2) {
                showResults(searchItems(dataLoader(), input.value, searchFields));
            }
        });

        dropdown.addEventListener('click', function (e) {
            const link = e.target.closest('[data-id]');
            if (!link) return;
            e.preventDefault();
            const id = parseInt(link.dataset.id, 10);
            const item = dataLoader().find(x => x.id === id);
            if (!item) return;
            hidden.value = id;
            input.value = item.nom;
            if (selectedInfo) selectedInfo.textContent = onSelect(item);
            if (selectedBox) selectedBox.style.display = 'block';
            dropdown.style.display = 'none';
        });

        document.addEventListener('click', function (e) {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                hidden.value = '';
                input.value = '';
                if (selectedBox) selectedBox.style.display = 'none';
            });
        }
    }

    function setupLineas() {
        const body = document.getElementById('lineasBody');
        const tpl = document.getElementById('lineaRowTemplate');
        const addBtn = document.getElementById('addLineaBtn');
        if (!body || !tpl || !addBtn) return;

        addBtn.addEventListener('click', function () {
            body.appendChild(tpl.content.cloneNode(true));
        });

        body.addEventListener('click', function (e) {
            if (e.target.closest('.btn-remove-linea')) {
                const rows = body.querySelectorAll('.linea-row');
                if (rows.length <= 1) {
                    alert('Debe haber al menos una línea.');
                    return;
                }
                e.target.closest('.linea-row').remove();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', async function () {
        await Promise.all([loadTecnicos(), loadClients()]);

        setupAutocomplete(
            'tecnico_search', 'id_tecnico', 'tecnico_dropdown',
            'selected_tecnico', 'selected_tecnico_info', 'clearTecnicoBtn',
            () => tecnicosData,
            ['nom', 'telephone', 'agencia', 'ciudad'],
            item => `<a href="#" class="dropdown-item" data-id="${item.id}">
                <strong>${item.nom}</strong><br>
                <small class="text-muted"><i class="fas fa-phone me-1"></i>${item.telephone} — ${item.agencia}</small>
            </a>`,
            item => `${item.nom} — ${item.telephone}`
        );

        setupAutocomplete(
            'client_search', 'id_client', 'client_dropdown',
            'selected_client', 'selected_client_info', 'clearClientBtn',
            () => clientsData,
            ['nom', 'telephone', 'ville', 'adresse'],
            item => {
                const badge = item.categoria === 'corporativo'
                    ? '<span class="badge bg-primary ms-1">Corporativo</span>'
                    : '<span class="badge bg-secondary ms-1">Particular</span>';
                return `<a href="#" class="dropdown-item" data-id="${item.id}">
                    <strong>${item.nom}</strong>${badge}<br>
                    <small class="text-muted">${item.telephone} — ${item.ville}</small>
                </a>`;
            },
            item => item.nom
        );

        setupLineas();

        const form = document.getElementById('salidaForm');
        if (form) {
            form.addEventListener('submit', function (e) {
                const tecnicoId = document.getElementById('id_tecnico').value;
                if (!tecnicoId) {
                    e.preventDefault();
                    alert('Seleccione un técnico.');
                }
            });
        }
    });
})();
