import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";

export function MaterialesHubPage() {
  const [totals, setTotals] = useState({ total_materiales: 0, total_salidas: 0 });
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: "Materiales",
    icon: <i className="fas fa-toolbox" aria-hidden="true" />,
    subtitle: "Trazabilidad de herramientas y materiales de cliente",
  });

  useEffect(() => {
    let cancelled = false;
    api<{ total_materiales: number; total_salidas: number }>("/api/materiales")
      .then((payload) => {
        if (!cancelled) {
          setTotals(payload);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container-fluid px-0">
      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}
      <div className="row g-4">
        <div className="col-md-6 col-lg-3">
          <div className="card content-card h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="fas fa-list me-2" aria-hidden="true" />
                Catálogo
              </h5>
              <p className="card-text text-muted small">
                {totals.total_materiales} material{totals.total_materiales !== 1 ? "es" : ""} en el catálogo
              </p>
              <Link to="/materiales/catalogo" className="btn btn-outline-primary btn-sm">
                Gestionar
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card content-card h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="fas fa-plus-circle me-2" aria-hidden="true" />
                Nueva salida
              </h5>
              <p className="card-text text-muted small">Registrar una asignación a un técnico</p>
              <Link to="/materiales/salidas?nueva=1" className="btn btn-primary btn-sm">
                Crear salida
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card content-card h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="fas fa-clipboard-list me-2" aria-hidden="true" />
                Salidas
              </h5>
              <p className="card-text text-muted small">
                {totals.total_salidas} salida{totals.total_salidas !== 1 ? "s" : ""} registrada
                {totals.total_salidas !== 1 ? "s" : ""}
              </p>
              <Link to="/materiales/salidas" className="btn btn-outline-info btn-sm">
                Ver lista
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card content-card h-100">
            <div className="card-body">
              <h5 className="card-title">
                <i className="fas fa-chart-bar me-2" aria-hidden="true" />
                Informe
              </h5>
              <p className="card-text text-muted small">Estado global por período</p>
              <Link to="/materiales/informe" className="btn btn-outline-warning btn-sm">
                Consultar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
