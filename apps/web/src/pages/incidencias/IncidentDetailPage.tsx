import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { COMMENT_MAX } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { usePageMeta } from "../../layout/Shell";
import { copyIncidentText } from "./copy";
import {
  bitrixTaskUrl,
  formatIncidentDate,
  statusBadgeClass,
  type BitrixInfoResponse,
  type IncidentDetail,
} from "./types";

const DEFAULT_AVATAR = "/static/img/default_avatar.png";

interface PingResult {
  success: boolean;
  ip: string | null;
  error?: string;
  packets_sent: number;
  packets_received: number;
  packets_lost: number;
  packet_loss: number;
  min_time: number;
  avg_time: number;
  max_time: number;
}

interface VerifyPayload {
  client: { nom: string; adresse?: string | null; ville?: string | null };
  resultado_antena: PingResult;
  resultado_router: PingResult;
}

export function IncidentDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const session = useSession();
  const backTo = safePath(searchParams.get("next"));
  const focusComment = searchParams.get("abrir_comentario") === "1";
  const [item, setItem] = useState<IncidentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [solving, setSolving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [ping, setPing] = useState<VerifyPayload | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const payload = await api<{ item: IncidentDetail }>(`/api/incidents/${id}`);
    setItem(payload.item);
    return payload.item;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    api<{ item: IncidentDetail }>(`/api/incidents/${id}`)
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

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const box = chatRef.current;
    if (box) {
      box.scrollTop = box.scrollHeight;
    }
  }, [item?.comentarios.length]);

  useEffect(() => {
    if (focusComment && item) {
      commentRef.current?.focus();
      commentRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusComment, item]);

  const onCopy = useCallback(async () => {
    if (!item) {
      return;
    }
    const result = await copyIncidentText(item);
    setToast(
      result === "ok"
        ? "Información de la incidencia copiada al portapapeles"
        : "Error al copiar. Intente seleccionar y copiar manualmente.",
    );
  }, [item]);

  const onPing = useCallback(async () => {
    if (!item) {
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const payload = await api<VerifyPayload>(`/api/clients/${item.client.id}/verificar`);
      setPing(payload);
    } catch (err) {
      setError(err instanceof ApiError ? `Error al verificar la conectividad: ${err.message}` : "Error al verificar la conectividad");
    } finally {
      setVerifying(false);
    }
  }, [item]);

  const actions = useMemo(() => {
    if (!item) {
      return null;
    }
    return (
      <>
        <Link to={backTo} className="btn btn-secondary btn-sm">
          <i className="fas fa-arrow-left me-1" aria-hidden="true" />
          Volver
        </Link>
        <button type="button" className="btn btn-outline-success btn-sm" title="Copiar información" onClick={() => void onCopy()}>
          <i className="fas fa-copy me-1" aria-hidden="true" />
          Copiar
        </button>
        <button type="button" className="btn btn-success btn-sm" disabled={verifying} onClick={() => void onPing()}>
          <i className={`fas ${verifying ? "fa-spinner fa-spin" : "fa-check"} me-1`} aria-hidden="true" />
          {verifying ? "Verificando..." : "Ping"}
        </button>
        {item.can_modify ? (
          <Link to={`/incidencias/${item.id}/editar?next=${encodeURIComponent(backTo)}`} className="btn btn-warning btn-sm">
            <i className="fas fa-edit me-1" aria-hidden="true" />
            Modificar
          </Link>
        ) : null}
      </>
    );
  }, [backTo, item, onCopy, onPing, verifying]);

  usePageMeta({
    title: item ? `Incidencia #${item.id}` : "Incidencia",
    icon: <i className="fas fa-exclamation-circle" aria-hidden="true" />,
    subtitle: item?.intitule ?? "",
    actions,
  });

  async function onComment(event: FormEvent) {
    event.preventDefault();
    if (!item || !comment.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = await api<{ item: IncidentDetail }>(`/api/incidents/${item.id}/comentarios`, {
        method: "POST",
        body: JSON.stringify({ contenido: comment }),
      });
      setItem(payload.item);
      setComment("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function onCommentKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function markSolved() {
    if (!item) {
      return;
    }
    setSolving(true);
    setError(null);
    try {
      const payload = await api<{ item: IncidentDetail }>(`/api/incidents/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          id_client: item.client.id,
          intitule: item.intitule,
          observations: item.observations ?? "",
          status: "Solucionadas",
          ref_bitrix: "",
        }),
      });
      setItem(payload.item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSolving(false);
    }
  }

  async function refreshBitrix() {
    if (!item) {
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const info = await api<BitrixInfoResponse>(`/api/incidents/${item.id}/bitrix-info?force=1`);
      if (!info.ok && info.error) {
        setError(info.error);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setRefreshing(false);
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

  const when = splitDate(item.date_heure);
  const elapsed = item.status === "Pendiente" ? elapsedLabel(item.date_heure) : null;
  const userId = session.user?.userId;

  return (
    <div className="container-fluid px-0">
      <style>{PRINT_AND_PING_CSS}</style>
      <nav aria-label="breadcrumb" className="app-breadcrumb page-title-breadcrumb mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/incidencias">Incidencias</Link>
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
      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow mb-4 content-card">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-info-circle" aria-hidden="true" /> Detalles de la Incidencia
              </h6>
            </div>
            <div className="card-body">
              <Row label="ID Incidencia" value={<span className="badge bg-secondary">#{item.id}</span>} />
              <Row label="Asunto" value={<h5 className="text-primary mb-0">{item.intitule}</h5>} />
              <Row
                label="Fecha/Hora"
                value={
                  <>
                    <i className="fas fa-calendar-alt text-muted" aria-hidden="true" /> {when.date}{" "}
                    <i className="fas fa-clock text-muted ms-2" aria-hidden="true" /> {when.time}
                  </>
                }
              />
              <div className="mb-3">
                {item.status === "Bitrix" ? (
                  <BitrixCard item={item} refreshing={refreshing} onRefresh={() => void refreshBitrix()} />
                ) : (
                  <StatusCard status={item.status} />
                )}
              </div>
              <hr />
              <Row
                label="Creado por"
                value={
                  <>
                    <i className="fas fa-user text-primary" aria-hidden="true" /> <strong>{item.operateur.nom}</strong>
                  </>
                }
              />
              {item.modifie_le ? (
                <Row
                  label="Modificado por"
                  value={
                    <>
                      <i className="fas fa-user-edit text-muted" aria-hidden="true" />{" "}
                      <strong>{item.modifie_par_nom ?? "Usuario"}</strong>{" "}
                      <span className="text-muted ms-1">{formatIncidentDate(item.modifie_le)}</span>
                    </>
                  }
                />
              ) : null}
              <Row
                label="Observaciones"
                value={
                  item.observations ? (
                    <textarea className="form-control bg-light" rows={3} readOnly value={item.observations} />
                  ) : (
                    <em className="text-muted">Ninguna observación</em>
                  )
                }
                last
              />
            </div>
          </div>

          <div className="card shadow mb-4 content-card incident-chat-card">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-comments" aria-hidden="true" /> Comentarios{" "}
                {item.comentarios.length ? <span className="badge bg-secondary ms-1">{item.comentarios.length}</span> : null}
              </h6>
            </div>
            <div className="incident-chat">
              <div className="incident-chat__messages" id="incident-chat-messages" ref={chatRef}>
                {item.comentarios.length === 0 ? (
                  <p className="incident-chat__empty text-muted mb-0">
                    <em>No hay comentarios todavía.</em>
                  </p>
                ) : (
                  item.comentarios.map((row) => {
                    const own = row.operateur?.id === userId;
                    return (
                      <article key={row.id} className={`incident-chat-msg${own ? " incident-chat-msg--own" : ""}`}>
                        <div className="incident-chat-infos">
                          <span className="incident-chat-name">{row.operateur?.nom ?? "Usuario"}</span>
                          <time className="incident-chat-time" dateTime={row.creado_en}>
                            {formatIncidentDate(row.creado_en)}
                          </time>
                        </div>
                        <div className="incident-chat-row">
                          <img
                            src={row.operateur?.avatar_url || DEFAULT_AVATAR}
                            className="incident-chat-avatar"
                            width={40}
                            height={40}
                            alt=""
                            referrerPolicy="no-referrer"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = DEFAULT_AVATAR;
                            }}
                          />
                          <p className="incident-chat-bubble">{row.contenido}</p>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
              <form className="incident-chat__composer" onSubmit={(event) => void onComment(event)}>
                <label className="visually-hidden" htmlFor="contenidoComentario">
                  Comentario
                </label>
                <textarea
                  ref={commentRef}
                  className="form-control incident-chat__input"
                  id="contenidoComentario"
                  rows={1}
                  required
                  maxLength={COMMENT_MAX}
                  placeholder="Escriba un mensaje…"
                  autoComplete="off"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  onKeyDown={onCommentKey}
                />
                <button type="submit" className="btn incident-chat__send" disabled={saving}>
                  Enviar
                </button>
              </form>
            </div>
          </div>

          <div className="card shadow mb-4 content-card">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-tasks" aria-hidden="true" /> Acciones rápidas
              </h6>
            </div>
            <div className="card-body">
              {item.can_modify ? (
                <div className="row">
                  {item.status === "Pendiente" ? (
                    <div className="col-md-4 mb-3">
                      <button type="button" className="btn btn-success w-100" disabled={solving} onClick={() => void markSolved()}>
                        <i className="fas fa-check-circle" aria-hidden="true" /> Marcar como Solucionada
                      </button>
                    </div>
                  ) : null}
                  <div className="col-md-4 mb-3">
                    <Link to={`/incidencias/${item.id}/editar?next=${encodeURIComponent(backTo)}`} className="btn btn-warning w-100">
                      <i className="fas fa-edit" aria-hidden="true" /> Modificar Incidencia
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-muted small mb-0">
                  No tiene permiso para modificar esta incidencia. Puede añadir comentarios arriba.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow mb-4 content-card">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                <i className="fas fa-user-tie" aria-hidden="true" /> Cliente Afectado - # {item.client.id}
              </h6>
            </div>
            <div className="card-body">
              <div className="text-center mb-3">
                <div
                  className="avatar-circle bg-primary text-white mx-auto"
                  style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <i className="fas fa-user fa-3x" aria-hidden="true" />
                </div>
                <h5 className="mt-3 mb-0 d-inline-flex align-items-center justify-content-center gap-2 flex-wrap">
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
                  <span>{item.client.nom}</span>
                </h5>
              </div>
              <hr />
              <Field icon="fa-phone" label="Teléfono" value={item.client.telephone} />
              <Field icon="fa-map-marker-alt" label="Dirección" value={item.client.adresse} />
              <Field icon="fa-city" label="Barrio" value={item.client.ville} />
              <hr />
              <IpField icon="fa-network-wired" label="IP Router" ip={item.client.ip_router} />
              <IpField icon="fa-satellite-dish" label="IP Antena" ip={item.client.ip_antea} />
              <div className="mb-3">
                <i className="fas fa-user-lock text-muted" aria-hidden="true" /> <strong>Cuenta PPPoE:</strong>
                <br />
                {item.client.username_radius ? (
                  <code className="ms-4">{item.client.username_radius}</code>
                ) : (
                  <span className="ms-4 text-muted fst-italic">No configurada</span>
                )}
              </div>
              <hr />
              <Link to={`/clientes/${item.client.id}`} className="btn btn-primary w-100">
                <i className="fas fa-eye" aria-hidden="true" /> Ver Ficha Completa del Cliente
              </Link>
            </div>
          </div>

          {elapsed ? (
            <div className="card shadow mb-4 content-card">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">
                  <i className="fas fa-clock" aria-hidden="true" /> Información de tiempo
                </h6>
              </div>
              <div className="card-body">
                <div className="text-center">
                  <div className="mb-3">
                    <small className="text-muted text-uppercase">Tiempo Transcurrido</small>
                    <h4 className="mb-0">{elapsed.text}</h4>
                  </div>
                  {elapsed.over30 ? (
                    <div className="alert alert-warning mb-0">
                      <i className="fas fa-exclamation-triangle" aria-hidden="true" /> <strong>¡Atención!</strong>
                      <br />
                      <small>Incidencia pendiente por más de 30 minutos</small>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="card shadow mb-4 content-card">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Historial de estados</h6>
            </div>
            <div className="card-body">
              {item.historial.length === 0 ? (
                <p className="text-muted mb-0">Sin cambios registrados.</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {item.historial.map((row) => (
                    <li key={row.id} className="mb-2 small">
                      <div>
                        {row.estado_anterior ?? "—"} → <strong>{row.estado_nuevo}</strong>
                        {row.ref_bitrix ? ` (#${row.ref_bitrix})` : ""}
                      </div>
                      <div className="text-muted">
                        {row.operateur?.nom ?? "—"} · {formatIncidentDate(row.cambiado_en)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {verifying ? <PingOverlay /> : null}
      {ping ? <PingModal payload={ping} onClose={() => setPing(null)} onAgain={() => void onPing()} /> : null}
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
            zIndex: 10000,
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

function StatusCard({ status }: { status: string }) {
  const solved = status === "Solucionadas";
  return (
    <div className="card status-detail-card shadow-sm">
      <div className="card-header d-flex align-items-center">
        <span className="d-inline-flex align-items-center fw-semibold">
          <i className="ui-icon fas fa-info-circle me-2" aria-hidden="true" />
          Estado
        </span>
      </div>
      <div className="card-body">
        <div className="bitrix-status-row">
          <i className={`ui-icon fas ${solved ? "fa-check-circle" : "fa-hourglass-half"}`} aria-hidden="true" />
          <div>
            <small className="text-uppercase text-muted">Estado</small>
            <div>
              <span className={statusBadgeClass(status)}>{status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BitrixCard({
  item,
  refreshing,
  onRefresh,
}: {
  item: IncidentDetail;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const extras = item.bitrix_extras;
  const ref = item.ref_bitrix?.trim() ?? "";
  if (!ref) {
    return <span className="badge badge-bitrix">Bitrix</span>;
  }
  const taskUrl = bitrixTaskUrl(ref);
  if (!item.bitrix_api_enabled) {
    return (
      <div className="small text-muted mt-1">
        <i className="fas fa-unlink" aria-hidden="true" /> Estado Bitrix no consultable desde este servidor (sin acceso a
        Bitrix24). Abra el enlace de la tarea.{" "}
        <a href={taskUrl} target="_blank" rel="noopener noreferrer">
          {ref} <i className="fas fa-external-link-alt" aria-hidden="true" />
        </a>
      </div>
    );
  }
  if (!extras) {
    return (
      <div>
        {item.bitrix_error ? (
          <div className="small text-warning bitrix-error">
            <i className="fas fa-exclamation-triangle" aria-hidden="true" /> {item.bitrix_error}
          </div>
        ) : (
          <span className="bitrix-emoji-inline bitrix-loading">
            <i className="fas fa-spinner fa-spin small" aria-hidden="true" />
          </span>
        )}
        <div>
          <button type="button" className="btn btn-sm btn-outline-info mt-1" title="Actualizar información de Bitrix" disabled={refreshing} onClick={onRefresh}>
            <i className={`fas fa-sync-alt${refreshing ? " fa-spin" : ""}`} aria-hidden="true" /> Actualizar
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="card bitrix-info-card bitrix-status-card status-detail-card shadow-sm">
      <div className="card-header d-flex align-items-center justify-content-between">
        <span className="d-inline-flex align-items-center fw-semibold">
          <i className="ui-icon fas fa-info-circle me-2" aria-hidden="true" />
          Estado <span className="badge badge-bitrix ms-2">Bitrix</span>
        </span>
        <a href={taskUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none" title="Abrir en nuevo tab">
          {ref} <i className="fas fa-external-link-alt" aria-hidden="true" />
        </a>
      </div>
      <div className="card-body">
        <div className="row g-3 bitrix-status-grid">
          <div className="col-12 col-md-6 bitrix-status-col">
            <StatusLine icon={extras.status_icon} label="Estado de la tarea" value={item.bitrix_status_label || "—"} />
            <StatusLine icon="fa-user-tie" label="Responsable" value={item.bitrix_responsible || "—"} />
            {extras.priority_label ? <StatusLine icon={extras.priority_icon} label="Prioridad" value={extras.priority_label} /> : null}
          </div>
          <div className="col-12 col-md-6 bitrix-status-col">
            <StatusLine icon="fa-calendar-plus" label="Creada el" value={extras.created_label || "—"} />
            {extras.show_plazo ? (
              <StatusLine
                icon="fa-calendar-day"
                label="Vencimiento"
                value={
                  <>
                    {extras.deadline_label || "—"}
                    {extras.deadline_label && extras.is_overdue ? (
                      <span className="badge badge-attente ms-1">Retrasada desde {extras.plazo_label}</span>
                    ) : extras.deadline_label ? (
                      <small className="text-muted"> (Quedan {extras.plazo_label})</small>
                    ) : null}
                  </>
                }
              />
            ) : extras.is_closed ? (
              <StatusLine icon="fa-flag-checkered" label="Cerrada el" value={extras.closed_label || "—"} />
            ) : null}
            {extras.changed_label ? (
              <StatusLine
                icon="fa-history"
                label="Última modificación"
                value={
                  <>
                    {extras.changed_label}
                    {extras.moved_recently ? (
                      <span className="badge badge-bitrix ms-1" title={`Movida el ${extras.moved_label}`}>
                        Movida
                      </span>
                    ) : null}
                  </>
                }
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className="card-footer bg-transparent py-2">
        <button type="button" className="btn btn-sm btn-outline-info" title="Actualizar información de Bitrix" disabled={refreshing} onClick={onRefresh}>
          <i className={`fas fa-sync-alt${refreshing ? " fa-spin" : ""}`} aria-hidden="true" /> Actualizar
        </button>
      </div>
    </div>
  );
}

function StatusLine({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <div className="bitrix-status-row">
      <i className={`ui-icon fas ${icon}`} aria-hidden="true" />
      <div>
        <small className="text-uppercase text-muted">{label}</small>
        <div className="fw-semibold text-dark">{value}</div>
      </div>
    </div>
  );
}

function Field({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="mb-2">
      <i className={`fas ${icon} text-muted`} aria-hidden="true" /> <strong>{label}:</strong>
      <br />
      <span className="ms-4">{value}</span>
    </div>
  );
}

function IpField({ icon, label, ip }: { icon: string; label: string; ip: string | null }) {
  return (
    <div className="mb-2">
      <i className={`fas ${icon} text-muted`} aria-hidden="true" /> <strong>{label}:</strong>
      <br />
      <code className="ms-4">
        {ip ? (
          <a href={`http://${ip}`} target="_blank" rel="noopener noreferrer" className="text-decoration-none text-primary" title="Abrir en nuevo tab">
            {ip} <i className="fas fa-external-link-alt" aria-hidden="true" />
          </a>
        ) : (
          "—"
        )}
      </code>
    </div>
  );
}

function Row({ label, value, last = false }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <>
      <div className="row mb-3">
        <div className="col-sm-3">
          <strong>{label}:</strong>
        </div>
        <div className="col-sm-9">{value}</div>
      </div>
      {last ? null : <hr />}
    </>
  );
}

function PingOverlay() {
  return (
    <div
      style={{
        display: "flex",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.7)",
        zIndex: 9999,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ textAlign: "center", background: "white", padding: 30, borderRadius: 10, boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
        <div className="loading-dots" role="status" aria-label="Cargando...">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <h4 className="mt-3 mb-2 text-success">
          <i className="fas fa-network-wired" aria-hidden="true" /> Verificando Conectividad
        </h4>
        <p className="text-muted mb-0">
          <i className="fas fa-broadcast-tower" aria-hidden="true" /> Haciendo ping a la Antena...
          <br />
          <i className="fas fa-router" aria-hidden="true" /> Haciendo ping al Router...
        </p>
        <small className="text-muted">Por favor espere...</small>
      </div>
    </div>
  );
}

function PingModal({ payload, onClose, onAgain }: { payload: VerifyPayload; onClose: () => void; onAgain: () => void }) {
  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fas fa-network-wired" aria-hidden="true" /> Verificación de Conectividad - {payload.client.nom}
              </h5>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="card shadow mb-3">
                <div className="card-body py-2">
                  <div className="row">
                    <div className="col-md-4">
                      <strong>
                        <i className="fas fa-user" aria-hidden="true" /> Nombre:
                      </strong>{" "}
                      {payload.client.nom}
                    </div>
                    <div className="col-md-4">
                      <strong>
                        <i className="fas fa-map-marker-alt" aria-hidden="true" /> Dirección:
                      </strong>{" "}
                      {payload.client.adresse || "N/A"}
                    </div>
                    <div className="col-md-4">
                      <strong>
                        <i className="fas fa-city" aria-hidden="true" /> Barrio:
                      </strong>{" "}
                      {payload.client.ville || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6 mb-3">
                  <PingDevice title="ANTENA" icon="fa-broadcast-tower" result={payload.resultado_antena} />
                </div>
                <div className="col-md-6 mb-3">
                  <PingDevice title="ROUTER" icon="fa-router" result={payload.resultado_router} />
                </div>
              </div>
              <div className="card shadow">
                <div className="card-header py-2 bg-info text-white">
                  <h6 className="mb-0">
                    <i className="fas fa-stethoscope" aria-hidden="true" /> Diagnóstico y Recomendaciones
                  </h6>
                </div>
                <div className="card-body py-2">
                  <PingDiagnosis router={payload.resultado_router} antena={payload.resultado_antena} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cerrar
              </button>
              <button type="button" className="btn btn-primary" onClick={onAgain}>
                <i className="fas fa-sync-alt" aria-hidden="true" /> Verificar de Nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PingDevice({ title, icon, result }: { title: string; icon: string; result: PingResult }) {
  const successRate = 100 - result.packet_loss;
  const bar = result.packet_loss === 0 ? "bg-success" : result.packet_loss < 50 ? "bg-warning" : "bg-danger";
  return (
    <div className={`card shadow h-100 ${result.success ? "border-success" : "border-danger"}`} style={{ borderWidth: 2 }}>
      <div className={`card-header ${result.success ? "bg-success" : "bg-danger"} text-white text-center py-2`}>
        <h6 className="mb-0">
          <i className={`fas ${icon}`} aria-hidden="true" /> {title}
        </h6>
        <small>
          <code className="text-white" style={{ fontSize: "0.8rem" }}>
            {result.ip || "No configurada"}
          </code>
        </small>
      </div>
      <div className="card-body py-2 px-3">
        <div className="text-center mb-2 py-1">
          <h5 className={`${result.success ? "text-success" : "text-danger"} mb-0`}>
            <i className={`fas ${result.success ? "fa-check-circle" : "fa-times-circle"} fa-2x`} aria-hidden="true" />
            <p className="mt-2 mb-0" style={{ fontSize: "0.9rem" }}>
              {result.success ? "CONECTADO" : "SIN CONEXIÓN"}
            </p>
          </h5>
        </div>
        {result.error ? (
          <div className="alert alert-danger py-2">
            <small>
              <i className="fas fa-exclamation-triangle" aria-hidden="true" /> <strong>Error:</strong> {result.error}
            </small>
          </div>
        ) : (
          <>
            <p className="text-uppercase text-muted mb-2" style={{ fontSize: "0.75rem" }}>
              <i className="fas fa-chart-bar" aria-hidden="true" /> Estadísticas de Paquetes
            </p>
            <div className="row text-center g-1 mb-2">
              <Stat label="Enviados" value={result.packets_sent} tone="text-primary" />
              <Stat label="Recibidos" value={result.packets_received} tone="text-success" />
              <Stat label="Perdidos" value={result.packets_lost} tone="text-danger" />
              <Stat label="Pérdida" value={`${result.packet_loss}%`} tone="text-warning" />
            </div>
            <p className="text-uppercase text-muted mb-1" style={{ fontSize: "0.75rem" }}>
              <i className="fas fa-signal" aria-hidden="true" /> Tasa de Éxito
            </p>
            <div className="progress mb-2" style={{ height: 25 }}>
              <div className={`progress-bar ${bar}`} style={{ width: `${Math.max(0, successRate)}%` }}>
                <small>
                  <strong>{successRate}%</strong>
                </small>
              </div>
            </div>
            <p className="text-uppercase text-muted mb-2" style={{ fontSize: "0.75rem" }}>
              <i className="fas fa-clock" aria-hidden="true" /> Tiempos de Respuesta
            </p>
            <div className="row text-center g-1">
              <div className="col-4">
                <div className="p-2 bg-light rounded">
                  <h6 className="text-info mb-0" style={{ fontSize: "0.9rem" }}>
                    {result.min_time}
                  </h6>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Min (ms)
                  </small>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 bg-primary text-white rounded">
                  <h6 className="mb-0" style={{ fontSize: "0.9rem" }}>
                    {result.avg_time}
                  </h6>
                  <small style={{ fontSize: "0.7rem" }}>Promedio (ms)</small>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 bg-light rounded">
                  <h6 className="text-warning mb-0" style={{ fontSize: "0.9rem" }}>
                    {result.max_time}
                  </h6>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Max (ms)
                  </small>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="col-6 mb-1">
      <div className="p-2 bg-light rounded">
        <h6 className={`${tone} mb-0`}>{value}</h6>
        <small className="text-muted" style={{ fontSize: "0.7rem" }}>
          {label}
        </small>
      </div>
    </div>
  );
}

function PingDiagnosis({ router, antena }: { router: PingResult; antena: PingResult }) {
  if (!router.success && !antena.success) {
    return (
      <div className="alert alert-danger border-left-danger mb-0">
        <h6 className="alert-heading">
          <i className="fas fa-exclamation-triangle" aria-hidden="true" /> PROBLEMA CRÍTICO
        </h6>
        <p className="mb-1">
          <small>Ni el router ni la antena responden al ping.</small>
        </p>
      </div>
    );
  }
  if (!router.success) {
    return (
      <div className="alert alert-warning border-left-warning mb-0">
        <h6 className="alert-heading">
          <i className="fas fa-exclamation-circle" aria-hidden="true" /> PROBLEMA EN EL ROUTER
        </h6>
        <p className="mb-1">
          <small>El router no responde, pero la antena funciona correctamente.</small>
        </p>
      </div>
    );
  }
  if (!antena.success) {
    return (
      <div className="alert alert-warning border-left-warning mb-0">
        <h6 className="alert-heading">
          <i className="fas fa-exclamation-circle" aria-hidden="true" /> PROBLEMA EN LA ANTENA
        </h6>
        <p className="mb-1">
          <small>La antena no responde, pero el router funciona correctamente.</small>
        </p>
      </div>
    );
  }
  if (router.packet_loss > 10 || antena.packet_loss > 10) {
    return (
      <div className="alert alert-warning border-left-warning mb-0">
        <h6 className="alert-heading">
          <i className="fas fa-signal" aria-hidden="true" /> CONEXIÓN INESTABLE
        </h6>
        <p className="mb-1">
          <small>Alta pérdida de paquetes detectada.</small>
        </p>
      </div>
    );
  }
  return (
    <div className="alert alert-success border-left-success mb-0">
      <h6 className="alert-heading">
        <i className="fas fa-check-circle" aria-hidden="true" /> CONEXIÓN ÓPTIMA
      </h6>
      <p className="mb-0">
        <small>Ambos dispositivos responden correctamente. Y Muy bien!!!</small>
      </p>
    </div>
  );
}

function safePath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/incidencias";
  }
  return value;
}

function splitDate(iso: string): { date: string; time: string } {
  const formatted = formatIncidentDate(iso);
  const [date, time] = formatted.split(" ");
  return { date: date ?? formatted, time: time ?? "" };
}

function elapsedLabel(iso: string): { text: string; over30: boolean } {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  let text = `${minutes}m`;
  if (days > 0) {
    text = `${days}d ${hours}h`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m`;
  }
  return { text, over30: seconds > 1800 };
}

const PRINT_AND_PING_CSS = `
@media print {
  .btn, .alert, .card-header .badge, .incident-chat__composer { display: none !important; }
  .card { border: 1px solid #ddd !important; box-shadow: none !important; }
  .incident-chat__messages { max-height: none !important; overflow: visible !important; }
}
.loading-dots { width: 140px; height: 28px; margin: 0 auto; position: relative; overflow: hidden; }
.loading-dots span {
  position: absolute; left: 0; top: 50%; width: 6px; height: 6px; margin-top: -3px;
  border-radius: 50%; background: #28a745; box-shadow: 0 0 4px rgba(40, 167, 69, 0.5);
  animation: chenilleMove 2.4s ease-in-out infinite;
}
.loading-dots span:nth-child(1) { animation-delay: 0s; }
.loading-dots span:nth-child(2) { animation-delay: 0.12s; }
.loading-dots span:nth-child(3) { animation-delay: 0.24s; }
.loading-dots span:nth-child(4) { animation-delay: 0.36s; }
.loading-dots span:nth-child(5) { animation-delay: 0.48s; }
.loading-dots span:nth-child(6) { animation-delay: 0.6s; }
@keyframes chenilleMove {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(100px, -2px); }
  50% { transform: translate(100px, 0); }
  75% { transform: translate(0, 2px); }
}
.border-left-danger { border-left: 5px solid #dc3545; }
.border-left-warning { border-left: 5px solid #ffc107; }
.border-left-success { border-left: 5px solid #28a745; }
`;
