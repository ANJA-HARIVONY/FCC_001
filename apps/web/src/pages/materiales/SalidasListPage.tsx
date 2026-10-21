import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { clampListPerPage } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { CardMenu } from "../../components/CardMenu";
import { ListPagination } from "../../components/ListPagination";
import { clearSavedFilters, readSavedFilters, writeSavedFilters } from "../../filters-memory";
import { usePageMeta } from "../../layout/Shell";
import { copySalidaText } from "./copy";
import { buildSalidasPrintHtml, printSalidasList } from "./print-list";
import { SALIDA_TIPO_BADGE, formatSalidaFecha, salidaClienteLabel, type SalidaListItem } from "./types";

interface SalidasResponse {
  items: SalidaListItem[];
  page: number;
  pages: number;
  per_page: number;
  total: number;
  filters: Record<string, string>;
  meta: {
    tecnicos: { id: number; nom: string }[];
    materiales_filter: { id: number; label: string }[];
    tipos: { value: string; label: string }[];
    tipos_modal: { value: string; label: string }[];
  };
}

const FILTER_KEYS = ["search", "tipo_salida", "tecnico", "material", "date_from", "date_to", "per_page"] as const;
const TIPO_ICONS: Record<string, string> = {
  uso_interno: "fa-building",
  incidencia: "fa-triangle-exclamation",
};

interface DraftFilters {
  search: string;
  tipo_salida: string;
  tecnico: string;
  material: string;
  date_from: string;
  date_to: string;
  per_page: string;
}

function draftFromParams(params: URLSearchParams): DraftFilters {
  return {
    search: params.get("search") ?? "",
    tipo_salida: params.get("tipo_salida") ?? "",
    tecnico: params.get("tecnico") ?? "",
    material: params.get("material") ?? "",
    date_from: params.get("date_from") ?? "",
    date_to: params.get("date_to") ?? "",
    per_page: params.get("per_page") ?? "50",
  };
}

export function SalidasListPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<SalidasResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftFilters>(() => draftFromParams(params));
  const [showModal, setShowModal] = useState(params.get("nueva") === "1");
  const [tipoModal, setTipoModal] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SalidaListItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [restored, setRestored] = useState(false);
  const hydrated = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams(params);
      qs.delete("nueva");
      if (!qs.get("per_page")) {
        qs.set("per_page", "50");
      }
      const payload = await api<SalidasResponse>(`/api/materiales/salidas?${qs.toString()}`);
      setData(payload);
      setDraft(draftFromParams(params));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const userId = session.user?.userId;
    if (!userId || hydrated.current) {
      return;
    }
    hydrated.current = true;
    const saved = readSavedFilters("salidas_filters_v1", `salidas_user_${userId}`);
    setRemember(saved ? saved.enabled : true);
    const urlHas = FILTER_KEYS.some((key) => params.has(key));
    if (!urlHas && saved?.enabled && saved.filters) {
      const next = new URLSearchParams();
      for (const key of FILTER_KEYS) {
        const value = saved.filters[key] ?? "";
        if (value) {
          next.set(key, value);
        }
      }
      setRestored(true);
      setParams(next, { replace: true });
      window.setTimeout(() => setRestored(false), 3000);
    }
  }, [params, session.user, setParams]);

  useEffect(() => {
    const userId = session.user?.userId;
    if (!userId || !hydrated.current || !remember) {
      return;
    }
    const filters: Record<string, string> = {};
    for (const key of FILTER_KEYS) {
      filters[key] = params.get(key) ?? "";
    }
    if (!filters.per_page) {
      filters.per_page = "50";
    }
    writeSavedFilters("salidas_filters_v1", `salidas_user_${userId}`, filters);
  }, [params, remember, session.user]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const actions = useMemo(
    () => (
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
        <i className="fas fa-plus me-1" aria-hidden="true" />
        Nueva salida
      </button>
    ),
    [],
  );

  usePageMeta({
    title: "Salidas de material",
    icon: <i className="fas fa-clipboard-list" aria-hidden="true" />,
    subtitle: "Registro de asignaciones a técnicos",
    actions,
  });

  function applyFilters(nextDraft: DraftFilters, resetPage = true) {
    const query = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = nextDraft[key];
      if (value && !(key === "per_page" && value === "50")) {
        query.set(key, value);
      }
    }
    if (!resetPage && params.get("page")) {
      query.set("page", params.get("page") ?? "1");
    }
    setParams(query);
  }

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault();
    applyFilters({ ...draft, search: draft.search.trim() });
  }

  function resetFilters() {
    clearSavedFilters("salidas_filters_v1");
    setDraft(draftFromParams(new URLSearchParams()));
    setParams(new URLSearchParams());
  }

  function chooseTipo() {
    if (!tipoModal) {
      window.alert("Seleccione un tipo de salida.");
      return;
    }
    setShowModal(false);
    navigate(`/materiales/salidas/nueva?tipo=${encodeURIComponent(tipoModal)}`);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    const item = pendingDelete;
    setPendingDelete(null);
    try {
      await api(`/api/materiales/salidas/${item.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function copyItem(item: SalidaListItem) {
    const result = await copySalidaText(item);
    setToast(
      result === "ok"
        ? "Información de la salida copiada al portapapeles"
        : "Error al copiar. Intente seleccionar y copiar manualmente.",
    );
  }

  async function downloadExcel() {
    const qs = new URLSearchParams(params);
    qs.delete("nueva");
    if (!qs.get("per_page")) {
      qs.set("per_page", "50");
    }
    try {
      const response = await fetch(`/api/materiales/salidas/export.xlsx?${qs.toString()}`, { credentials: "include" });
      if (!response.ok) {
        setError("Error al exportar las salidas.");
        return;
      }
      const blob = await response.blob();
      const match = (response.headers.get("Content-Disposition") ?? "").match(/filename="([^"]+)"/);
      const filename = match?.[1] || "salidas_material.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Error al exportar las salidas.");
    }
  }

  function printList() {
    if (!data) {
      return;
    }
    const label = (id: string, fallback: string) => {
      const element = document.getElementById(id);
      return element instanceof HTMLSelectElement ? element.selectedOptions[0]?.textContent || fallback : fallback;
    };
    const html = buildSalidasPrintHtml({
      items: data.items,
      hasActiveFilters: filtersActive,
      filters: {
        busqueda: draft.search.trim() || "(ninguna)",
        tipo: label("tipo_salida", "Todos"),
        tecnico: label("tecnico", "Todos"),
        material: label("material", "Todos"),
        desde: draft.date_from || "Todas",
        hasta: draft.date_to || "Todas",
        paginacion: `Página ${data.page} de ${data.pages} — ${data.per_page} registros por página`,
      },
    });
    const result = printSalidasList(html);
    if (result === "blocked") {
      window.alert("No se pudo abrir la ventana de impresión. Compruebe que las ventanas emergentes no estén bloqueadas.");
      return;
    }
    setToast("Listado de impresión generado correctamente");
  }

  const page = Math.max(1, Number(params.get("page") ?? data?.page ?? 1) || 1);
  const perPage = clampListPerPage(params.get("per_page") ?? data?.per_page);
  const tiposModal = data?.meta.tipos_modal ?? [
    { value: "uso_interno", label: "Uso interno" },
    { value: "incidencia", label: "Incidencia" },
  ];
  const filtersActive = Boolean(
    draft.search.trim() || draft.tipo_salida || draft.tecnico || draft.material || draft.date_from || draft.date_to,
  );

  return (
    <div className="container-fluid px-0">
      <nav aria-label="breadcrumb" className="app-breadcrumb page-title-breadcrumb mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/materiales">Materiales</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Salidas
          </li>
        </ol>
      </nav>

      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0 content-card">
            <div className="card-header d-flex align-items-center flex-wrap gap-2 py-3">
              <h5 className="mb-0">
                <i className="fas fa-filter me-2" aria-hidden="true" />
                Filtros de búsqueda
              </h5>
              <span className={`badge bg-light text-dark ms-0 ms-md-2${filtersActive ? "" : " d-none"}`}>Filtros activos</span>
            </div>
            <div className="card-body">
              <form onSubmit={onFilterSubmit}>
                <div className="row g-3 align-items-end">
                  <FilterField id="search" icon="fa-search" label="Buscar" className="col-12 col-md-6 col-lg-3">
                    <input
                      id="search"
                      className="form-control form-control-sm"
                      value={draft.search}
                      placeholder="Cliente, teléfono, técnico, material…"
                      autoComplete="off"
                      onChange={(event) => setDraft({ ...draft, search: event.target.value })}
                    />
                  </FilterField>
                  <FilterField id="tipo_salida" icon="fa-tag" label="Tipo de salida" className="col-6 col-md-4 col-lg-2">
                    <select
                      id="tipo_salida"
                      className="form-select form-select-sm"
                      value={draft.tipo_salida}
                      onChange={(event) => setDraft({ ...draft, tipo_salida: event.target.value })}
                    >
                      <option value="">Todos</option>
                      {(data?.meta.tipos ?? []).map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                  <FilterField id="tecnico" icon="fa-user-cog" label="Técnico" className="col-6 col-md-4 col-lg-2">
                    <select
                      id="tecnico"
                      className="form-select form-select-sm"
                      value={draft.tecnico}
                      onChange={(event) => setDraft({ ...draft, tecnico: event.target.value })}
                    >
                      <option value="">Todos</option>
                      {(data?.meta.tecnicos ?? []).map((tecnico) => (
                        <option key={tecnico.id} value={tecnico.id}>
                          {tecnico.nom}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                  <FilterField id="material" icon="fa-box" label="Material" className="col-6 col-md-4 col-lg-2">
                    <select
                      id="material"
                      className="form-select form-select-sm"
                      value={draft.material}
                      onChange={(event) => setDraft({ ...draft, material: event.target.value })}
                    >
                      <option value="">Todos</option>
                      {(data?.meta.materiales_filter ?? []).map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.label}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                  <FilterField id="date_from" icon="fa-calendar-alt" label="Desde" className="col-6 col-md-4 col-lg-2">
                    <input
                      type="date"
                      id="date_from"
                      className="form-control form-control-sm"
                      value={draft.date_from}
                      onChange={(event) => setDraft({ ...draft, date_from: event.target.value })}
                    />
                  </FilterField>
                  <FilterField id="date_to" icon="fa-calendar-alt" label="Hasta" className="col-6 col-md-4 col-lg-2">
                    <input
                      type="date"
                      id="date_to"
                      className="form-control form-control-sm"
                      value={draft.date_to}
                      onChange={(event) => setDraft({ ...draft, date_to: event.target.value })}
                    />
                  </FilterField>
                  <FilterField id="per_page" icon="fa-list" label="Por pág." className="col-4 col-md-2 col-lg-1">
                    <select
                      id="per_page"
                      className="form-select form-select-sm"
                      value={draft.per_page}
                      onChange={(event) => {
                        const next = { ...draft, per_page: event.target.value };
                        setDraft(next);
                        applyFilters(next);
                      }}
                    >
                      {["50", "100", "200", "500"].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                  <div className="col-12 d-flex gap-2 flex-wrap justify-content-center align-items-end">
                    <div className="form-check ms-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="remember-filters-toggle-salidas"
                        checked={remember}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setRemember(enabled);
                          if (!enabled) {
                            clearSavedFilters("salidas_filters_v1");
                          }
                        }}
                      />
                      <label className="form-check-label small text-muted" htmlFor="remember-filters-toggle-salidas">
                        Recordar filtros
                      </label>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">
                      <i className="fas fa-search" aria-hidden="true" /> Buscar
                    </button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
                      <i className="fas fa-undo-alt" aria-hidden="true" /> Reiniciar
                    </button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" title="Imprimir listado" onClick={printList}>
                      <i className="fas fa-print" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      title="Exportar Excel (página actual)"
                      onClick={() => void downloadExcel()}
                    >
                      <i className="fas fa-file-excel" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </form>
              <div className={`small text-success mt-2${restored ? "" : " d-none"}`}>
                <i className="fas fa-check-circle me-1" aria-hidden="true" />
                Filtros restaurados automáticamente
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card content-card">
        <div className="card-body p-0">
          {data && data.items.length === 0 ? (
            <div className="text-center py-5 px-3">
              <i className="fas fa-dolly fa-3x text-muted mb-3" aria-hidden="true" />
              <h5 className="text-muted">No hay salidas registradas.</h5>
            </div>
          ) : (
            <>
              <div className="table-responsive d-none d-lg-block">
                <table className="table table-hover mb-0 align-middle">
                  <thead>
                    <tr>
                      <th className="text-white">#</th>
                      <th className="text-white">Fecha</th>
                      <th className="text-white">Tipo</th>
                      <th className="text-white">Técnico</th>
                      <th className="text-white">Cliente</th>
                      <th className="text-white">Materiales</th>
                      <th className="text-white text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items ?? []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{formatSalidaFecha(item.fecha)}</td>
                        <td>
                          <span className={`badge ${SALIDA_TIPO_BADGE[item.tipo_salida] ?? "bg-secondary"}`}>{item.tipo_label}</span>
                        </td>
                        <td>{item.tecnico.nom || "—"}</td>
                        <td>
                          {item.client ? (
                            item.client.nom
                          ) : item.tipo_salida === "uso_interno" ? (
                            <span className="text-muted">Uso interno</span>
                          ) : (
                            "Uso general"
                          )}
                        </td>
                        <td className="small text-muted">{item.materiales}</td>
                        <td className="text-end text-nowrap">
                          <SalidaActions item={item} onCopy={() => void copyItem(item)} onDelete={() => setPendingDelete(item)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-list d-lg-none">
                {(data?.items ?? []).map((item) => (
                  <article key={item.id} className="mobile-list-card">
                    <div className="mobile-list-card__head">
                      <div className="mobile-list-card__meta">
                        <span className="mobile-list-card__id">#{item.id}</span>
                        <span className={`badge ${SALIDA_TIPO_BADGE[item.tipo_salida] ?? "bg-secondary"}`}>{item.tipo_label}</span>
                      </div>
                      <CardMenu>
                        <li>
                          <Link className="dropdown-item" to={`/materiales/salidas/${item.id}`}>
                            <i className="fas fa-eye me-2" aria-hidden="true" />
                            Ver
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item" to={`/materiales/salidas/${item.id}/editar`}>
                            <i className="fas fa-edit me-2" aria-hidden="true" />
                            Modificar
                          </Link>
                        </li>
                        <li>
                          <button type="button" className="dropdown-item" onClick={() => void copyItem(item)}>
                            <i className="fas fa-copy me-2" aria-hidden="true" />
                            Copiar información
                          </button>
                        </li>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <button type="button" className="dropdown-item text-danger" onClick={() => setPendingDelete(item)}>
                            <i className="fas fa-trash me-2" aria-hidden="true" />
                            Eliminar
                          </button>
                        </li>
                      </CardMenu>
                    </div>
                    <Link className="mobile-list-card__title" to={`/materiales/salidas/${item.id}`}>
                      {salidaClienteLabel(item)}
                    </Link>
                    <div className="mobile-list-card__badges">
                      <span className="badge rounded-pill mobile-list-card__chip">
                        <i className="fas fa-user-cog me-1" aria-hidden="true" />
                        {item.tecnico.nom || "—"}
                      </span>
                      <span className="badge rounded-pill mobile-list-card__chip mobile-list-card__chip--date">
                        <i className="fas fa-clock me-1" aria-hidden="true" />
                        {formatSalidaFecha(item.fecha)}
                      </span>
                      {item.lineas_vista.map((linea) => (
                        <span key={`${linea.nombre}-${linea.modelo}-${linea.cantidad}`} className="badge rounded-pill mobile-list-card__chip">
                          {linea.nombre}
                          {linea.modelo ? ` (${linea.modelo})` : ""} ×{linea.cantidad}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
        {data && data.pages > 1 ? (
          <div className="card-footer">
            <ListPagination
              page={page}
              perPage={perPage}
              total={data.total}
              noun="salidas"
              label="Paginación de las salidas"
              onPage={(value) => {
                const query = new URLSearchParams(params);
                query.set("page", String(value));
                setParams(query);
              }}
            />
          </div>
        ) : null}
      </div>

      {showModal ? (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Tipo de salida</h5>
                  <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setShowModal(false)} />
                </div>
                <div className="modal-body">
                  <p className="text-muted small mb-3">Seleccione el contexto de la salida antes de continuar.</p>
                  <p className="small mb-3">
                    <i className="fas fa-info-circle me-1" aria-hidden="true" />
                    El material de una instalación se registra desde <Link to="/instalaciones/nueva">Nueva instalación</Link>.
                  </p>
                  <div className="row g-3 salida-tipo-radios">
                    {tiposModal.map((tipo) => (
                      <div className="col-6" key={tipo.value}>
                        <div className="position-relative h-100">
                          <input
                            className="form-check-input visually-hidden salida-tipo-choice-input"
                            type="radio"
                            name="tipo_salida_modal"
                            id={`tipo_salida_${tipo.value}`}
                            value={tipo.value}
                            checked={tipoModal === tipo.value}
                            onChange={() => setTipoModal(tipo.value)}
                          />
                          <label className="salida-tipo-card-label w-100 mb-0" htmlFor={`tipo_salida_${tipo.value}`}>
                            <div className={`salida-tipo-card h-100 salida-tipo-card--${tipo.value}`}>
                              <span className={`salida-tipo-icon salida-tipo-icon--${tipo.value} mb-2 d-inline-flex`} aria-hidden="true">
                                <i className={`fas ${TIPO_ICONS[tipo.value] ?? "fa-box"}`} />
                              </span>
                              <span className="salida-tipo-label d-block">{tipo.label}</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-primary" onClick={chooseTipo}>
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {pendingDelete ? (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirmar la eliminación</h5>
                  <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setPendingDelete(null)} />
                </div>
                <div className="modal-body">
                  <p>
                    ¿Está seguro de que desea eliminar la salida <strong>#{pendingDelete.id}</strong>?
                  </p>
                  <p className="text-danger mb-0">
                    <small>Esta acción es irreversible.</small>
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setPendingDelete(null)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => void confirmDelete()}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "#198754",
            color: "white",
            padding: "14px 18px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10000,
            fontSize: "0.88rem",
            maxWidth: 320,
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function FilterField({
  id,
  icon,
  label,
  className,
  children,
}: {
  id: string;
  icon: string;
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label small text-dark text-uppercase fw-semibold">
        <i className={`fas ${icon} me-1`} aria-hidden="true" />
        {label}
      </label>
      {children}
    </div>
  );
}

function SalidaActions({ item, onCopy, onDelete }: { item: SalidaListItem; onCopy: () => void; onDelete: () => void }) {
  return (
    <div className="btn-group" role="group">
      <Link to={`/materiales/salidas/${item.id}`} className="btn btn-sm btn-outline-secondary" title="Ver">
        <i className="fas fa-eye" aria-hidden="true" />
      </Link>
      <Link to={`/materiales/salidas/${item.id}/editar`} className="btn btn-sm btn-outline-primary" title="Modificar">
        <i className="fas fa-edit" aria-hidden="true" />
      </Link>
      <button type="button" className="btn btn-sm btn-outline-success" title="Copiar información" onClick={onCopy}>
        <i className="fas fa-copy" aria-hidden="true" />
      </button>
      <button type="button" className="btn btn-sm btn-outline-danger" title="Eliminar" onClick={onDelete}>
        <i className="fas fa-trash" aria-hidden="true" />
      </button>
    </div>
  );
}
