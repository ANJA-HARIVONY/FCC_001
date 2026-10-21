import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { clampListPerPage } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { CardMenu } from "../../components/CardMenu";
import { ListPagination } from "../../components/ListPagination";
import { clearSavedFilters, readSavedFilters, writeSavedFilters } from "../../filters-memory";
import { usePageMeta } from "../../layout/Shell";
import { copyIncidentText } from "./copy";
import { buildIncidentsPrintHtml } from "./print-list";
import {
  bitrixTaskUrl,
  formatIncidentDate,
  isBitrixNetworkError,
  statusBadgeClass,
  type BitrixInfoResponse,
  type IncidentListItem,
  type IncidentListResponse,
} from "./types";

const INCIDENT_FILTER_KEYS = [
  "status",
  "bitrix_status",
  "operateur",
  "ciudad",
  "agencia",
  "date_from",
  "date_to",
  "per_page",
] as const;

interface BitrixLive {
  emoji?: string;
  label?: string;
  responsible?: string;
  error?: string;
}

export function IncidentsListPage() {
  const session = useSession();
  const isSuperadmin = session.user?.role === "superadmin";
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<IncidentListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftSearch, setDraftSearch] = useState(params.get("search") ?? "");
  const [remember, setRemember] = useState(true);
  const [restored, setRestored] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IncidentListItem | null>(null);
  const [bitrixLive, setBitrixLive] = useState<Record<number, BitrixLive>>({});
  const hydrated = useRef(false);
  const skipSave = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(params);
      if (!qs.get("per_page")) {
        qs.set("per_page", "50");
      }
      const payload = await api<IncidentListResponse>(`/api/incidents?${qs.toString()}`);
      setData(payload);
      setDraftSearch(payload.filters.search ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const userId = session.user?.userId;
    if (!userId || hydrated.current) {
      return;
    }
    hydrated.current = true;
    const scope = `incidents_user_${userId}`;
    const saved = readSavedFilters("incidents_filters_v1", scope);
    const enabled = saved ? saved.enabled : true;
    setRemember(enabled);
    const urlHas = INCIDENT_FILTER_KEYS.some((key) => params.has(key));
    if (!urlHas && saved && enabled) {
      const next = new URLSearchParams(params);
      for (const key of INCIDENT_FILTER_KEYS) {
        const value = saved.filters[key] ?? "";
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      setRestored(true);
      setParams(next, { replace: true });
      window.setTimeout(() => setRestored(false), 3000);
    }
  }, [session.user, params, setParams]);

  useEffect(() => {
    const userId = session.user?.userId;
    if (!userId || !hydrated.current) {
      return;
    }
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (!remember) {
      clearSavedFilters("incidents_filters_v1");
      return;
    }
    const filters: Record<string, string> = {};
    for (const key of INCIDENT_FILTER_KEYS) {
      filters[key] = params.get(key) ?? "";
    }
    writeSavedFilters("incidents_filters_v1", `incidents_user_${userId}`, filters);
  }, [params, remember, session.user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const autoLoadKey = (data?.items ?? [])
    .filter((item) => item.bitrix_auto_load)
    .map((item) => item.id)
    .join(",");

  useEffect(() => {
    setBitrixLive({});
    if (!data?.meta.bitrix_api_enabled || !autoLoadKey) {
      return;
    }
    const pending = data.items.filter((item) => item.bitrix_auto_load);
    let cancelled = false;
    let networkFailed = false;
    void (async () => {
      for (const item of pending) {
        if (cancelled) {
          return;
        }
        if (networkFailed) {
          setBitrixLive((prev) => ({ ...prev, [item.id]: { error: "Estado no disponible" } }));
          continue;
        }
        try {
          const payload = await api<BitrixInfoResponse>(`/api/incidents/${item.id}/bitrix-info`);
          if (cancelled) {
            return;
          }
          if (payload.ok && payload.data) {
            setBitrixLive((prev) => ({
              ...prev,
              [item.id]: {
                emoji: payload.data?.status_emoji,
                label: payload.data?.status_label,
                responsible: payload.data?.responsible_name,
              },
            }));
          } else {
            const message = payload.error || "Error";
            if (isBitrixNetworkError(message)) {
              networkFailed = true;
            }
            setBitrixLive((prev) => ({ ...prev, [item.id]: { error: message } }));
          }
        } catch (err) {
          networkFailed = true;
          const message = err instanceof ApiError ? err.message : "Estado no disponible";
          if (!cancelled) {
            setBitrixLive((prev) => ({ ...prev, [item.id]: { error: message } }));
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoLoadKey, data]);

  const actions = useMemo(
    () => (
      <Link to="/incidencias/nueva" className="btn btn-primary btn-sm">
        <i className="fas fa-plus me-1" aria-hidden="true" />
        Nueva Incidencia
      </Link>
    ),
    [],
  );

  usePageMeta({
    title: "Incidencias",
    icon: <i className="fas fa-ticket" aria-hidden="true" />,
    subtitle: "Listado y gestión de las incidencias",
    actions,
  });

  function updateFilters(next: Record<string, string>, resetPage = true) {
    const query = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        query.set(key, value);
      } else {
        query.delete(key);
      }
    }
    if (resetPage) {
      query.set("page", "1");
    }
    setParams(query);
  }

  function toggleSort(column: string) {
    const current = params.get("sort") || "fecha";
    const order = params.get("order") === "asc" ? "asc" : "desc";
    const nextOrder = current === column && order === "desc" ? "asc" : "desc";
    updateFilters({ sort: column, order: nextOrder }, false);
  }

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault();
    updateFilters({ search: draftSearch.trim() });
  }

  function resetFilters() {
    clearSavedFilters("incidents_filters_v1");
    setDraftSearch("");
    setParams(new URLSearchParams());
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    const item = pendingDelete;
    setPendingDelete(null);
    try {
      await api(`/api/incidents/${item.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function copyItem(item: IncidentListItem) {
    const result = await copyIncidentText(item);
    setToast(
      result === "ok"
        ? "Información de la incidencia copiada al portapapeles"
        : "Error al copiar. Intente seleccionar y copiar manualmente.",
    );
  }

  async function downloadExcel() {
    const qs = new URLSearchParams(params);
    if (!qs.get("per_page")) {
      qs.set("per_page", String(perPage));
    }
    try {
      const response = await fetch(`/api/incidents/export.xlsx?${qs.toString()}`, { credentials: "include" });
      if (!response.ok) {
        setError("Error al exportar las incidencias.");
        return;
      }
      const blob = await response.blob();
      const match = (response.headers.get("Content-Disposition") ?? "").match(/filename="([^"]+)"/);
      const filename = match?.[1] || "incidencias.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Error al exportar las incidencias.");
    }
  }

  function printList() {
    if (!data) {
      return;
    }
    const label = (id: string, fallback: string) => {
      const el = document.getElementById(id) as HTMLSelectElement | null;
      if (!el?.value) {
        return fallback;
      }
      return el.selectedOptions[0]?.text.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ().,\-/@]/gu, "").trim() || fallback;
    };
    const html = buildIncidentsPrintHtml({
      items: data.items,
      hasActiveFilters: filtersActive,
      generatedAt: formatIncidentDate(new Date().toISOString()),
      filters: {
        busqueda: (params.get("search") ?? "").trim() || "(ninguna)",
        estado: label("status", "Todos"),
        usuario: label("operateur", "Todos"),
        ciudad: label("ciudad", "Todas"),
        agencia: label("agencia", "Todas"),
        desde: params.get("date_from") || "Todas",
        hasta: params.get("date_to") || "Todas",
        paginacion: `Página ${data.page} de ${data.pages} — ${data.per_page} registros por página`,
      },
    });
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      window.alert("No se pudo abrir la ventana de impresión. Compruebe que las ventanas emergentes no estén bloqueadas.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    setToast("Listado de impresión generado correctamente");
  }

  const page = Math.max(1, Number(params.get("page") ?? data?.page ?? 1) || 1);
  const perPage = clampListPerPage(params.get("per_page") ?? data?.per_page);
  const statusFilter = params.get("status") ?? "";
  const sortBy = params.get("sort") || data?.filters.sort || "fecha";
  const sortOrder = (params.get("order") || data?.filters.order) === "asc" ? "asc" : "desc";
  const filtersActive = Boolean(
    params.get("search") ||
      params.get("status") ||
      params.get("operateur") ||
      params.get("ciudad") ||
      params.get("agencia") ||
      params.get("date_from") ||
      params.get("date_to") ||
      params.get("bitrix_status"),
  );
  const returnTo = `${window.location.pathname}${window.location.search}`;

  function SortHeader({ column, label }: { column: string; label: string }) {
    const active = sortBy === column;
    const icon = active ? (sortOrder === "asc" ? "fa-sort-up" : "fa-sort-down") : "fa-sort";
    return (
      <th>
        <a
          href="#ordenar"
          className="table-sort-link text-decoration-none"
          onClick={(event) => {
            event.preventDefault();
            toggleSort(column);
          }}
        >
          {label} <i className={`fas ${icon}`} aria-hidden="true" />
        </a>
      </th>
    );
  }

  return (
    <div className="container-fluid px-0">
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0 content-card">
            <div className="card-header d-flex align-items-center flex-wrap gap-2 py-3">
              <h5 className="mb-0">
                <i className="fas fa-filter me-2" aria-hidden="true" />
                Filtros de búsqueda
              </h5>
              <span className={`badge bg-light text-dark${filtersActive ? "" : " d-none"}`}>Filtros activos</span>
            </div>
            <div className="card-body">
              <form onSubmit={onFilterSubmit}>
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-6 col-lg-3">
                    <label htmlFor="search" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-search me-1" aria-hidden="true" />
                      Buscar
                    </label>
                    <input
                      id="search"
                      className="form-control form-control-sm"
                      value={draftSearch}
                      placeholder="Asunto, observaciones, cliente..."
                      onChange={(event) => setDraftSearch(event.target.value)}
                    />
                  </div>
                  <div className="col-6 col-md-4 col-lg-2">
                    <label htmlFor="status" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-flag me-1" aria-hidden="true" />
                      Estado
                    </label>
                    <select
                      id="status"
                      className="form-select form-select-sm"
                      value={statusFilter}
                      onChange={(event) =>
                        updateFilters({
                          status: event.target.value,
                          bitrix_status: event.target.value === "Bitrix" ? params.get("bitrix_status") ?? "" : "",
                        })
                      }
                    >
                      <option value="">Todos 🎯</option>
                      <option value="Solucionadas">Solucionadas ✅</option>
                      <option value="Pendiente">Pendiente ⏳</option>
                      <option value="Bitrix">Bitrix 🔗</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-4 col-lg-2" id="bitrix-status-filter-wrap" hidden={statusFilter !== "Bitrix"}>
                    <label htmlFor="bitrix_status" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-tasks me-1" aria-hidden="true" />
                      Tarea Bitrix
                    </label>
                    <select
                      id="bitrix_status"
                      className="form-select form-select-sm"
                      value={params.get("bitrix_status") ?? ""}
                      disabled={statusFilter !== "Bitrix"}
                      onChange={(event) => updateFilters({ bitrix_status: event.target.value })}
                    >
                      <option value="">Todas</option>
                      {(data?.meta.bitrix_status_choices ?? []).map((choice) => (
                        <option key={choice.code} value={choice.code}>
                          {choice.emoji} {choice.label}
                        </option>
                      ))}
                      <option value="_none">Sin consultar</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-4 col-lg-2">
                    <label htmlFor="operateur" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-user-cog me-1" aria-hidden="true" />
                      Usuario
                    </label>
                    <select
                      id="operateur"
                      className="form-select form-select-sm"
                      value={params.get("operateur") ?? ""}
                      onChange={(event) => updateFilters({ operateur: event.target.value })}
                    >
                      <option value="">Todos</option>
                      {(data?.meta.operateurs ?? []).map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 col-md-4 col-lg-2">
                    <label htmlFor="ciudad" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-city me-1" aria-hidden="true" />
                      Ciudad
                    </label>
                    <select
                      id="ciudad"
                      className="form-select form-select-sm"
                      value={params.get("ciudad") ?? ""}
                      onChange={(event) => updateFilters({ ciudad: event.target.value, agencia: "" })}
                    >
                      {isSuperadmin ? <option value="">Todas las ciudades</option> : null}
                      {(data?.meta.ciudades ?? [])
                        .filter((c) => isSuperadmin || c.id === session.user?.idCiudad)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-6 col-md-4 col-lg-2">
                    <label htmlFor="agencia" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-building me-1" aria-hidden="true" />
                      Agencia
                    </label>
                    <select
                      id="agencia"
                      className="form-select form-select-sm"
                      value={params.get("agencia") ?? ""}
                      onChange={(event) => updateFilters({ agencia: event.target.value })}
                    >
                      {isSuperadmin ? <option value="">Todas las agencias</option> : null}
                      {(data?.meta.agencias ?? []).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 col-md-4 col-lg-2">
                    <label htmlFor="date_from" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-calendar-alt me-1" aria-hidden="true" />
                      Desde
                    </label>
                    <input
                      type="date"
                      id="date_from"
                      className="form-control form-control-sm"
                      value={params.get("date_from") ?? ""}
                      onChange={(event) => updateFilters({ date_from: event.target.value })}
                    />
                  </div>
                  <div className="col-6 col-md-4 col-lg-2">
                    <label htmlFor="date_to" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-calendar-alt me-1" aria-hidden="true" />
                      Hasta
                    </label>
                    <input
                      type="date"
                      id="date_to"
                      className="form-control form-control-sm"
                      value={params.get("date_to") ?? ""}
                      onChange={(event) => updateFilters({ date_to: event.target.value })}
                    />
                  </div>
                  <div className="col-4 col-md-2 col-lg-1">
                    <label htmlFor="per_page" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-list me-1" aria-hidden="true" />
                      Por pág.
                    </label>
                    <select
                      id="per_page"
                      className="form-select form-select-sm"
                      value={String(perPage)}
                      onChange={(event) => updateFilters({ per_page: event.target.value, page: "1" }, false)}
                    >
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="200">200</option>
                      <option value="500">500</option>
                    </select>
                  </div>
                  <div className="col-12 d-flex gap-2 flex-wrap justify-content-center align-items-end">
                    <div className="form-check ms-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="remember-filters-toggle"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                      />
                      <label className="form-check-label small text-muted" htmlFor="remember-filters-toggle">
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
              <div className={`small text-success mt-2${restored ? "" : " d-none"}`} id="filters-feedback">
                <i className="fas fa-check-circle me-1" aria-hidden="true" />
                Filtros restaurados automáticamente
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card content-card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h5 className="mb-0">
                  <i className="fas fa-list me-2" aria-hidden="true" />
                  Registros de las Incidencias
                  {data ? ` (${data.total} total${filtersActive ? ` — ${data.items.length} en esta página` : ""})` : null}
                </h5>
                {data ? (
                  <div className="small text-muted mt-1 d-flex flex-wrap align-items-center gap-3 card-header-meta">
                    <span className="d-inline-flex align-items-center gap-1">
                      <img
                        src="/static/img/icon-cliente-corporativo.png"
                        alt=""
                        className="icon-cliente-corporativo"
                        width={18}
                        height={18}
                        aria-hidden="true"
                      />
                      <strong className="card-header-meta__value">{data.counts.corporativo}</strong> Corporativo
                    </span>
                    <span>
                      <strong className="card-header-meta__value">{data.counts.particular}</strong> Particular
                    </span>
                  </div>
                ) : null}
              </div>
              {data && data.items.length > 0 ? (
                <div className="text-muted small">
                  Página {data.page} de {data.pages}
                </div>
              ) : null}
            </div>
            <div className="card-body p-0">
              {error ? (
                <div className="alert alert-danger m-3" role="alert">
                  {error}
                </div>
              ) : null}
              {loading && !data ? <p className="p-3 mb-0">Cargando…</p> : null}
              {data && data.items.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-clipboard-list fa-3x text-muted mb-3" aria-hidden="true" />
                  {filtersActive ? (
                    <>
                      <h5 className="text-muted">No se encontraron incidencias</h5>
                      <p className="text-muted">Intente cambiar los filtros de búsqueda</p>
                      <button type="button" className="btn btn-outline-primary" onClick={resetFilters}>
                        <i className="fas fa-times me-1" aria-hidden="true" />
                        Limpiar filtros
                      </button>
                    </>
                  ) : (
                    <>
                      <h5 className="text-muted">No hay incidencias registradas</h5>
                      <p className="text-muted">Comience agregando su primera incidencia</p>
                      <Link to="/incidencias/nueva" className="btn btn-primary">
                        <i className="fas fa-plus me-1" aria-hidden="true" />
                        Añadir incidencia
                      </Link>
                    </>
                  )}
                </div>
              ) : null}
              {data && data.items.length > 0 ? (
                <>
                  <div className="table-responsive d-none d-lg-block d-print-block">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th className="text-center col-categoria-icon" title="Cliente corporativo" />
                          <SortHeader column="client" label="Cliente" />
                          <SortHeader column="asunto" label="Asunto" />
                          <th>Estado</th>
                          {statusFilter === "Bitrix" ? <SortHeader column="tecnico" label="Técnico" /> : null}
                          <SortHeader column="operador" label="Usuario" />
                          <SortHeader column="fecha" label="Fecha/Hora" />
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((item) => {
                          const live = bitrixLive[item.id];
                          const responsible = live?.responsible || item.bitrix_responsible;
                          return (
                            <tr key={item.id}>
                              <td>
                                <strong>#{item.id}</strong>
                              </td>
                              <td className="col-categoria-icon text-center">
                                {item.client.categoria === "corporativo" ? (
                                  <img
                                    src="/static/img/icon-cliente-corporativo.png"
                                    alt="Cliente corporativo"
                                    title="Cliente corporativo"
                                    width={22}
                                    height={22}
                                    className="icon-cliente-corporativo"
                                  />
                                ) : null}
                              </td>
                              <td>
                                <i className="fas fa-user-tie me-1" aria-hidden="true" />
                                <Link
                                  to={`/incidencias/${item.id}?next=${encodeURIComponent(returnTo)}`}
                                  className="text-decoration-none text-dark"
                                >
                                  {item.client.nom}
                                </Link>
                                <br />
                                <small className="text-muted fst-italic" style={{ fontSize: "0.65rem" }}>
                                  <i className="fas fa-map-marker-alt me-1" aria-hidden="true" />
                                  {item.client.adresse}
                                </small>
                              </td>
                              <td>
                                <div className="text-truncate" style={{ maxWidth: 200 }} title={item.intitule}>
                                  {item.intitule}
                                </div>
                              </td>
                              <td>
                                {item.status === "Solucionadas" ? (
                                  <span className="badge badge-resolut">Solucionadas ✅</span>
                                ) : item.status === "Pendiente" ? (
                                  <span className="badge badge-attente">Pendiente ⏳</span>
                                ) : (
                                  <BitrixBadge item={item} live={live} apiEnabled={Boolean(data.meta.bitrix_api_enabled)} />
                                )}
                              </td>
                              {statusFilter === "Bitrix" ? <td>{responsible || "—"}</td> : null}
                              <td>
                                <UserChip item={item} size={28} />
                              </td>
                              <td>{formatIncidentDate(item.date_heure)}</td>
                              <td>
                                <div className="btn-group" role="group">
                                  {item.can_modify ? (
                                    <Link
                                      to={`/incidencias/${item.id}/editar?next=${encodeURIComponent(returnTo)}`}
                                      className="btn btn-sm btn-outline-primary"
                                      title="Modificar"
                                    >
                                      <i className="fas fa-edit" aria-hidden="true" />
                                    </Link>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success"
                                    title="Copiar información"
                                    onClick={() => void copyItem(item)}
                                  >
                                    <i className="fas fa-copy" aria-hidden="true" />
                                  </button>
                                  {item.can_delete ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      title="Eliminar"
                                      onClick={() => setPendingDelete(item)}
                                    >
                                      <i className="fas fa-trash" aria-hidden="true" />
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mobile-list d-lg-none d-print-none" id="incidents-mobile-list">
                    {data.items.map((item) => (
                      <IncidentMobileCard
                        key={item.id}
                        item={item}
                        live={bitrixLive[item.id]}
                        apiEnabled={Boolean(data.meta.bitrix_api_enabled)}
                        statusFilter={statusFilter}
                        returnTo={returnTo}
                        onCopy={() => void copyItem(item)}
                        onDelete={() => setPendingDelete(item)}
                      />
                    ))}
                  </div>
                  {data.pages > 1 ? (
                    <div className="card-footer">
                      <ListPagination
                        page={page}
                        perPage={perPage}
                        total={data.total}
                        noun="incidencias"
                        label="Paginación de las incidencias"
                        onPage={(value) => updateFilters({ page: String(value) }, false)}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {pendingDelete ? (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" id="confirmModal" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirmar la eliminación</h5>
                  <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setPendingDelete(null)} />
                </div>
                <div className="modal-body">
                  <p>
                    ¿Está seguro de que desea eliminar la incidencia <strong>{pendingDelete.intitule}</strong> ?
                  </p>
                  <p className="text-danger">
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
            zIndex: 9999,
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

function UserChip({ item, size }: { item: IncidentListItem; size: number }) {
  const fallback = "/static/img/default_avatar.png";
  return (
    <div className="d-flex align-items-center gap-2">
      <img
        src={item.operateur.avatar_url || fallback}
        alt={size > 20 ? `Avatar de ${item.operateur.nom}` : ""}
        className="rounded-circle"
        width={size}
        height={size}
        onError={(event) => {
          const img = event.currentTarget;
          if (!img.src.endsWith(fallback)) {
            img.src = fallback;
          }
        }}
      />
      <span>{item.operateur.nom}</span>
    </div>
  );
}

function BitrixBadge({
  item,
  live,
  apiEnabled,
}: {
  item: IncidentListItem;
  live?: BitrixLive;
  apiEnabled: boolean;
}) {
  const emoji = live?.error ? "⚠️" : live?.emoji || item.bitrix_status_emoji;
  const title = live?.error || live?.label || item.bitrix_status_label || "";
  const waiting = Boolean(item.bitrix_auto_load) && !item.bitrix_status_emoji && !live?.emoji && !live?.error;
  return (
    <>
      <span className="badge badge-bitrix">
        Bitrix
        {item.ref_bitrix ? (
          <span className="d-inline text-muted">
            <a
              href={bitrixTaskUrl(item.ref_bitrix)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-none text-white"
              title="Abrir en nuevo tab"
            >
              {" "}
              {item.ref_bitrix} <i className="fas fa-external-link-alt" aria-hidden="true" />
            </a>
          </span>
        ) : null}
      </span>
      {apiEnabled && item.ref_bitrix ? (
        waiting ? (
          <span className="bitrix-emoji-inline bitrix-loading ms-1">
            <i className="fas fa-spinner fa-spin small" aria-hidden="true" />
          </span>
        ) : emoji ? (
          <span className={`bitrix-emoji-inline ms-1${live?.error ? " text-white-50" : ""}`} title={title}>
            {emoji}
          </span>
        ) : null
      ) : null}
    </>
  );
}

function IncidentMobileCard({
  item,
  live,
  apiEnabled,
  statusFilter,
  returnTo,
  onCopy,
  onDelete,
}: {
  item: IncidentListItem;
  live?: BitrixLive;
  apiEnabled: boolean;
  statusFilter: string;
  returnTo: string;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const next = encodeURIComponent(returnTo);
  const responsible = live?.responsible || item.bitrix_responsible;
  return (
    <article className="mobile-list-card">
      <div className="mobile-list-card__head">
        <div className="mobile-list-card__meta">
          <span className="mobile-list-card__id">#{item.id}</span>
          {item.status === "Solucionadas" ? (
            <span className="badge badge-resolut">Solucionadas ✅</span>
          ) : item.status === "Pendiente" ? (
            <span className="badge badge-attente">Pendiente ⏳</span>
          ) : (
            <BitrixBadge item={item} live={live} apiEnabled={apiEnabled} />
          )}
          {item.client.categoria === "corporativo" ? (
            <img
              src="/static/img/icon-cliente-corporativo.png"
              alt="Cliente corporativo"
              title="Cliente corporativo"
              className="icon-cliente-corporativo"
              width={22}
              height={22}
            />
          ) : null}
        </div>
        <CardMenu>
          {item.can_modify ? (
            <li>
              <Link className="dropdown-item" to={`/incidencias/${item.id}/editar?next=${next}`}>
                <i className="fas fa-edit me-2" aria-hidden="true" />
                Editar
              </Link>
            </li>
          ) : null}
          <li>
            <button type="button" className="dropdown-item" onClick={onCopy}>
              <i className="fas fa-copy me-2" aria-hidden="true" />
              Copiar información
            </button>
          </li>
          {item.can_delete ? (
            <>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button type="button" className="dropdown-item text-danger" onClick={onDelete}>
                  <i className="fas fa-trash me-2" aria-hidden="true" />
                  Eliminar
                </button>
              </li>
            </>
          ) : null}
        </CardMenu>
      </div>
      <Link className="mobile-list-card__title" to={`/incidencias/${item.id}?next=${next}`}>
        <i className="fas fa-user-tie me-1" aria-hidden="true" />
        {item.client.nom}
      </Link>
      {item.client.adresse ? (
        <p className="mobile-list-card__subtitle">
          <i className="fas fa-map-marker-alt me-1" aria-hidden="true" />
          {item.client.adresse}
        </p>
      ) : null}
      {item.intitule ? (
        <p className="mobile-list-card__asunto" title={item.intitule}>
          {item.intitule}
        </p>
      ) : null}
      <div className="mobile-list-card__badges">
        {statusFilter === "Bitrix" ? (
          <span className="badge rounded-pill mobile-list-card__chip mobile-list-card__chip--user">
            <i className="fas fa-hard-hat" aria-hidden="true" />
            <span>{responsible || "—"}</span>
          </span>
        ) : null}
        <span className="badge rounded-pill mobile-list-card__chip mobile-list-card__chip--user">
          <img
            src={item.operateur.avatar_url || "/static/img/default_avatar.png"}
            alt=""
            className="rounded-circle"
            width={18}
            height={18}
            onError={(event) => {
              const img = event.currentTarget;
              if (!img.src.endsWith("/static/img/default_avatar.png")) {
                img.src = "/static/img/default_avatar.png";
              }
            }}
          />
          {item.operateur.nom}
        </span>
        <span className="badge rounded-pill mobile-list-card__chip mobile-list-card__chip--date">
          <i className="fas fa-clock me-1" aria-hidden="true" />
          {formatIncidentDate(item.date_heure)}
        </span>
      </div>
    </article>
  );
}
