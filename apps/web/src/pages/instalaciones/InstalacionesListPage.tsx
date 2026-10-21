import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { clampListPerPage } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { ListPagination } from "../../components/ListPagination";
import { usePageMeta } from "../../layout/Shell";
import { ESTADO_BADGE, TIPO_BADGE, type InstalacionListItem } from "./types";
import { instalacionCopyText } from "./copy";

interface ListResponse {
  items: InstalacionListItem[];
  page: number;
  pages: number;
  per_page: number;
  total: number;
  filters: Record<string, string>;
  meta: {
    tecnicos: { id: number; nom: string }[];
    estados: { value: string; label: string }[];
    tipos: { value: string; label: string }[];
  };
}

export function InstalacionesListPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [draftSearch, setDraftSearch] = useState(params.get("search") ?? "");

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams(params);
      if (!qs.get("per_page")) {
        qs.set("per_page", "50");
      }
      const payload = await api<ListResponse>(`/api/instalaciones?${qs.toString()}`);
      setData(payload);
      setDraftSearch(payload.filters.search ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  const actions = useMemo(
    () => (
      <Link to="/instalaciones/nueva" className="btn btn-primary btn-sm">
        <i className="fas fa-plus me-1" aria-hidden="true" />
        Nueva instalación
      </Link>
    ),
    [],
  );

  usePageMeta({
    title: "Instalaciones",
    icon: <i className="fas fa-building" aria-hidden="true" />,
    subtitle: "Nuevas instalaciones y traslados",
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

  async function removeItem(item: InstalacionListItem) {
    if (!item.can_delete) {
      window.alert("Un traslado no se puede eliminar.");
      return;
    }
    if (!window.confirm(`¿Eliminar la instalación #${item.id}?`)) {
      return;
    }
    try {
      await api(`/api/instalaciones/${item.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function copyItem(item: InstalacionListItem) {
    const texte = instalacionCopyText(item.client.nom, item.materiales_lineas ?? [], item.tecnico.nom);
    try {
      await navigator.clipboard.writeText(texte);
      setCopyMsg("Información de la instalación copiada al portapapeles");
    } catch {
      setCopyMsg("Error al copiar. Intente seleccionar y copiar manualmente.");
    }
    window.setTimeout(() => setCopyMsg(null), 2500);
  }

  const page = Math.max(1, Number(params.get("page") ?? data?.page ?? 1) || 1);
  const perPage = clampListPerPage(params.get("per_page") ?? data?.per_page);

  return (
    <div className="container-fluid px-0">
      <div className="card content-card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Filtros de búsqueda</h5>
        </div>
        <div className="card-body">
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              updateFilters({ search: draftSearch.trim() });
            }}
          >
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label small text-uppercase fw-semibold" htmlFor="search">
                  Buscar
                </label>
                <input
                  id="search"
                  className="form-control form-control-sm"
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small text-uppercase fw-semibold" htmlFor="estado">
                  Estado
                </label>
                <select
                  id="estado"
                  className="form-select form-select-sm"
                  value={params.get("estado") ?? ""}
                  onChange={(event) => updateFilters({ estado: event.target.value })}
                >
                  <option value="">Todos</option>
                  {(data?.meta.estados ?? []).map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small text-uppercase fw-semibold" htmlFor="tipo">
                  Tipo
                </label>
                <select
                  id="tipo"
                  className="form-select form-select-sm"
                  value={params.get("tipo") ?? ""}
                  onChange={(event) => updateFilters({ tipo: event.target.value })}
                >
                  <option value="">Todos</option>
                  {(data?.meta.tipos ?? []).map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small text-uppercase fw-semibold" htmlFor="tecnico">
                  Técnico
                </label>
                <select
                  id="tecnico"
                  className="form-select form-select-sm"
                  value={params.get("tecnico") ?? ""}
                  onChange={(event) => updateFilters({ tecnico: event.target.value })}
                >
                  <option value="">Todos</option>
                  {(data?.meta.tecnicos ?? []).map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-primary btn-sm">
                  Buscar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}
      {copyMsg ? <div className="alert alert-success py-2">{copyMsg}</div> : null}

      <div className="card content-card">
        <div className="card-header">
          <h5 className="mb-0">Lista de instalaciones {data ? `(${data.total})` : ""}</h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Técnico</th>
                <th>Cliente</th>
                <th>Materiales</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>#{item.id}</strong>
                  </td>
                  <td>{item.fecha}</td>
                  <td>
                    <span className={`badge ${TIPO_BADGE[item.tipo] ?? "bg-secondary"}`}>{item.tipo_label}</span>
                  </td>
                  <td>{item.tecnico.nom}</td>
                  <td>{item.client.nom}</td>
                  <td>
                    <div className="text-truncate" style={{ maxWidth: 200 }} title={item.materiales}>
                      {item.materiales}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${ESTADO_BADGE[item.estado] ?? "bg-secondary"}`}>
                      {item.estado_label}
                    </span>
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <Link to={`/instalaciones/${item.id}`} className="btn btn-outline-info" title="Ver">
                        <i className="fas fa-eye" aria-hidden="true" />
                      </Link>
                      <Link to={`/instalaciones/${item.id}/editar`} className="btn btn-outline-primary" title="Modificar">
                        <i className="fas fa-edit" aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        className="btn btn-outline-success"
                        title="Copiar información"
                        onClick={() => void copyItem(item)}
                      >
                        <i className="fas fa-copy" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        title="Eliminar"
                        disabled={!item.can_delete}
                        onClick={() => void removeItem(item)}
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
        {data && data.items.length === 0 ? (
          <p className="text-center text-muted py-4 mb-0">Sin instalaciones.</p>
        ) : null}
        {data && data.pages > 1 ? (
          <div className="card-footer">
            <ListPagination
              page={page}
              perPage={perPage}
              total={data.total}
              noun="instalaciones"
              label="Paginación de las instalaciones"
              onPage={(value) => updateFilters({ page: String(value) }, false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
