import { useEffect, useRef, useState, type ReactNode } from "react";

export function searchItems<T extends object>(items: T[], query: string, fields: (keyof T)[]): T[] {
  if (!query || query.length < 2) {
    return [];
  }
  const term = query.toLowerCase();
  return items
    .filter((item) => fields.some((field) => String(item[field] ?? "").toLowerCase().includes(term)))
    .slice(0, 10);
}

export function SearchAutocomplete<T extends { id: number; nom: string }>({
  inputId,
  placeholder,
  initialQuery,
  initialSelected,
  items,
  fields,
  boxClass,
  icon,
  selectedLabel,
  formatSelected,
  renderItem,
  onPick,
  onReset,
}: {
  inputId: string;
  placeholder: string;
  initialQuery: string;
  initialSelected: string;
  items: T[];
  fields: (keyof T)[];
  boxClass: string;
  icon: string;
  selectedLabel: string;
  formatSelected: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onPick: (item: T) => void;
  onReset: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(initialSelected);
  const [open, setOpen] = useState(false);
  const results = open ? searchItems(items, query, fields) : [];

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <>
      <div className="position-relative" ref={wrapRef}>
        <input
          type="text"
          id={inputId}
          className="form-control"
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected("");
            onReset();
            setOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) {
              setOpen(true);
            }
          }}
        />
        {open ? (
          <div
            className="dropdown-menu w-100 show"
            style={{ display: "block", maxHeight: 300, overflowY: "auto" }}
          >
            {query.length >= 2 && results.length > 0 ? (
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="dropdown-item text-start"
                  onClick={() => {
                    setQuery(item.nom);
                    setSelected(formatSelected(item));
                    setOpen(false);
                    onPick(item);
                  }}
                >
                  {renderItem(item)}
                </button>
              ))
            ) : (
              <div className="dropdown-item-text text-muted">No se encontraron resultados</div>
            )}
          </div>
        ) : null}
      </div>
      {selected ? (
        <div className="mt-2">
          <div className={`alert ${boxClass} py-2 mb-0`}>
            <i className={`fas ${icon} me-2`} aria-hidden="true" />
            <strong>{selectedLabel}</strong> {selected}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary ms-2"
              aria-label="Quitar"
              onClick={() => {
                setQuery("");
                setSelected("");
                onReset();
              }}
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
