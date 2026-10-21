import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";

interface FichaPayload {
  tecnico: {
    nom: string;
    telephone: string;
    email: string | null;
    categoria_label: string;
    agencia: string;
    ciudad: string;
  };
  items: {
    id: number;
    fecha: string;
    material: string;
    tipo: string;
    cantidad: number;
    cliente: string;
  }[];
}

export function TecnicoFichaPage() {
  const { id } = useParams();
  const [data, setData] = useState<FichaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: data?.tecnico.nom ?? "Ficha técnico",
    icon: <i className="fas fa-user-cog" aria-hidden="true" />,
    subtitle: data ? `${data.tecnico.categoria_label} — ${data.tecnico.agencia}` : undefined,
    actions: (
      <Link to="/usuarios" className="btn btn-secondary btn-sm">
        Volver a usuarios
      </Link>
    ),
  });

  useEffect(() => {
    void api<FichaPayload>(`/api/tecnicos/${id}/ficha`)
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error"));
  }, [id]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <p>Cargando…</p>;

  return (
    <div className="container-fluid px-0">
      <nav aria-label="breadcrumb" className="app-breadcrumb page-title-breadcrumb mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/usuarios">Usuarios</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {data.tecnico.nom}
          </li>
        </ol>
      </nav>
      <div className="card content-card mb-4">
        <div className="card-header"><h5 className="mb-0">Datos del técnico</h5></div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4"><strong>Teléfono:</strong> {data.tecnico.telephone}</div>
            <div className="col-md-4"><strong>Correo:</strong> {data.tecnico.email || "—"}</div>
            <div className="col-md-4"><strong>Ciudad:</strong> {data.tecnico.ciudad || "—"}</div>
          </div>
        </div>
      </div>
      <div className="card content-card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-toolbox me-2" aria-hidden="true" />
            Materiales asignados
          </h5>
        </div>
        <div className="card-body p-0">
          {data.items.length ? (
            <>
              <div className="table-responsive d-none d-lg-block d-print-block">
                <table className="table table-hover mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Material</th>
                      <th>Tipo</th>
                      <th className="text-end">Cantidad</th>
                      <th>Cliente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row.id}>
                        <td>{row.fecha}</td>
                        <td>{row.material}</td>
                        <td>{row.tipo}</td>
                        <td className="text-end">{row.cantidad}</td>
                        <td>{row.cliente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-list d-lg-none d-print-none" id="tecnico-materiales-mobile">
                {data.items.map((row) => (
                  <article key={row.id} className="mobile-list-card">
                    <div className="mobile-list-card__head">
                      <div className="mobile-list-card__meta">
                        <span className="badge bg-secondary">{row.tipo}</span>
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
              <i className="fas fa-toolbox fa-3x text-muted mb-3" aria-hidden="true" />
              <h5 className="text-muted">No hay materiales registrados para este técnico.</h5>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
