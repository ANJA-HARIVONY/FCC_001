import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import { ESTADO_BADGE, TIPO_BADGE, type InstalacionDetail } from "./types";

export function InstalacionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<InstalacionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: item ? `Instalación #${item.id}` : "Instalación",
    icon: <i className="fas fa-building" aria-hidden="true" />,
    subtitle: item ? `${item.tipo_label} · ${item.client.nom}` : "",
    actions: item ? (
      <>
        <Link to="/instalaciones" className="btn btn-secondary btn-sm">
          Volver
        </Link>
        <Link to={`/instalaciones/${item.id}/editar`} className="btn btn-warning btn-sm">
          Modificar
        </Link>
        {item.estado === "en_curso" ? (
          <button type="button" className="btn btn-success btn-sm" onClick={() => void terminar()}>
            Terminar
          </button>
        ) : (
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => void reabrir()}>
            Reabrir
          </button>
        )}
      </>
    ) : null,
  });

  async function reload() {
    const payload = await api<{ item: InstalacionDetail }>(`/api/instalaciones/${id}`);
    setItem(payload.item);
  }

  useEffect(() => {
    let cancelled = false;
    api<{ item: InstalacionDetail }>(`/api/instalaciones/${id}`)
      .then((payload) => {
        if (!cancelled) {
          setItem(payload.item);
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
  }, [id]);

  async function terminar() {
    try {
      await api(`/api/instalaciones/${id}/terminar`, { method: "POST", body: "{}" });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function reabrir() {
    try {
      await api(`/api/instalaciones/${id}/reabrir`, { method: "POST", body: "{}" });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function eliminar() {
    if (!item?.can_delete) {
      window.alert("Un traslado no se puede eliminar.");
      return;
    }
    if (!window.confirm(`¿Eliminar la instalación #${item.id}?`)) {
      return;
    }
    try {
      await api(`/api/instalaciones/${item.id}`, { method: "DELETE" });
      navigate("/instalaciones");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  if (error && !item) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }
  if (!item) {
    return <p className="p-3">Cargando…</p>;
  }

  return (
    <div className="container-fluid px-0">
      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}
      <div className="card content-card mb-3">
        <div className="card-body">
          <p>
            <strong>Fecha:</strong> {item.fecha}
          </p>
          <p>
            <strong>Tipo:</strong>{" "}
            <span className={`badge ${TIPO_BADGE[item.tipo] ?? "bg-secondary"}`}>{item.tipo_label}</span>
          </p>
          <p>
            <strong>Estado:</strong>{" "}
            <span className={`badge ${ESTADO_BADGE[item.estado] ?? "bg-secondary"}`}>{item.estado_label}</span>
          </p>
          <p>
            <strong>Técnico:</strong> {item.tecnico.nom}
          </p>
          <p>
            <strong>Cliente:</strong>{" "}
            <Link to={`/clientes/${item.client.id}`}>{item.client.nom}</Link>
          </p>
          <p>
            <strong>Sitio:</strong>{" "}
            {item.sitio ? `${item.sitio.adresse}, ${item.sitio.ville}` : "—"}
          </p>
          <p>
            <strong>Observaciones:</strong> {item.observaciones || "—"}
          </p>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
            <h6 className="mb-0">Materiales (salidas)</h6>
            <Link
              to={`/materiales/salidas/nueva?tipo=instalacion&instalacion=${item.id}`}
              className="btn btn-primary btn-sm"
            >
              <i className="fas fa-plus me-1" aria-hidden="true" />
              Añadir material
            </Link>
          </div>
          {item.salidas.length === 0 ? (
            <p className="text-muted">Sin salidas de material.</p>
          ) : (
            <ul>
              {item.salidas.map((salida) => (
                <li key={salida.id}>
                  <Link to={`/materiales/salidas/${salida.id}`}>Salida #{salida.id}</Link>
                  <ul>
                    {salida.lineas.map((linea, index) => (
                      <li key={index}>
                        {linea.material?.nombre ?? `#${linea.id_material}`} × {linea.cantidad}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          {item.tipo === "traslado" && item.traslado_lineas.length > 0 ? (
            <>
              <h6 className="mt-3">Líneas de traslado</h6>
              <ul>
                {item.traslado_lineas.map((linea) => (
                  <li key={linea.id}>
                    {linea.material?.nombre ?? `#${linea.id_material}`} × {linea.cantidad} ({linea.accion})
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {item.can_delete ? (
            <button type="button" className="btn btn-outline-danger btn-sm mt-2" onClick={() => void eliminar()}>
              Eliminar
            </button>
          ) : (
            <p className="small text-muted mt-2 mb-0">Un traslado no se puede eliminar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
