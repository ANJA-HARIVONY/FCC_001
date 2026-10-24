import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import { instalacionCopyText } from "./copy";
import {
  ESTADO_BADGE,
  TIPO_BADGE,
  TRASLADO_ACCION_BADGE,
  TRASLADO_ACCION_LABEL,
  formatFecha,
  formatFechaHora,
  type InstalacionDetail,
} from "./types";

export function InstalacionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<InstalacionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  usePageMeta({
    title: item ? `Instalación #${item.id}` : "Instalación",
    icon: <i className="fas fa-building" aria-hidden="true" />,
    subtitle: item?.client.nom ?? "",
    actions: item ? (
      <>
        <Link to="/instalaciones" className="btn btn-outline-secondary btn-sm">
          <i className="fas fa-arrow-left me-1" aria-hidden="true" />
          Volver
        </Link>
        <button type="button" className="btn btn-outline-success btn-sm" title="Copiar información" onClick={() => void copyInfo()}>
          <i className="fas fa-copy me-1" aria-hidden="true" />
          Copiar información
        </button>
        <Link to={`/instalaciones/${item.id}/editar`} className="btn btn-outline-primary btn-sm">
          <i className="fas fa-edit me-1" aria-hidden="true" />
          Modificar
        </Link>
        {item.estado === "en_curso" ? (
          <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => void terminar()}>
            <i className="fas fa-check-circle me-1" aria-hidden="true" />
            Terminar
          </button>
        ) : (
          <button type="button" className="btn btn-outline-warning btn-sm" disabled={busy} onClick={() => void reabrir()}>
            <i className="fas fa-undo-alt me-1" aria-hidden="true" />
            Reabrir
          </button>
        )}
        {item.can_delete ? (
          <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => setConfirmDelete(true)}>
            <i className="fas fa-trash me-1" aria-hidden="true" />
            Eliminar
          </button>
        ) : null}
      </>
    ) : null,
  });

  useEffect(() => {
    if (!copyMsg) {
      return;
    }
    const timer = window.setTimeout(() => setCopyMsg(null), 2500);
    return () => window.clearTimeout(timer);
  }, [copyMsg]);

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

  async function reload() {
    const payload = await api<{ item: InstalacionDetail }>(`/api/instalaciones/${id}`);
    setItem(payload.item);
  }

  async function copyInfo() {
    if (!item) {
      return;
    }
    const texte = instalacionCopyText(item.client.nom, item.materiales_lineas ?? [], item.tecnico.nom);
    try {
      await navigator.clipboard.writeText(texte);
      setCopyMsg("Información de la instalación copiada al portapapeles");
    } catch {
      setCopyMsg("Error al copiar. Intente seleccionar y copiar manualmente.");
    }
  }

  async function terminar() {
    if (!window.confirm("¿Marcar la instalación como terminada?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/instalaciones/${id}/terminar`, { method: "POST", body: "{}" });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function reabrir() {
    if (!window.confirm("¿Reabrir la instalación?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/instalaciones/${id}/reabrir`, { method: "POST", body: "{}" });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function eliminar() {
    if (!item?.can_delete) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/instalaciones/${item.id}`, { method: "DELETE" });
      navigate("/instalaciones");
    } catch (err) {
      setBusy(false);
      setConfirmDelete(false);
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
      <nav aria-label="breadcrumb" className="app-breadcrumb page-title-breadcrumb mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/instalaciones">Instalaciones</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            #{item.id}
          </li>
        </ol>
      </nav>
      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}
      {copyMsg ? (
        <div className="alert alert-success py-2" role="status">
          {copyMsg}
        </div>
      ) : null}
      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 content-card">
            <div className="card-header">
              <h5 className="mb-0">Información general</h5>
            </div>
            <div className="card-body">
              <p>
                <strong>Tipo:</strong>{" "}
                <span className={`badge ${TIPO_BADGE[item.tipo] ?? "bg-secondary"}`}>{item.tipo_label}</span>
              </p>
              <p>
                <strong>Estado:</strong>{" "}
                <span className={`badge ${ESTADO_BADGE[item.estado] ?? "bg-secondary"}`}>{item.estado_label}</span>
              </p>
              <p>
                <strong>Fecha:</strong> {formatFecha(item.fecha)}
              </p>
              <p>
                <strong>Técnico:</strong> {item.tecnico.nom || "—"}
              </p>
              <p>
                <strong>Cliente:</strong> <Link to={`/clientes/${item.client.id}`}>{item.client.nom}</Link>
              </p>
              <p>
                <strong>Dirección:</strong>{" "}
                {item.sitio ? (
                  <>
                    {item.sitio.adresse} — {item.sitio.ville}
                    {item.sitio.activo ? null : <span className="badge bg-secondary ms-1">Dirección anterior</span>}
                    {item.sitio.google_maps_url ? (
                      <a href={item.sitio.google_maps_url} target="_blank" rel="noopener noreferrer" className="ms-1">
                        <i className="fas fa-external-link-alt" aria-hidden="true" /> Ver en Google Maps
                      </a>
                    ) : null}
                  </>
                ) : (
                  "—"
                )}
              </p>
              {item.tipo === "traslado" && item.sitio_origen ? (
                <p>
                  <strong>Dirección de origen:</strong> {item.sitio_origen.adresse} — {item.sitio_origen.ville}
                </p>
              ) : null}
              {item.observaciones ? (
                <>
                  <p className="mb-1">
                    <strong>Observaciones:</strong>
                  </p>
                  <p className="text-muted" style={{ whiteSpace: "pre-wrap" }}>
                    {item.observaciones}
                  </p>
                </>
              ) : null}
              <hr />
              <p className="small mb-1">
                <strong>Registrada:</strong> {formatFechaHora(item.fecha_registro)}
                {item.registrado_por ? ` — ${item.registrado_por.nom}` : ""}
              </p>
              {item.fecha_modificacion ? (
                <p className="small mb-1">
                  <strong>Última modificación:</strong> {formatFechaHora(item.fecha_modificacion)}
                  {item.modificado_por ? ` — ${item.modificado_por.nom}` : ""}
                </p>
              ) : null}
              {item.terminada_le ? (
                <p className="small mb-0">
                  <strong>Terminada el:</strong> {formatFechaHora(item.terminada_le)}
                  {item.terminada_por ? ` — ${item.terminada_por.nom}` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 content-card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">
                <i className="fas fa-dolly me-2" aria-hidden="true" />
                Material entregado
              </h5>
              <Link
                to={`/materiales/salidas/nueva?tipo=instalacion&instalacion=${item.id}`}
                className="btn btn-primary btn-sm"
              >
                <i className="fas fa-plus me-1" aria-hidden="true" />
                Añadir material
              </Link>
            </div>
            <div className="card-body p-0">
              {item.salidas.length === 0 ? (
                <div className="text-center py-5 px-3">
                  <i className="fas fa-box-open fa-3x text-muted mb-3" aria-hidden="true" />
                  <h5 className="text-muted">No hay salidas de material para esta instalación.</h5>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Técnico</th>
                        <th>Materiales</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.salidas.map((salida) => (
                        <tr key={salida.id}>
                          <td>
                            <strong>#{salida.id}</strong>
                          </td>
                          <td>{formatFecha(salida.fecha)}</td>
                          <td>{salida.tecnico.nom || "—"}</td>
                          <td className="small">
                            {salida.lineas.length
                              ? salida.lineas
                                  .map((linea) => `${linea.material?.nombre ?? "?"} x${linea.cantidad}`)
                                  .join(", ")
                              : "—"}
                          </td>
                          <td className="text-end">
                            <Link
                              to={`/materiales/salidas/${salida.id}`}
                              className="btn btn-sm btn-outline-secondary"
                              title="Ver"
                            >
                              <i className="fas fa-eye" aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {item.tipo === "traslado" ? (
            <div className="card shadow-sm border-0 content-card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-truck-moving me-2" aria-hidden="true" />
                  Material existente del traslado
                </h5>
              </div>
              <div className="card-body p-0">
                {item.traslado_lineas.length === 0 ? (
                  <p className="text-muted text-center py-4 mb-0">No se indicó material reutilizado ni retirado.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table mb-0">
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th className="text-end">Cantidad</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.traslado_lineas.map((linea) => (
                          <tr key={linea.id}>
                            <td>
                              {linea.material?.nombre ?? "—"}
                              {linea.material?.modelo ? ` (${linea.material.modelo})` : ""}
                            </td>
                            <td className="text-end">{linea.cantidad}</td>
                            <td>
                              <span className={`badge ${TRASLADO_ACCION_BADGE[linea.accion] ?? "bg-secondary"}`}>
                                {TRASLADO_ACCION_LABEL[linea.accion] ?? linea.accion}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {confirmDelete ? (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirmar la eliminación</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Cerrar"
                    onClick={() => setConfirmDelete(false)}
                  />
                </div>
                <div className="modal-body">
                  <p>
                    ¿Está seguro de que desea eliminar la instalación <strong>#{item.id}</strong>?
                  </p>
                  <p className="mb-0">Las salidas de material vinculadas también se eliminarán.</p>
                  <p className="text-danger mb-0">
                    <small>Esta acción es irreversible.</small>
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void eliminar()}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
