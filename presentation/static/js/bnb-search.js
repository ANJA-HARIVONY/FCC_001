/* Barre segmentée : un critère actif, panneau dessous, bouton rond. */
(function () {
    function formatDate(iso) {
        if (!iso) {
            return '';
        }
        var parts = String(iso).split('-');
        if (parts.length !== 3) {
            return iso;
        }
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function visibleControls(segment) {
        return Array.prototype.filter.call(
            segment.querySelectorAll('input, select, textarea'),
            function (el) {
                if (el.disabled || el.classList.contains('bnb-search__filter') || el.classList.contains('bnb-search__inline')) {
                    return false;
                }
                var hiddenHost = el.closest('[hidden]');
                return !hiddenHost || hiddenHost.classList.contains('bnb-search__panel');
            }
        );
    }

    function controlText(el) {
        if (el.tagName === 'SELECT') {
            var opt = el.options[el.selectedIndex];
            if (!opt || !opt.value) {
                return '';
            }
            return (opt.textContent || '').trim();
        }
        if (el.type === 'date') {
            return formatDate(el.value);
        }
        return (el.value || '').trim();
    }

    function refreshSegment(segment) {
        var valueEl = segment.querySelector('.bnb-search__value');
        if (!valueEl) {
            return;
        }
        var parts = visibleControls(segment).map(controlText).filter(Boolean);
        var placeholder = segment.getAttribute('data-bnb-placeholder') || '—';
        if (parts.length) {
            valueEl.textContent = parts.join(' · ');
            valueEl.classList.add('is-set');
        } else {
            valueEl.textContent = placeholder;
            valueEl.classList.remove('is-set');
        }
    }

    function applyChoiceFilter(list) {
        var filter = list.parentElement.querySelector(':scope > .bnb-search__filter');
        if (!filter) {
            return;
        }
        var query = filter.value.trim().toLowerCase();
        list.querySelectorAll('.bnb-search__choice').forEach(function (btn) {
            btn.hidden = Boolean(query) && btn.textContent.toLowerCase().indexOf(query) === -1;
        });
    }

    function buildChoices(select) {
        var list = select.parentElement.querySelector('.bnb-search__choices[data-bnb-for="' + select.id + '"]');
        if (!list) {
            return;
        }
        if (select.options.length > 8 && !list.parentElement.querySelector(':scope > .bnb-search__filter')) {
            var filter = document.createElement('input');
            filter.type = 'search';
            filter.className = 'bnb-search__filter';
            filter.placeholder = 'Filtrar…';
            filter.setAttribute('aria-label', 'Filtrar');
            filter.autocomplete = 'off';
            list.parentElement.insertBefore(filter, list);
            filter.addEventListener('input', function () {
                applyChoiceFilter(list);
            });
            filter.addEventListener('click', function (event) {
                event.stopPropagation();
            });
        }
        list.innerHTML = '';
        Array.prototype.forEach.call(select.options, function (opt) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bnb-search__choice' + (opt.selected ? ' is-selected' : '');
            btn.textContent = (opt.textContent || '').trim();
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
            btn.addEventListener('click', function () {
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                var segment = select.closest('.bnb-search__segment');
                if (segment) {
                    refreshSegment(segment);
                }
                buildChoices(select);
                if (select.id === 'status' && opt.value === 'Bitrix') {
                    return;
                }
                closeSearch(select.closest('[data-bnb-search]'));
            });
            list.appendChild(btn);
        });
        applyChoiceFilter(list);
    }

    function closeSearch(root) {
        if (!root) {
            return;
        }
        root.classList.remove('is-open');
        root.querySelectorAll('.bnb-search__segment.is-active').forEach(function (segment) {
            segment.classList.remove('is-active');
            var trigger = segment.querySelector('.bnb-search__trigger');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
            var panel = segment.querySelector('.bnb-search__panel');
            if (panel) {
                panel.hidden = true;
            }
        });
    }

    function openSegment(segment) {
        var root = segment.closest('[data-bnb-search]');
        if (!root) {
            return;
        }
        root.querySelectorAll('.bnb-search__segment.is-active').forEach(function (other) {
            if (other === segment) {
                return;
            }
            other.classList.remove('is-active');
            var otherTrigger = other.querySelector('.bnb-search__trigger');
            if (otherTrigger) {
                otherTrigger.setAttribute('aria-expanded', 'false');
            }
            var otherPanel = other.querySelector('.bnb-search__panel');
            if (otherPanel) {
                otherPanel.hidden = true;
            }
        });
        segment.classList.add('is-active');
        root.classList.add('is-open');
        var trigger = segment.querySelector('.bnb-search__trigger');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'true');
        }
        var panel = segment.querySelector('.bnb-search__panel');
        if (panel) {
            panel.hidden = false;
            segment.querySelectorAll('select').forEach(buildChoices);
            var dateInput = panel.querySelector('input[type="date"]');
            if (dateInput) {
                dateInput.focus();
            } else {
                var selected = panel.querySelector('.bnb-search__choice.is-selected:not([hidden])');
                if (selected) {
                    selected.focus();
                }
            }
        }
        var inline = segment.querySelector('.bnb-search__inline');
        if (inline && document.activeElement !== inline) {
            inline.focus();
        }
    }

    function init(root) {
        root.querySelectorAll('.bnb-search__segment').forEach(function (segment) {
            refreshSegment(segment);

            segment.querySelectorAll('select').forEach(function (select) {
                select.addEventListener('change', function () {
                    refreshSegment(segment);
                    if (!segment.querySelector('.bnb-search__panel[hidden]')) {
                        buildChoices(select);
                    }
                });
                var observer = new MutationObserver(function () {
                    refreshSegment(segment);
                    var panel = segment.querySelector('.bnb-search__panel');
                    if (panel && !panel.hidden) {
                        buildChoices(select);
                    }
                });
                observer.observe(select, { childList: true, subtree: true });
            });

            segment.querySelectorAll('input, textarea').forEach(function (input) {
                if (input.classList.contains('bnb-search__filter')) {
                    return;
                }
                input.addEventListener('input', function () {
                    refreshSegment(segment);
                });
                input.addEventListener('change', function () {
                    refreshSegment(segment);
                });
            });

            var trigger = segment.querySelector('.bnb-search__trigger');
            if (trigger) {
                trigger.addEventListener('click', function () {
                    if (segment.classList.contains('is-active')) {
                        closeSearch(root);
                    } else {
                        openSegment(segment);
                    }
                });
            }

            var inline = segment.querySelector('.bnb-search__inline');
            if (inline) {
                inline.addEventListener('focus', function () {
                    openSegment(segment);
                });
            }

            if (segment.classList.contains('bnb-search__segment--field')) {
                segment.addEventListener('click', function (event) {
                    if (event.target.closest('input, button, a, select')) {
                        return;
                    }
                    var field = segment.querySelector('.bnb-search__inline');
                    if (field) {
                        field.focus();
                    }
                });
            }
        });

        var bitrix = root.querySelector('#bitrix-status-filter-wrap');
        if (bitrix) {
            var wrapObserver = new MutationObserver(function () {
                var segment = bitrix.closest('.bnb-search__segment');
                if (segment) {
                    refreshSegment(segment);
                }
            });
            wrapObserver.observe(bitrix, { attributes: true, attributeFilter: ['hidden'] });
        }

        document.addEventListener('click', function (event) {
            if (!root.contains(event.target)) {
                closeSearch(root);
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeSearch(root);
            }
        });

        setTimeout(function () {
            root.querySelectorAll('.bnb-search__segment').forEach(refreshSegment);
        }, 0);
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-bnb-search]').forEach(init);
    });
})();
