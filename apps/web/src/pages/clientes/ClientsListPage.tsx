import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { clampListPerPage } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { CardMenu } from "../../components/CardMenu";
import { ListPagination } from "../../components/ListPagination";
import { clearSavedFilters, readSavedFilters, writeSavedFilters } from "../../filters-memory";
import { usePageMeta } from "../../layout/Shell";
import { copyClientText } from "./copy";
import { buildClientsPrintHtml } from "./print-list";
import { CATEGORIA_LABELS, type ClientItem, type ClientListResponse } from "./types";

const CLIENT_FILTER_KEYS = ["search", "ville", "ciudad", "categoria", "per_page"] as const;

export function ClientsListPage() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<ClientListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftSearch, setDraftSearch] = useState(params.get("search") ?? "");
  const [remember, setRemember] = useState(true);
  const [restored, setRestored] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClientItem | null>(null);
  const hydrated = useRef(false);
  const skipSave = useRef(true);

  const queryKey = params.toString();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(params);
      if (!qs.get("per_page")) {
        qs.set("per_page", "50");
      }
      const payload = await api<ClientListResponse>(`/api/clients?${qs.toString()}`);
      setData(payload);
      setDraftSearch(payload.filters.search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load, queryKey]);

  useEffect(() => {
    const userId = session.user?.userId;
    if (!userId || hydrated.current) {
      return;
    }
    hydrated.current = true;
    const scope = `clients_user_${userId}`;
    const saved = readSavedFilters("clients_filters_v1", scope);
    const enabled = saved ? saved.enabled : true;
    setRemember(enabled);
    const urlHas = CLIENT_FILTER_KEYS.some((key) => params.has(key));
    if (!urlHas && saved && enabled) {
      const next = new URLSearchParams(params);
      for (const key of CLIENT_FILTER_KEYS) {
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
      clearSavedFilters("clients_filters_v1");
      return;
    }
    const filters: Record<string, string> = {};
    for (const key of CLIENT_FILTER_KEYS) {
      filters[key] = params.get(key) ?? "";
    }
    writeSavedFilters("clients_filters_v1", `clients_user_${userId}`, filters);
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
      <Link to="/clientes/nuevo" className="btn btn-primary btn-sm">
        <i className="fas fa-plus me-1" aria-hidden="true" />
        Nuevo Cliente
      </Link>
    ),
    [],
  );

  usePageMeta({
    title: "Gestión de clientes",
    icon: <i className="fas fa-users" aria-hidden="true" />,
    subtitle: "Listado y gestión de clientes",
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

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault();
    updateFilters({ search: draftSearch.trim() });
  }

  function resetFilters() {
    clearSavedFilters("clients_filters_v1");
    setDraftSearch("");
    setParams(new URLSearchParams());
  }

  function toggleSort(column: string) {
    const current = params.get("sort") ?? "id";
    const order = params.get("order") ?? "desc";
    const nextOrder = current === column && order === "desc" ? "asc" : "desc";
    updateFilters({ sort: column, order: nextOrder }, false);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    const client = pendingDelete;
    setPendingDelete(null);
    try {
      await api(`/api/clients/${client.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function copyClient(client: ClientItem) {
    const result = await copyClientText(client);
    setToast(
      result === "ok"
        ? "Información del cliente copiada al portapapeles"
        : "Error al copiar. Intente seleccionar y copiar manualmente.",
    );
  }

  async function downloadExcel() {
    const qs = new URLSearchParams(params);
    if (!qs.get("per_page")) {
      qs.set("per_page", "50");
    }
    try {
      const response = await fetch(`/api/clients/export.xlsx?${qs.toString()}`, { credentials: "include" });
      if (!response.ok) {
        setError("Error al exportar los clientes.");
        return;
      }
      const blob = await response.blob();
      const match = (response.headers.get("Content-Disposition") ?? "").match(/filename="([^"]+)"/);
      const filename = match?.[1] || "clientes.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Error al exportar los clientes.");
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
      return el.selectedOptions[0]?.text.trim() || fallback;
    };
    const html = buildClientsPrintHtml({
      items: data.items,
      hasActiveFilters: filtersActive,
      filters: {
        busqueda: (params.get("search") ?? "").trim() || "(ninguna)",
        barrio: label("ville", "Todos"),
        ciudad: label("ciudad", "Todas"),
        categoria: label("categoria", "Todas"),
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
  const filtersActive = Boolean(
    params.get("search") || params.get("ville") || params.get("ciudad") || params.get("categoria"),
  );
  const sortBy = params.get("sort") ?? data?.filters.sort ?? "id";
  const sortOrder = params.get("order") ?? data?.filters.order ?? "desc";
  const returnTo = `${window.location.pathname}${window.location.search}`;

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
              <span className={`badge bg-light text-dark ms-0 ms-md-2${filtersActive ? "" : " d-none"}`}>
                Filtros activos
              </span>
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
                      type="text"
                      className="form-control form-control-sm"
                      id="search"
                      value={draftSearch}
                      placeholder="Buscar en nombre, teléfono, dirección, IP..."
                      autoComplete="off"
                      onChange={(event) => setDraftSearch(event.target.value)}
                    />
                  </div>
                  <div className="col-6 col-md-3 col-lg-2">
                    <label htmlFor="ville" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-map-marker-alt me-1" aria-hidden="true" />
                      Filtrar por barrio
                    </label>
                    <select
                      className="form-select form-select-sm"
                      id="ville"
                      value={params.get("ville") ?? ""}
                      onChange={(event) => updateFilters({ ville: event.target.value })}
                    >
                      <option value="">Todos los barrios</option>
                      {(data?.meta.villes ?? []).map((ville) => (
                        <option key={ville} value={ville}>
                          {ville}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 col-md-3 col-lg-2">
                    <label htmlFor="ciudad" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-city me-1" aria-hidden="true" />
                      Ciudad
                    </label>
                    <select
                      className="form-select form-select-sm"
                      id="ciudad"
                      value={params.get("ciudad") ?? ""}
                      onChange={(event) => updateFilters({ ciudad: event.target.value })}
                    >
                      <option value="">Todas las ciudades</option>
                      {(data?.meta.ciudades ?? []).map((ciudad) => (
                        <option key={ciudad.id} value={ciudad.id}>
                          {ciudad.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 col-md-4 col-lg-2">
                    <label htmlFor="categoria" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-tags me-1" aria-hidden="true" />
                      Categoría
                    </label>
                    <select
                      className="form-select form-select-sm"
                      id="categoria"
                      value={params.get("categoria") ?? ""}
                      onChange={(event) => updateFilters({ categoria: event.target.value })}
                    >
                      <option value="">Todas las categorías</option>
                      <option value="particular">{CATEGORIA_LABELS.particular}</option>
                      <option value="corporativo">{CATEGORIA_LABELS.corporativo}</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-4 col-lg-2">
                    <label htmlFor="per_page" className="form-label small text-dark text-uppercase fw-semibold">
                      <i className="fas fa-list me-1" aria-hidden="true" />
                      Por página
                    </label>
                    <select
                      className="form-select form-select-sm"
                      id="per_page"
                      value={String(perPage)}
                      onChange={(event) =>
                        updateFilters({ per_page: event.target.value, page: "1" }, false)
                      }
                    >
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="200">200</option>
                      <option value="500">500</option>
                    </select>
                  </div>
                  <div className="col-12 d-flex gap-2 flex-wrap justify-content-center align-items-center">
                    <div className="form-check mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="remember-filters-toggle-clients"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                      />
                      <label className="form-check-label small text-muted" htmlFor="remember-filters-toggle-clients">
                        Recordar filtros
                      </label>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">
                      <i className="fas fa-search me-1" aria-hidden="true" />
                      Buscar
                    </button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
                      <i className="fas fa-undo-alt me-1" aria-hidden="true" />
                      Reiniciar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      title="Imprimir listado"
                      onClick={printList}
                    >
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

      <div className="row" id="clients-results">
        <div className="col-12">
          <div className="card content-card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-list me-2" aria-hidden="true" />
                Lista de clientes
                {data && data.items.length > 0
                  ? ` (${data.total} total${filtersActive ? ` - ${data.items.length} mostrados` : ""})`
                  : null}
              </h5>
              {data && data.items.length > 0 ? (
                <div className="small text-white-50">
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
                  <i className="fas fa-user-plus fa-3x text-muted mb-3" aria-hidden="true" />
                  {filtersActive ? (
                    <>
                      <h5 className="text-muted">No se encontraron clientes</h5>
                      <p className="text-muted">Intente cambiar los filtros de búsqueda</p>
                      <button type="button" className="btn btn-outline-primary" onClick={resetFilters}>
                        <i className="fas fa-times me-1" aria-hidden="true" />
                        Limpiar filtros
                      </button>
                    </>
                  ) : (
                    <>
                      <h5 className="text-muted">No hay clientes registrados</h5>
                      <p className="text-muted">Comience agregando su primer cliente</p>
                      <Link to="/clientes/nuevo" className="btn btn-primary">
                        <i className="fas fa-plus me-1" aria-hidden="true" />
                        Añadir cliente
                      </Link>
                    </>
                  )}
                </div>
              ) : null}
              {data && data.items.length > 0 ? (
                <>
                  <div className="table-responsive d-none d-lg-block d-print-block">
                    <table className="table table-hover mb-0 clients-table">
                      <thead>
                        <tr>
                          <SortTh column="id" label="ID" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                          <th className="text-white text-center col-categoria-icon" title="Cliente corporativo">
                            Categoría
                          </th>
                          <SortTh
                            column="nombre"
                            label="Nombre"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={toggleSort}
                          />
                          <th className="text-white">Teléfono</th>
                          <SortTh
                            column="direccion"
                            label="Dirección"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={toggleSort}
                          />
                          <th className="text-white">Barrio</th>
                          <th className="text-white">Ciudad</th>
                          <th className="text-white">IP Router</th>
                          <th className="text-white">IP Antea</th>
                          <SortTh
                            column="incidents"
                            label="Incidencias"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={toggleSort}
                          />
                          <th className="text-white">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((client) => (
                          <tr key={client.id}>
                            <td>
                              <strong>#{client.id}</strong>
                            </td>
                            <td className="col-categoria-icon text-center">
                              {client.categoria === "corporativo" ? (
                                <img
                                  src="/static/img/icon-cliente-corporativo.png"
                                  alt="Cliente corporativo"
                                  title="Cliente corporativo"
                                  className="icon-cliente-corporativo"
                                  width={22}
                                  height={22}
                                />
                              ) : null}
                            </td>
                            <td>
                              <i className="fas fa-user-tie me-1" aria-hidden="true" />
                              <Link
                                to={`/clientes/${client.id}?next=${encodeURIComponent(returnTo)}`}
                                className="text-decoration-none text-dark"
                              >
                                {client.nom}
                              </Link>
                            </td>
                            <td>
                              📞{" "}
                              <a
                                href={`https://wa.me/+240${client.telephone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-decoration-none"
                              >
                                {client.telephone}
                              </a>
                            </td>
                            <td>
                              <i className="fas fa-map-marker-alt me-1 text-muted" aria-hidden="true" />
                              {client.adresse}
                            </td>
                            <td>
                              <i className="fas fa-map-marker-alt me-1 text-muted" aria-hidden="true" />
                              {client.ville}
                            </td>
                            <td>🌆 {client.ciudad?.nombre ?? "N/A"}</td>
                            <td>
                              {client.ip_router ? (
                                <code>
                                  <a href={`http://${client.ip_router}`} target="_blank" rel="noreferrer">
                                    {client.ip_router}
                                  </a>
                                </code>
                              ) : null}
                            </td>
                            <td>
                              {client.ip_antea ? (
                                <code>
                                  <a href={`http://${client.ip_antea}`} target="_blank" rel="noreferrer">
                                    {client.ip_antea}
                                  </a>
                                </code>
                              ) : null}
                            </td>
                            <td>
                              <span className="badge bg-secondary">{client.incidencias}</span>
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <Link
                                  to={`/clientes/${client.id}?next=${encodeURIComponent(returnTo)}`}
                                  className="btn btn-sm btn-outline-info"
                                  title="Ver la ficha"
                                >
                                  <i className="fas fa-file-alt" aria-hidden="true" />
                                </Link>
                                <Link
                                  to={`/clientes/${client.id}/editar?next=${encodeURIComponent(returnTo)}`}
                                  className="btn btn-sm btn-outline-primary"
                                  title="Editar"
                                >
                                  <i className="fas fa-edit" aria-hidden="true" />
                                </Link>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success"
                                  title="Copiar información"
                                  onClick={() => copyClient(client)}
                                >
                                  <i className="fas fa-copy" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  title="Eliminar"
                                  onClick={() => setPendingDelete(client)}
                                >
                                  <i className="fas fa-trash" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mobile-list d-lg-none d-print-none" id="clients-mobile-list">
                    {data.items.map((client) => (
                      <ClientMobileCard
                        key={client.id}
                        client={client}
                        onCopy={() => copyClient(client)}
                        onDelete={() => setPendingDelete(client)}
                      />
                    ))}
                  </div>
                  {data.pages > 1 ? (
                    <div className="card-footer">
                      <ListPagination
                        page={page}
                        perPage={perPage}
                        total={data.total}
                        noun="clientes"
                        label="Paginación de los clientes"
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
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirmar la eliminación</h5>
                  <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setPendingDelete(null)} />
                </div>
                <div className="modal-body">
                  <p>
                    ¿Está seguro de que desea eliminar el cliente <strong>{pendingDelete.nom}</strong> ?
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
          className="position-fixed text-white bg-success border-0"
          style={{ top: 20, right: 20, zIndex: 9999, borderRadius: 8, padding: "12px 16px", maxWidth: 320 }}
        >
          <i className="fas fa-check-circle me-2" aria-hidden="true" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function SortTh({
  column,
  label,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: string;
  label: string;
  sortBy: string;
  sortOrder: string;
  onSort: (column: string) => void;
}) {
  return (
    <th>
      <a
        href="#ordenar"
        className="text-white text-decoration-none"
        onClick={(event) => {
          event.preventDefault();
          onSort(column);
        }}
      >
        {label}{" "}
        {sortBy === column ? (
          <i className={`fas fa-sort-${sortOrder === "asc" ? "up" : "down"}`} aria-hidden="true" />
        ) : (
          <i className="fas fa-sort" aria-hidden="true" />
        )}
      </a>
    </th>
  );
}

function ClientMobileCard({
  client,
  onCopy,
  onDelete,
}: {
  client: ClientItem;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  return (
    <article className="mobile-list-card">
      <div className="mobile-list-card__head">
        <div className="mobile-list-card__meta">
          <span className="mobile-list-card__id">#{client.id}</span>
          {client.categoria === "corporativo" ? (
            <img
              src="/static/img/icon-cliente-corporativo.png"
              alt="Cliente corporativo"
              title="Cliente corporativo"
              className="icon-cliente-corporativo"
              width={22}
              height={22}
            />
          ) : (
            <span className="badge bg-light text-dark">{CATEGORIA_LABELS[client.categoria] ?? "Particular"}</span>
          )}
          <span className="badge bg-secondary">{client.incidencias} incidencias</span>
        </div>
        <CardMenu>
          <li>
            <Link className="dropdown-item" to={`/clientes/${client.id}?next=${next}`}>
              <i className="fas fa-file-alt me-2" aria-hidden="true" />
              Ver la ficha
            </Link>
          </li>
          <li>
            <Link className="dropdown-item" to={`/clientes/${client.id}/editar?next=${next}`}>
              <i className="fas fa-edit me-2" aria-hidden="true" />
              Editar
            </Link>
          </li>
          <li>
            <button type="button" className="dropdown-item" onClick={onCopy}>
              <i className="fas fa-copy me-2" aria-hidden="true" />
              Copiar información
            </button>
          </li>
          <li>
            <hr className="dropdown-divider" />
          </li>
          <li>
            <button type="button" className="dropdown-item text-danger" onClick={onDelete}>
              <i className="fas fa-trash me-2" aria-hidden="true" />
              Eliminar
            </button>
          </li>
        </CardMenu>
      </div>
      <Link className="mobile-list-card__title" to={`/clientes/${client.id}?next=${next}`}>
        <i className="fas fa-user-tie me-1" aria-hidden="true" />
        {client.nom}
      </Link>
      {client.adresse ? (
        <p className="mobile-list-card__subtitle">
          <i className="fas fa-map-marker-alt me-1" aria-hidden="true" />
          {client.adresse}
        </p>
      ) : null}
      <div className="mobile-list-card__badges">
        {client.telephone ? (
          <a
            className="badge rounded-pill mobile-list-card__chip text-decoration-none"
            href={`https://wa.me/+240${client.telephone}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fab fa-whatsapp me-1" aria-hidden="true" />
            {client.telephone}
          </a>
        ) : null}
        {client.ville ? (
          <span className="badge rounded-pill mobile-list-card__chip">
            <i className="fas fa-map-marker-alt me-1" aria-hidden="true" />
            {client.ville}
          </span>
        ) : null}
        <span className="badge rounded-pill mobile-list-card__chip">
          <i className="fas fa-city me-1" aria-hidden="true" />
          {client.ciudad?.nombre ?? "N/A"}
        </span>
        {client.ip_router ? (
          <a
            className="badge rounded-pill mobile-list-card__chip text-decoration-none"
            href={`http://${client.ip_router}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fas fa-network-wired me-1" aria-hidden="true" />
            {client.ip_router}
          </a>
        ) : null}
        {client.ip_antea ? (
          <a
            className="badge rounded-pill mobile-list-card__chip text-decoration-none"
            href={`http://${client.ip_antea}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fas fa-server me-1" aria-hidden="true" />
            {client.ip_antea}
          </a>
        ) : null}
      </div>
    </article>
  );
}
