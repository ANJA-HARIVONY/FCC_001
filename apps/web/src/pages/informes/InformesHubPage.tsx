import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import {
  STATUT_BADGE,
  STATUT_LABEL,
  formatDateTime,
  type InformeListItem,
  type InformeType,
} from "./types";

interface HubResponse {
  items: InformeListItem[];
  total: number;
  hoy: number;
  types: InformeType[];
}

export function InformesHubPage() {
  const [data, setData] = useState<HubResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const payload = await api<HubResponse>("/api/informes");
      setData(payload);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actions = useMemo(
    () => (
      <>
        <span className="badge bg-primary">{data?.total ?? 0} informes</span>
        <span className="badge bg-success">{data?.hoy ?? 0} hoy</span>
        <Link to="/informes/nuevo" className="btn btn-primary btn-sm">
          <i className="fas fa-plus me-1" aria-hidden="true" />
          Nuevo Informe
        </Link>
      </>
    ),
    [data?.hoy, data?.total],
  );

  usePageMeta({
    title: "Informes",
    icon: <i className="fas fa-chart-bar" aria-hidden="true" />,
    subtitle: "Análisis e informes del servicio",
    actions,
  });

  async function removeItem(item: InformeListItem) {
    if (!window.confirm(`¿Eliminar el informe "${item.titre}"?`)) {
      return;
    }
    try {
      await api(`/api/informes/${item.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  return (
    <div className="container-fluid px-0 etats-page">
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h5 className="mb-0 fw-semibold">
          <i className="fas fa-layer-group me-2" aria-hidden="true" />
          Tipos de Informes Disponibles
        </h5>
        <Link to="/informes/nuevo" className="btn btn-outline-primary btn-sm">
          <i className="fas fa-rocket me-1" aria-hidden="true" />
          Generar un Informe Ahora
        </Link>
      </div>

      <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 mb-4 g-3">
        {(data?.types ?? []).map((type) => (
          <div className="col" key={type.id}>
            <div className={`card stat-card stat-card--${type.kpi} h-100`}>
              <div className="card-body">
                <div className="stat-card-inner stat-card-inner--start">
                  <div className={`stat-card-icon stat-card-icon--${type.kpi}`} aria-hidden="true">
                    <i className={`fas ${type.icon}`} />
                  </div>
                  <div className="stat-card-copy">
                    <div className="stat-card-title">{type.nom}</div>
                    <p className="stat-card-desc mb-0">{type.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-0 etats-section-card">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
          <h5 className="mb-0 fw-semibold">
            <i className="fas fa-history me-2" aria-hidden="true" />
            Informes Recientes
          </h5>
          <small className="text-muted">Últimos 20 generados</small>
        </div>
        <div className="card-body p-0">
          {!data ? (
            <p className="text-muted p-3 mb-0">Cargando…</p>
          ) : data.items.length === 0 ? (
            <p className="text-muted p-3 mb-0">No hay informes todavía.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Informe</th>
                    <th>Tipo</th>
                    <th>Período</th>
                    <th>Estado</th>
                    <th>Generado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.titre}</strong>
                      </td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-75">{item.type_label}</span>
                      </td>
                      <td>{item.periode_label}</td>
                      <td>
                        <span className={`badge ${STATUT_BADGE[item.statut] ?? "bg-secondary"}`}>
                          {STATUT_LABEL[item.statut] ?? item.statut}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">{formatDateTime(item.date_creation)}</small>
                      </td>
                      <td className="text-center text-nowrap">
                        <Link
                          to={`/informes/${item.id}`}
                          className="btn btn-sm btn-outline-primary me-1"
                          title="Ver"
                        >
                          <i className="fas fa-eye" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Eliminar"
                          onClick={() => void removeItem(item)}
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
