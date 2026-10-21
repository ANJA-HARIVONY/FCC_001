import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { isAdmin } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { usePageMeta } from "../../layout/Shell";
import { formatIncidentDate, statusBadgeClass } from "../incidencias/types";
import type { ClientFichaResponse } from "./types";

const MATERIAL_TIPO: Record<string, string> = {
  outillage: "Herramientas",
  material_cliente: "Materiales de cliente",
};
const INSTALACION_TIPO: Record<string, string> = { nueva: "Nueva", traslado: "Traslado" };
const INSTALACION_ESTADO: Record<string, string> = { en_curso: "En curso", terminada: "Terminada" };

function formatDay(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatStamp(iso: string | null): string {
  if (!iso) {
    return "";
  }
  return formatIncidentDate(iso);
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <div className="row">
        <div className="col-sm-4">
          <strong>{label}:</strong>
        </div>
        <div className="col-sm-8">{children}</div>
      </div>
      <hr />
    </>
  );
}

function splitPair(value: string): { lat: string; lng: string } | null {
  const parts = value
    .trim()
    .split(/[,;\s]+/)
    .filter(Boolean);
  if (parts.length !== 2) {
    return null;
  }
  return { lat: parts[0]!, lng: parts[1]! };
}

export function ClientDetailPage() {
  const { id } = useParams();
  const session = useSession();
  const admin = isAdmin(session.user?.role);
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("next") || "/clientes";
  const refresh = searchParams.get("radius_refresh") === "1";
  const [data, setData] = useState<ClientFichaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [gps, setGps] = useState({ pair: "", latitud: "", longitud: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const query = new URLSearchParams();
    if (refresh) {
      query.set("radius_refresh", "1");
    }
    const suffix = query.toString();
    const payload = await api<ClientFichaResponse>(`/api/clients/${id}/ficha${suffix ? `?${suffix}` : ""}`);
    setData(payload);
    setGps({
      pair: "",
      latitud: payload.item.latitud == null ? "" : payload.item.latitud.toFixed(7),
      longitud: payload.item.longitud == null ? "" : payload.item.longitud.toFixed(7),
    });
  }, [id, refresh]);

  useEffect(() => {
    let cancelled = false;
    load().catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof ApiError ? err.message : "Error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const icon = useMemo(() => <i className="fas fa-user-tie" aria-hidden="true" />, []);

  const actions = useMemo(() => {
    if (!data) {
      return undefined;
    }
    return (
      <>
        <Link to={`/incidencias/nueva?client=${data.item.id}`} className="btn btn-success btn-sm">
          <i className="fas fa-plus-circle me-1" aria-hidden="true" />
          Crear incidencia
        </Link>
        <Link to={`/clientes/${data.item.id}/editar?next=${encodeURIComponent(returnUrl)}`} className="btn btn-warning btn-sm">
          <i className="fas fa-edit me-1" aria-hidden="true" />
          Modificar
        </Link>
        <a className="btn btn-primary btn-sm" href={`/clientes/${data.item.id}/imprimir`} target="_blank" rel="noreferrer">
          <i className="fas fa-print me-1" aria-hidden="true" />
          Imprimir PDF
        </a>
        <Link to={`/clientes/${data.item.id}/verificar`} className="btn btn-outline-primary btn-sm">
          <i className="fas fa-network-wired me-1" aria-hidden="true" />
          Verificar
        </Link>
      </>
    );
  }, [data, returnUrl]);

  usePageMeta({
    title: data ? `Ficha del Cliente — ${data.item.nom}` : "Ficha del Cliente",
    icon,
    subtitle: "Detalle y gestión del cliente",
    actions,
  });

  async function saveGps(event: FormEvent) {
    event.preventDefault();
    if (!id) {
      return;
    }
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await api(`/api/instalaciones/clientes/${id}/gps`, {
        method: "PUT",
        body: JSON.stringify({ latitud: Number(gps.latitud), longitud: Number(gps.longitud) }),
      });
      await load();
      setNotice("Coordenadas guardadas.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setError("El navegador no permite usar la ubicación.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps((current) => ({
          ...current,
          latitud: position.coords.latitude.toFixed(7),
          longitud: position.coords.longitude.toFixed(7),
        }));
      },
      () => setError("No se pudo obtener la ubicación."),
    );
  }

  async function saveFotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) {
      return;
    }
    const input = event.currentTarget.elements.namedItem("fotos");
    if (!(input instanceof HTMLInputElement) || !input.files?.length) {
      setError("Seleccione al menos una foto.");
      return;
    }
    const body = new FormData();
    for (const file of input.files) {
      body.append("fotos", file);
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/clients/${id}/fotos`, { method: "POST", body });
      await load();
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFoto(fotoId: number) {
    if (!id || !window.confirm("¿Eliminar esta foto?")) {
      return;
    }
    setError(null);
    try {
      await api(`/api/clients/${id}/fotos/${fotoId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  if (error && !data) {
    return <div className="alert alert-danger">{error}</div>;
  }
  if (!data) {
    return <p>Cargando…</p>;
  }

  const item = data.item;
  const hasGps = item.latitud != null && item.longitud != null;
  const maps = hasGps ? `https://www.google.com/maps?q=${item.latitud},${item.longitud}` : null;
  const embed = hasGps ? `https://maps.google.com/maps?q=${item.latitud},${item.longitud}&z=16&output=embed` : null;
  const slots = Math.max(0, data.max_fotos - data.fotos.length);
  const radius = data.radius;
  const radiusData = radius.data;

  return (
    <div className="container-fluid px-0">
      <nav aria-label="breadcrumb" className="app-breadcrumb page-title-breadcrumb mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/clientes">Clientes</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {item.nom}
          </li>
        </ol>
      </nav>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}
      <div className="row">
        <div className="col-lg-6">
          <div className="card shadow mb-4 content-card">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-info-circle" aria-hidden="true" /> Información del cliente
              </h6>
            </div>
            <div className="card-body">
              <InfoRow label="Nombre">{item.nom}</InfoRow>
              <InfoRow label="Teléfono">{item.telephone}</InfoRow>
              <InfoRow label="Dirección">{item.adresse}</InfoRow>
              <InfoRow label="Barrio">{item.ville}</InfoRow>
              <InfoRow label="Ciudad">{item.ciudad?.nombre ?? "N/A"}</InfoRow>
              <InfoRow label="Categoría">
                {item.categoria === "corporativo" ? (
                  <img
                    src="/static/img/icon-cliente-corporativo.png"
                    alt="Cliente corporativo"
                    title="Cliente corporativo"
                    className="icon-cliente-corporativo"
                  />
                ) : null}
              </InfoRow>
              <InfoRow label="IP Router">
                {item.ip_router ? (
                  <code>
                    <a href={`http://${item.ip_router}`} target="_blank" rel="noreferrer">
                      {item.ip_router}
                    </a>
                  </code>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </InfoRow>
              <InfoRow label="IP Antena">
                {item.ip_antea ? (
                  <code>
                    <a href={`http://${item.ip_antea}`} target="_blank" rel="noreferrer">
                      {item.ip_antea}
                    </a>
                  </code>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </InfoRow>
              <InfoRow label="Cuenta PPPoE">
                {item.username_radius ? <code>{item.username_radius}</code> : <span className="text-muted">—</span>}
              </InfoRow>
              <InfoRow label="Creado por">
                {item.cree_par ? (
                  <>
                    <i className="fas fa-user text-primary" aria-hidden="true" /> {item.cree_par}
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </InfoRow>
              <div className="row">
                <div className="col-sm-4">
                  <strong>Modificado por:</strong>
                </div>
                <div className="col-sm-8">
                  {item.modifie_par ? (
                    <>
                      <i className="fas fa-user-edit text-muted" aria-hidden="true" /> {item.modifie_par}
                      {item.modifie_le ? <span className="text-muted ms-1">{formatStamp(item.modifie_le)}</span> : null}
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card shadow mb-4 content-card">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-chart-pie" aria-hidden="true" /> Estadisticas de las Incidencias
              </h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <Stat label="Total" value={data.stats.total} tone="primary" />
                <Stat label="Solucionadas" value={data.stats.solucionadas} tone="success" />
                <Stat label="Pendientes" value={data.stats.pendientes} tone="warning" />
                <Stat label="Bitrix" value={data.stats.bitrix} tone="info" />
              </div>
            </div>
          </div>
          {data.radius_enabled ? (
            <div className="card shadow mb-4 content-card" id="radius-info-card">
              <div className="card-header py-3 d-flex justify-content-between align-items-center">
                <h6 className="m-0 font-weight-bold text-primary">
                  <i className="fas fa-wifi" aria-hidden="true" /> Información RADIUS
                </h6>
                <Link
                  to={`/clientes/${item.id}?radius_refresh=1&next=${encodeURIComponent(returnUrl)}`}
                  className="btn btn-sm btn-light"
                  title="Actualizar datos RADIUS"
                >
                  <i className="fas fa-sync-alt" aria-hidden="true" /> Actualizar
                </Link>
              </div>
              <div className="card-body">
                <RadiusBody radius={radius} data={radiusData} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card shadow mb-4 content-card">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-exclamation-triangle" aria-hidden="true" /> Historial de las Incidencias
          </h6>
        </div>
        <div className="card-body p-0">
          {data.incidencias.length ? (
            <>
              <div className="table-responsive d-none d-lg-block p-3">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Fecha/Hora</th>
                      <th>Asunto</th>
                      <th>Estado</th>
                      <th>Operador</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.incidencias.map((incident) => (
                      <tr key={incident.id}>
                        <td>{formatIncidentDate(incident.date_heure)}</td>
                        <td>
                          <Link to={`/incidencias/${incident.id}`}>{incident.intitule}</Link>
                        </td>
                        <td>
                          <IncidentStatus status={incident.status} refBitrix={incident.ref_bitrix} />
                        </td>
                        <td>{incident.operateur}</td>
                        <td className="small">{incident.observations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-lg-none p-3">
                {data.incidencias.map((incident) => (
                  <article key={incident.id} className="border rounded p-2 mb-2">
                    <div className="d-flex justify-content-between gap-2">
                      <Link to={`/incidencias/${incident.id}`}>{incident.intitule}</Link>
                      <IncidentStatus status={incident.status} refBitrix={incident.ref_bitrix} />
                    </div>
                    <div className="small text-muted">
                      {formatIncidentDate(incident.date_heure)} — {incident.operateur}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4 px-3">
              <i className="fas fa-inbox fa-3x text-muted mb-3" aria-hidden="true" />
              <p className="text-muted">No hay incidencias registradas para este cliente.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow mb-4 content-card" id="instalacionSection">
        <div className="card-header py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-map-marker-alt" aria-hidden="true" /> Instalación
            <span className="text-muted fw-normal small ms-2">{item.adresse}</span>
          </h6>
          {admin ? (
            <Link to={`/clientes/${item.id}/traslado`} className="btn btn-outline-primary btn-sm">
              <i className="fas fa-truck-moving me-1" aria-hidden="true" />
              Traslado
            </Link>
          ) : null}
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-lg-6">
              {hasGps && embed && maps ? (
                <>
                  <div className="ratio ratio-4x3 rounded overflow-hidden border mb-3">
                    <iframe title="Mapa de la instalación" src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  </div>
                  <div className="small text-muted mb-3">
                    {item.latitud!.toFixed(7)}, {item.longitud!.toFixed(7)}
                    <a href={maps} target="_blank" rel="noreferrer" className="ms-2">
                      <i className="fas fa-external-link-alt" aria-hidden="true" /> Ver en Google Maps
                    </a>
                    {item.gps_actualizado_le ? (
                      <div>
                        Actualizado {formatStamp(item.gps_actualizado_le)}
                        {item.gps_actualizado_por ? ` — ${item.gps_actualizado_por}` : ""}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-muted mb-3">Aún no hay coordenadas GPS.</p>
              )}
              {admin ? (
                <form onSubmit={saveGps}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="gps_pair">
                      Pegar coordenadas
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="gps_pair"
                      placeholder="4.6097, -74.0817"
                      autoComplete="off"
                      value={gps.pair}
                      onChange={(event) => {
                        const pair = event.target.value;
                        const split = splitPair(pair);
                        setGps((current) => ({
                          pair,
                          latitud: split?.lat ?? current.latitud,
                          longitud: split?.lng ?? current.longitud,
                        }));
                      }}
                    />
                    <div className="form-text">Formato: latitud, longitud</div>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="latitud">
                        Latitud
                      </label>
                      <input
                        className="form-control"
                        id="latitud"
                        inputMode="decimal"
                        value={gps.latitud}
                        onChange={(event) => setGps((current) => ({ ...current, latitud: event.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="longitud">
                        Longitud
                      </label>
                      <input
                        className="form-control"
                        id="longitud"
                        inputMode="decimal"
                        value={gps.longitud}
                        onChange={(event) => setGps((current) => ({ ...current, longitud: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={useLocation}>
                      <i className="fas fa-location-crosshairs me-1" aria-hidden="true" />
                      Usar mi ubicación
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                      <i className="fas fa-save me-1" aria-hidden="true" />
                      Guardar GPS
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
            <div className="col-lg-6">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="small text-uppercase text-muted fw-semibold mb-0">
                  <i className="fas fa-images me-1" aria-hidden="true" />
                  Galería
                </h6>
                <span className="badge bg-secondary">
                  {data.fotos.length}/{data.max_fotos}
                </span>
              </div>
              {data.fotos.length ? (
                <div className="row g-2 mb-3">
                  {data.fotos.map((foto) => (
                    <div className="col-6 col-md-4" key={foto.id}>
                      <div className="border rounded overflow-hidden h-100">
                        <a href={foto.url} target="_blank" rel="noreferrer">
                          <img src={foto.url} alt="Foto de la instalación" className="w-100" style={{ height: 110, objectFit: "cover" }} />
                        </a>
                        {admin ? (
                          <div className="p-1 text-end">
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => deleteFoto(foto.id)}>
                              <i className="fas fa-trash" aria-hidden="true" />
                              <span className="visually-hidden">Eliminar</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-3">No hay fotos de la instalación.</p>
              )}
              {admin ? (
                <form onSubmit={saveFotos}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="fotos">
                      Añadir fotos
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      id="fotos"
                      name="fotos"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={slots < 1}
                    />
                    <div className="form-text">
                      JPG, PNG o WEBP. Máx. 5 MB por foto. Hasta {data.max_fotos} fotos.{" "}
                      {slots < 1 ? "Límite alcanzado." : `Puede añadir ${slots} más.`}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={busy || slots < 1}>
                    <i className="fas fa-upload me-1" aria-hidden="true" />
                    Guardar fotos
                  </button>
                </form>
              ) : null}
            </div>
          </div>
          {data.sitios_anteriores.length ? (
            <>
              <hr />
              <h6 className="small text-uppercase text-muted fw-semibold">
                <i className="fas fa-history me-1" aria-hidden="true" />
                Direcciones anteriores
              </h6>
              <ul className="list-unstyled small mb-0">
                {data.sitios_anteriores.map((sitio) => {
                  const url =
                    sitio.latitud != null && sitio.longitud != null
                      ? `https://www.google.com/maps?q=${sitio.latitud},${sitio.longitud}`
                      : null;
                  return (
                    <li className="mb-1" key={sitio.id}>
                      {sitio.adresse} — {sitio.ville}
                      {sitio.hasta ? <span className="text-muted"> (hasta {formatDay(sitio.hasta)})</span> : null}
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="ms-1">
                          <i className="fas fa-external-link-alt" aria-hidden="true" />
                          <span className="visually-hidden">Ver en Google Maps</span>
                        </a>
                      ) : null}
                      {sitio.fotos ? <span className="text-muted ms-1">· {sitio.fotos} fotos</span> : null}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      {admin ? (
        <div className="card shadow mb-4 content-card">
          <div className="card-header py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h6 className="m-0 font-weight-bold text-primary">
              <i className="fas fa-building" aria-hidden="true" /> Instalaciones
            </h6>
            <Link to={`/instalaciones/nueva?client=${item.id}`} className="btn btn-primary btn-sm">
              <i className="fas fa-plus me-1" aria-hidden="true" />
              Nueva instalación
            </Link>
          </div>
          <div className={`card-body${data.instalaciones.length ? " p-0" : ""}`}>
            {data.instalaciones.length ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Dirección</th>
                      <th>Técnico</th>
                      <th>Estado</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.instalaciones.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>#{row.id}</strong>
                        </td>
                        <td>{formatDay(row.fecha)}</td>
                        <td>
                          <span className={`badge ${row.tipo === "traslado" ? "bg-info text-dark" : "bg-primary"}`}>
                            {INSTALACION_TIPO[row.tipo] ?? row.tipo}
                          </span>
                        </td>
                        <td className="small">{row.adresse ?? "—"}</td>
                        <td>{row.tecnico}</td>
                        <td>
                          <span className={`badge ${row.estado === "terminada" ? "bg-success" : "bg-warning text-dark"}`}>
                            {INSTALACION_ESTADO[row.estado] ?? row.estado}
                          </span>
                        </td>
                        <td className="text-end">
                          <Link to={`/instalaciones/${row.id}`} className="btn btn-sm btn-outline-secondary" title="Ver">
                            <i className="fas fa-eye" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted mb-0">No hay instalaciones registradas para este cliente.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="card shadow mb-4 content-card">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-toolbox" aria-hidden="true" /> Materiales instalados
          </h6>
        </div>
        <div className="card-body">
          {data.materiales.length ? (
            <div className="table-responsive">
              <table className="table table-bordered mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Material</th>
                    <th>Tipo</th>
                    <th className="text-end">Cantidad</th>
                    <th>Técnico</th>
                  </tr>
                </thead>
                <tbody>
                  {data.materiales.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDay(row.fecha)}</td>
                      <td>{row.nombre}</td>
                      <td>{MATERIAL_TIPO[row.tipo] ?? row.tipo}</td>
                      <td className="text-end">{row.cantidad}</td>
                      <td>{row.tecnico}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted mb-0">No hay materiales registrados para este cliente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="col-6 mb-3">
      <div className={`card border-left-${tone}`}>
        <div className="card-body py-2">
          <div className={`text-xs font-weight-bold text-${tone} text-uppercase mb-1`}>{label}</div>
          <div className="h5 mb-0 font-weight-bold text-gray-800">{value}</div>
        </div>
      </div>
    </div>
  );
}

function IncidentStatus({ status, refBitrix }: { status: string; refBitrix: string | null }) {
  const label = status === "Pendiente" ? "Pendientes" : status;
  return (
    <>
      <span className={status === "Pendiente" ? "badge bg-warning" : statusBadgeClass(status)}>{label}</span>
      {status === "Bitrix" && refBitrix ? (
        <a
          className="text-decoration-none text-primary ms-1 small"
          href={`https://conexxia.bitrix24.es/company/personal/user/7/tasks/task/view/${refBitrix}/`}
          target="_blank"
          rel="noreferrer"
        >
          {refBitrix} <i className="fas fa-external-link-alt" title="Abrir en nuevo tab" aria-hidden="true" />
        </a>
      ) : null}
    </>
  );
}

function RadiusBody({
  radius,
  data,
}: {
  radius: ClientFichaResponse["radius"];
  data: ClientFichaResponse["radius"]["data"];
}) {
  const days = data?.days_remaining;
  return (
    <>
      {radius.from_cache ? (
        <div className="alert alert-secondary py-2 small mb-3">
          <i className="fas fa-database" aria-hidden="true" /> Datos en caché
          {radius.cache_age_minutes != null ? ` — actualizado hace ${radius.cache_age_minutes} min` : ""}
          {radius.fetched_at ? <span className="text-muted"> ({radius.fetched_at})</span> : null}
        </div>
      ) : null}
      {radius.status === "ok" && data ? (
        <>
          <InfoRow label="Estado de la cuenta">
            {data.account_status === "expired" ? (
              <span className="badge bg-danger">Expirada</span>
            ) : data.account_status === "enabled" ? (
              <span className="badge bg-success">{data.account_status_label || "Activa"}</span>
            ) : (
              <span className="badge bg-secondary">{data.account_status_label || "Inactiva"}</span>
            )}
          </InfoRow>
          <InfoRow label="Estado de la conexión">
            {data.online || data.connection_status === "online" ? (
              <span className="badge bg-success">{data.connection_status_label || "En línea"}</span>
            ) : (
              <span className="badge bg-warning text-dark">{data.connection_status_label || "Desconectada"}</span>
            )}
          </InfoRow>
          <InfoRow label="Fecha de expiración">
            {data.expiry || "—"}
            {days != null ? (
              <div
                className={`small mt-1 ${days < 0 ? "text-danger" : days <= 7 ? "text-warning" : "text-muted"}`}
              >
                El número de días restantes es:{" "}
                <strong>
                  {days < 0 ? `0 (expirado hace ${-days} día${-days === 1 ? "" : "s"})` : days === 0 ? "0 (hoy)" : days}
                </strong>
              </div>
            ) : null}
          </InfoRow>
          <div className="row">
            <div className="col-sm-4">
              <strong>Velocidad:</strong>
            </div>
            <div className="col-sm-8">{data.srvname ? <strong>{data.srvname}</strong> : "—"}</div>
          </div>
        </>
      ) : radius.status === "not_found" ? (
        <div className="alert alert-info mb-0">{radius.message || "No se encontró cuenta en RADIUS"}</div>
      ) : radius.status === "empty_name" ? (
        <div className="alert alert-secondary mb-0">
          {radius.message || "Sin Username RADIUS. Edite el cliente y complete el campo Username RADIUS."}
        </div>
      ) : radius.status === "ambiguous" ? (
        <div className="alert alert-warning mb-0">
          <strong>Varias cuentas coinciden — revise el criterio</strong>
        </div>
      ) : (
        <div className="alert alert-danger mb-0">{radius.message || "RADIUS no disponible temporalmente."}</div>
      )}
    </>
  );
}
