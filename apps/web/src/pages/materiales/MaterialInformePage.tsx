import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { ListPagination } from "../../components/ListPagination";
import { usePageMeta } from "../../layout/Shell";

interface InformePayload {
  date_from: string;
  date_to: string;
  error: string | null;
  resumen: {
    salidas_count: number;
    salidas_count_label: string;
    materiales_distintos: number;
    material_rows: { label: string; cantidad_total: number }[];
  } | null;
  materiales: { id: number; label: string }[];
  tecnicos: { id: number; nom: string }[];
  tipos: { value: string; label: string }[];
  page: number;
  per_page: number;
  total: number;
  items: {
    id: number;
    fecha: string;
    tecnico: string;
    cliente: string;
    material: string;
    tipo_salida: string;
    tipo_salida_label: string;
    cantidad: number;
  }[];
}

const BADGE: Record<string, string> = {
  uso_interno: "bg-success",
  incidencia: "bg-warning text-dark",
  instalacion: "bg-primary",
};

export function MaterialInformePage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<InformePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(params.get("date_from") ?? "");
  const [dateTo, setDateTo] = useState(params.get("date_to") ?? "");
  const [tipo, setTipo] = useState(params.get("tipo_salida") ?? "");
  const [tecnico, setTecnico] = useState(params.get("tecnico") ?? "");
  const [material, setMaterial] = useState(params.get("material") ?? "");

  usePageMeta({
    title: "Informe de salidas",
    icon: <i className="fas fa-chart-bar" aria-hidden="true" />,
    subtitle: "Análisis de salidas de material",
    actions: (
      <Link to="/materiales" className="btn btn-outline-secondary btn-sm">
        <i className="fas fa-arrow-left me-1" aria-hidden="true" />
        Volver
      </Link>
    ),
  });

  useEffect(() => {
    const query = params.toString();
    void api<InformePayload>(`/api/materiales/informe${query ? `?${query}` : ""}`)
      .then((payload) => {
        setData(payload);
        setError(null);
        setDateFrom(payload.date_from);
        setDateTo(payload.date_to);
        setTipo(params.get("tipo_salida") ?? "");
        setTecnico(params.get("tecnico") ?? "");
        setMaterial(params.get("material") ?? "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error"));
  }, [params]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (dateFrom) next.set("date_from", dateFrom);
    if (dateTo) next.set("date_to", dateTo);
    if (tipo) next.set("tipo_salida", tipo);
    if (tecnico) next.set("tecnico", tecnico);
    if (material) next.set("material", material);
    setParams(next);
  }

  const exportParams = new URLSearchParams(params);
  if (data?.date_from) exportParams.set("date_from", data.date_from);
  if (data?.date_to) exportParams.set("date_to", data.date_to);

  return (
    <div className="container-fluid px-0">
      <nav aria-label="breadcrumb" className="app-breadcrumb page-title-breadcrumb mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/materiales">Materiales</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Informe
          </li>
        </ol>
      </nav>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <div className="card content-card mb-4">
        <div className="card-body">
          <form className="row g-2 align-items-end" onSubmit={onSubmit}>
            <div className="col-md-2">
              <label className="form-label small" htmlFor="date_from">
                Fecha desde <span className="text-danger">*</span>
              </label>
              <input id="date_from" type="date" className="form-control form-control-sm" value={dateFrom} required onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label small" htmlFor="date_to">
                Fecha hasta <span className="text-danger">*</span>
              </label>
              <input id="date_to" type="date" className="form-control form-control-sm" value={dateTo} required onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label small" htmlFor="tipo_salida">Tipo de salida</label>
              <select id="tipo_salida" className="form-select form-select-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Todos</option>
                {(data?.tipos ?? []).map((row) => (
                  <option key={row.value} value={row.value}>{row.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small" htmlFor="tecnico">Técnico</label>
              <select id="tecnico" className="form-select form-select-sm" value={tecnico} onChange={(e) => setTecnico(e.target.value)}>
                <option value="">Todos</option>
                {(data?.tecnicos ?? []).map((row) => (
                  <option key={row.id} value={row.id}>{row.nom}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small" htmlFor="material">Material</label>
              <select id="material" className="form-select form-select-sm" value={material} onChange={(e) => setMaterial(e.target.value)}>
                <option value="">Todos</option>
                {(data?.materiales ?? []).map((row) => (
                  <option key={row.id} value={row.id}>{row.label}</option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <button type="submit" className="btn btn-sm btn-primary me-1">Generar</button>
              <Link to="/materiales/informe" className="btn btn-sm btn-outline-secondary">Limpiar</Link>
            </div>
          </form>
          {data?.error ? <div className="alert alert-danger mt-3 mb-0">{data.error}</div> : null}
        </div>
      </div>

      {data?.resumen && !data.error ? (
        <>
          <div className="card content-card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-chart-pie me-2" aria-hidden="true" />
                Resumen
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="card border h-100">
                    <div className="card-body text-center py-3">
                      <div className="fs-3">{data.resumen.salidas_count}</div>
                      <div className="text-muted small">{data.resumen.salidas_count_label}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border h-100">
                    <div className="card-body text-center py-3">
                      <div className="fs-3">{data.resumen.materiales_distintos}</div>
                      <div className="text-muted small">Materiales distintos</div>
                    </div>
                  </div>
                </div>
              </div>
              <h6 className="mb-3">Totales por material</h6>
              {data.resumen.material_rows.length ? (
                <>
                  <div className="table-responsive d-none d-lg-block d-print-block">
                    <table className="table table-hover table-sm table-bordered mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Material</th>
                          <th className="text-center">Cantidad total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.resumen.material_rows.map((row) => (
                          <tr key={row.label}>
                            <td>{row.label}</td>
                            <td className="text-center fw-semibold">{row.cantidad_total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mobile-list d-lg-none d-print-none" id="informe-materiales-mobile">
                    {data.resumen.material_rows.map((row) => (
                      <article key={row.label} className="mobile-list-card">
                        <div className="mobile-list-card__head">
                          <div className="mobile-list-card__meta">
                            <span className="badge bg-secondary">{row.cantidad_total}</span>
                          </div>
                        </div>
                        <span className="mobile-list-card__title">{row.label}</span>
                        <p className="mobile-list-card__subtitle">Cantidad total</p>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted mb-0">No hay datos en este período.</p>
              )}
            </div>
          </div>
          <div className="card content-card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-list me-2" aria-hidden="true" />
                Detalle
              </h5>
              <div className="d-flex align-items-center gap-2">
                <small>{data.total} línea{data.total === 1 ? "" : "s"}</small>
                <a className="btn btn-sm btn-success" href={`/api/materiales/informe/export.xlsx?${exportParams.toString()}`}>
                  <i className="fas fa-file-excel me-1" aria-hidden="true" />
                  Exportar en Excel
                </a>
              </div>
            </div>
            <div className="card-body p-0">
              {data.items.length ? (
                <>
                  <div className="table-responsive d-none d-lg-block d-print-block">
                    <table className="table table-hover mb-0 align-middle">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Técnico</th>
                          <th>Cliente</th>
                          <th>Material</th>
                          <th>Tipo salida</th>
                          <th className="text-center">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((row) => (
                          <tr key={row.id}>
                            <td>{row.fecha}</td>
                            <td>{row.tecnico}</td>
                            <td>{row.cliente}</td>
                            <td>{row.material}</td>
                            <td>
                              <span className={`badge ${BADGE[row.tipo_salida] ?? "bg-secondary"}`}>{row.tipo_salida_label}</span>
                            </td>
                            <td className="text-center">{row.cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mobile-list d-lg-none d-print-none" id="informe-detalle-mobile">
                    {data.items.map((row) => (
                      <article key={row.id} className="mobile-list-card">
                        <div className="mobile-list-card__head">
                          <div className="mobile-list-card__meta">
                            <span className={`badge ${BADGE[row.tipo_salida] ?? "bg-secondary"}`}>{row.tipo_salida_label}</span>
                            <span className="badge bg-light text-dark">×{row.cantidad}</span>
                          </div>
                          <span className="badge rounded-pill mobile-list-card__chip mobile-list-card__chip--date">
                            <i className="fas fa-clock me-1" aria-hidden="true" />
                            {row.fecha}
                          </span>
                        </div>
                        <span className="mobile-list-card__title">{row.material}</span>
                        <div className="mobile-list-card__badges">
                          <span className="badge rounded-pill mobile-list-card__chip">
                            <i className="fas fa-user-cog me-1" aria-hidden="true" />
                            {row.tecnico}
                          </span>
                          <span className="badge rounded-pill mobile-list-card__chip">
                            <i className="fas fa-user-tie me-1" aria-hidden="true" />
                            {row.cliente}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-5 px-3">
                  <i className="fas fa-list fa-3x text-muted mb-3" aria-hidden="true" />
                  <h5 className="text-muted">No hay líneas en este período.</h5>
                </div>
              )}
            </div>
          </div>
          <div className="d-flex justify-content-end mt-3">
            <ListPagination
              page={data.page}
              perPage={data.per_page}
              total={data.total}
              variant="compact"
              align="end"
              label="Paginación del informe"
              onPage={(page) => {
                const next = new URLSearchParams(params);
                next.set("page", String(page));
                setParams(next);
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
