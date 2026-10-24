import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { isAdmin, isSuperadmin } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { usePageMeta } from "../../layout/Shell";
import { ESTADO_BADGE, TIPO_BADGE } from "../instalaciones/types";
import "./dashboard.css";

interface OperadorRow {
  id: number;
  nom: string;
  count: number;
}

interface ClienteRow {
  id: number;
  nom: string;
  adresse: string;
  categoria: string;
  count: number;
  intitule: string;
}

interface InstalacionDia {
  id: number;
  fecha: string;
  tipo: string;
  tipo_label: string;
  estado: string;
  estado_label: string;
  tecnico: { id: number; nom: string; avatar_url: string | null } | null;
  client: { id: number; nom: string; adresse: string; categoria: string } | null;
  direccion: string;
  materiales: string;
  lineas: { nombre: string; cantidad: number }[];
}

interface NotaPunto {
  texto: string;
  ciudad: string;
  agencia: string;
}

interface SeriePoint {
  date: string;
  fecha: string;
  count: number;
  solucionadas: number;
  bitrix: number;
  apreciacion: string | null;
  apreciaciones: NotaPunto[];
}

interface DashboardPayload {
  period: string;
  period_date_from: string;
  period_date_to: string;
  total: number;
  solucionadas: number;
  pendiente: number;
  bitrix: number;
  instalaciones_dia: InstalacionDia[];
  por_operador: OperadorRow[];
  clientes: ClienteRow[];
  apreciacion: { id: number | null; texto: string | null; fecha: string; ciudad: string; agencia: string };
  can_edit_apreciacion: boolean;
  is_admin: boolean;
  is_superadmin: boolean;
  ciudades: { id: number; nombre: string }[];
  agencias: { id: number; nombre: string; id_ciudad: number }[];
}

const PERIODS: { id: string; nom: string }[] = [
  { id: "current_month", nom: "Mes en curso" },
  { id: "current_week", nom: "Semana en curso" },
  { id: "last_week", nom: "Semana pasada" },
  { id: "last_3_months", nom: "Últimos 3 meses" },
  { id: "last_month", nom: "Mes anterior" },
  { id: "last_6_months", nom: "Últimos 6 meses" },
  { id: "current_year", nom: "Año en curso" },
  { id: "all_data", nom: "Todos los datos" },
];
const PERIOD_IDS = new Set(PERIODS.map((p) => p.id));
const VIEWS = new Set(["date", "month", "year"]);
const OP_CHARTS = new Set(["doughnut", "bar"]);
const COOKIE = "dashboard_filters_v1";
const COOKIE_AGE = 30 * 24 * 60 * 60;
const CHART_COLORS = ["#dc3545", "#6c757d", "#28a745", "#ffc107", "#17a2b8", "#6f42c1"];
const SKELETON_ROWS = [1, 2, 3, 4, 5];
const SUGERENCIAS = ["Día normal", "Caída de sector", "Problema con Gitge", "Mucho viento", "Problema de luz - Getesa"];

interface SavedFilters {
  scope: string;
  enabled?: boolean;
  period?: string;
  viewType?: string;
  operatorChartType?: string;
  ciudad?: string;
  agencia?: string;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const session = useSession();
  const user = session.user;
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [serie, setSerie] = useState<SeriePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [remember, setRemember] = useState(true);
  const [restored, setRestored] = useState(false);
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [draftCiudad, setDraftCiudad] = useState("");
  const [draftAgencia, setDraftAgencia] = useState("");
  const [notaOpen, setNotaOpen] = useState(false);
  const [notaFecha, setNotaFecha] = useState("");
  const [notaTexto, setNotaTexto] = useState("");
  const [notaId, setNotaId] = useState<number | null>(null);
  const [notaAlcance, setNotaAlcance] = useState("");
  const [notaFeedback, setNotaFeedback] = useState<{ type: string; message: string } | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const booted = useRef(false);

  const period = PERIOD_IDS.has(params.get("period") ?? "") ? (params.get("period") as string) : "current_week";
  const view = VIEWS.has(params.get("view") ?? "") ? (params.get("view") as string) : "date";
  const opChart = OP_CHARTS.has(params.get("opchart") ?? "") ? (params.get("opchart") as string) : "doughnut";
  const ciudad = params.get("ciudad") ?? "";
  const agencia = params.get("agencia") ?? "";
  const admin = isAdmin(user?.role);
  const superadmin = isSuperadmin(user?.role);
  const periodTitle = PERIODS.find((p) => p.id === period)?.nom ?? "Semana en curso";

  const title = useMemo(
    () => (
      <>
        Dashboard — <span id="period-title">{periodTitle}</span>
      </>
    ),
    [periodTitle],
  );

  const actions = useMemo(
    () => (
      <div className="dashboard-header-controls d-flex align-items-center flex-wrap gap-3">
        <div className="dashboard-period-group">
          <div className="d-flex align-items-center flex-wrap gap-2">
            <label htmlFor="period-selector" className="form-label mb-0 text-muted small">
              Período:
            </label>
            <select
              className="form-select form-select-sm"
              id="period-selector"
              value={period}
              onChange={(event) => patchParams({ period: event.target.value })}
            >
              {PERIODS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nom}
                </option>
              ))}
            </select>
            {superadmin ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                id="btn-dashboard-filtrar"
                onClick={() => {
                  setDraftCiudad(ciudad);
                  setDraftAgencia(agencia);
                  setFiltroOpen(true);
                }}
              >
                <i className="fas fa-filter me-1" aria-hidden="true" />
                Filtrar
              </button>
            ) : null}
            {superadmin && (ciudad || agencia) ? <ScopeBadge data={data} ciudad={ciudad} agencia={agencia} /> : null}
          </div>
          <div className="d-flex align-items-center gap-3 mt-2 flex-wrap">
            <div className="form-check mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="remember-filters-toggle"
                checked={remember}
                onChange={(event) => {
                  setRemember(event.target.checked);
                  if (!event.target.checked) clearFiltersCookie();
                }}
              />
              <label className="form-check-label small text-muted" htmlFor="remember-filters-toggle">
                Recordar filtros en este panel
              </label>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              id="reset-filters-btn"
              onClick={() => {
                clearFiltersCookie();
                setRemember(true);
                setParams(new URLSearchParams());
              }}
            >
              <i className="fas fa-undo-alt me-1" />
              Reiniciar filtros
            </button>
          </div>
          <div id="filters-feedback" className={`small text-success mt-1 ${restored ? "" : "d-none"}`}>
            <i className="fas fa-check-circle me-1" />
            Filtros restaurados automáticamente
          </div>
        </div>
      </div>
    ),
    [period, superadmin, ciudad, agencia, data, remember, restored, setParams],
  );

  usePageMeta({
    title,
    icon: <i className="fas fa-tachometer-alt" aria-hidden="true" />,
    subtitle: "Vista general de las incidencias y estadísticas",
    actions,
  });

  function patchParams(next: Record<string, string>) {
    const query = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value && !(key === "view" && value === "date") && !(key === "opchart" && value === "doughnut")) {
        query.set(key, value);
      } else if (key === "period") {
        query.set(key, value);
      } else {
        query.delete(key);
      }
    }
    setParams(query);
  }

  useEffect(() => {
    if (!user || booted.current) return;
    booted.current = true;
    const saved = readFilters(user.userId);
    if (saved && saved.enabled === false) setRemember(false);
    const current = new URLSearchParams(window.location.search);
    const canUse = saved && saved.enabled !== false;
    const urlHasScope = current.has("ciudad") || current.has("agencia");
    const next = new URLSearchParams(current);
    let changed = false;
    let fromCookie = false;
    if (!PERIOD_IDS.has(current.get("period") ?? "") && canUse && saved?.period && PERIOD_IDS.has(saved.period)) {
      next.set("period", saved.period);
      changed = true;
      fromCookie = true;
    }
    if (!VIEWS.has(current.get("view") ?? "") && canUse && saved?.viewType && VIEWS.has(saved.viewType) && saved.viewType !== "date") {
      next.set("view", saved.viewType);
      changed = true;
      fromCookie = true;
    }
    if (!OP_CHARTS.has(current.get("opchart") ?? "") && canUse && saved?.operatorChartType && OP_CHARTS.has(saved.operatorChartType) && saved.operatorChartType !== "doughnut") {
      next.set("opchart", saved.operatorChartType);
      changed = true;
      fromCookie = true;
    }
    if (isSuperadmin(user.role) && canUse && !urlHasScope && (saved?.ciudad || saved?.agencia)) {
      if (saved.ciudad) next.set("ciudad", saved.ciudad);
      if (saved.agencia) next.set("agencia", saved.agencia);
      changed = true;
    }
    if (changed) {
      setParams(next, { replace: true });
      if (fromCookie) setRestored(true);
    }
  }, [user, setParams]);

  useEffect(() => {
    if (!restored) return;
    const timer = window.setTimeout(() => setRestored(false), 3000);
    return () => window.clearTimeout(timer);
  }, [restored]);

  useEffect(() => {
    if (!user || !remember) return;
    writeFilters({
      scope: `dashboard_user_${user.userId}`,
      enabled: true,
      period,
      viewType: view,
      operatorChartType: opChart,
      ciudad,
      agencia,
    });
  }, [user, remember, period, view, opChart, ciudad, agencia]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ period });
    if (ciudad) qs.set("ciudad", ciudad);
    if (agencia) qs.set("agencia", agencia);
    const serieQs = new URLSearchParams(qs);
    serieQs.set("type", view);
    void (async () => {
      try {
        const [payload, points] = await Promise.all([
          api<DashboardPayload>(`/api/dashboard?${qs.toString()}`),
          api<{ items: SeriePoint[] }>(`/api/dashboard/serie?${serieQs.toString()}`),
        ]);
        if (!cancelled) {
          setData(payload);
          setSerie(points.items ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, view, ciudad, agencia, reloadKey]);

  function incidentHref(extra: Record<string, string> = {}) {
    const query = new URLSearchParams();
    if (data?.period_date_from) query.set("date_from", data.period_date_from);
    if (data?.period_date_to) query.set("date_to", data.period_date_to);
    if (ciudad) query.set("ciudad", ciudad);
    if (agencia) query.set("agencia", agencia);
    for (const [key, value] of Object.entries(extra)) {
      if (value) query.set(key, value);
    }
    const text = query.toString();
    return text ? `/incidencias?${text}` : "/incidencias";
  }

  function openNota(fecha: string) {
    if (!admin) return;
    setNotaFecha(fecha);
    setNotaFeedback(null);
    setNotaOpen(true);
  }

  useEffect(() => {
    if (!notaOpen || !notaFecha) return;
    const qs = new URLSearchParams({ fecha: notaFecha });
    if (ciudad) qs.set("ciudad", ciudad);
    if (agencia) qs.set("agencia", agencia);
    void api<{ id: number | null; texto: string | null; ciudad?: string; agencia?: string }>(`/api/apreciaciones?${qs.toString()}`)
      .then((payload) => {
        setNotaId(payload.id);
        setNotaTexto(payload.texto ?? "");
        const where = [payload.ciudad, payload.agencia].filter(Boolean).join(" · ");
        setNotaAlcance(where ? `Se guarda en ${where}.` : "");
      })
      .catch((err: unknown) => {
        setNotaFeedback({ type: "danger", message: err instanceof ApiError ? err.message : "Error" });
      });
  }, [notaOpen, notaFecha, ciudad, agencia]);

  async function saveNota(event: FormEvent) {
    event.preventDefault();
    const texto = notaTexto.trim();
    if (!notaFecha) {
      setNotaFeedback({ type: "warning", message: "Seleccione una fecha." });
      return;
    }
    if (!texto) {
      setNotaFeedback({ type: "warning", message: "La apreciación no puede estar vacía." });
      return;
    }
    if (texto.length > 120) {
      setNotaFeedback({ type: "warning", message: "La apreciación no puede superar 120 caracteres." });
      return;
    }
    try {
      await api("/api/apreciaciones", {
        method: "PUT",
        body: JSON.stringify({ fecha: notaFecha, texto, ciudad, agencia }),
      });
      setNotaOpen(false);
      setReloadKey((value) => value + 1);
    } catch (err) {
      setNotaFeedback({ type: "danger", message: err instanceof ApiError ? err.message : "No se pudo guardar." });
    }
  }

  async function deleteNota() {
    if (!notaFecha || !window.confirm("¿Eliminar la apreciación de esta fecha?")) return;
    const qs = new URLSearchParams({ fecha: notaFecha });
    if (ciudad) qs.set("ciudad", ciudad);
    if (agencia) qs.set("agencia", agencia);
    try {
      await api(`/api/apreciaciones?${qs.toString()}`, { method: "DELETE" });
      setNotaOpen(false);
      setReloadKey((value) => value + 1);
    } catch (err) {
      setNotaFeedback({ type: "danger", message: err instanceof ApiError ? err.message : "No se pudo eliminar." });
    }
  }

  async function copyInstalacion(item: InstalacionDia) {
    const materiales = item.lineas.map((linea) => `${linea.nombre} x${linea.cantidad}`).join("\n");
    const texte = [item.client?.nom, materiales, item.tecnico?.nom].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(texte);
      setCopyMsg("Información de la instalación copiada al portapapeles");
    } catch {
      setCopyMsg("Error al copiar. Intente seleccionar y copiar manualmente.");
    }
    setMenuId(null);
    window.setTimeout(() => setCopyMsg(null), 2500);
  }

  const hoy = todayIso();
  const agenciasModal = (data?.agencias ?? []).filter((row) => !draftCiudad || String(row.id_ciudad) === draftCiudad);
  const loadingClass = loading ? "is-loading" : "";

  return (
    <div className="container-fluid px-0" aria-busy={loading}>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {copyMsg ? <div className="alert alert-success py-2">{copyMsg}</div> : null}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 mb-4 g-3">
        <Kpi label="Total de Registrados" value={data?.total ?? 0} tone="registered" icon="fa-ticket" to={incidentHref()} loading={loadingClass} delay="delay-1" hint="Ver todas las incidencias del período" />
        <Kpi label={<>{t("Solucionadas")} <small className="fst-italic">(remotamente)</small></>} value={data?.solucionadas ?? 0} tone="resolved" icon="fa-check-circle" to={incidentHref({ status: "Solucionadas" })} loading={loadingClass} delay="delay-2" hint="Ver incidencias solucionadas del período" />
        <Kpi label={t("Pendientes")} value={data?.pendiente ?? 0} tone="pending" icon="fa-clock" to={incidentHref({ status: "Pendiente" })} loading={loadingClass} delay="delay-3" hint="Ver incidencias pendientes del período" />
        <Kpi label={<>Bitrix <small className="fst-italic">(localmente)</small></>} value={data?.bitrix ?? 0} tone="bitrix" icon="fa-cog" to={incidentHref({ status: "Bitrix" })} loading={loadingClass} delay="delay-4" hint="Ver incidencias Bitrix del período" />
      </div>

      <div className="row mb-4">
        <div className="col-lg-8 mb-3">
          <div className="chart-container h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 flex-shrink-0">
              <h5 className="mb-0">
                <i className="fas fa-chart-line text-danger me-2" />
                Evolución de las incidencias
              </h5>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {admin ? (
                  <button type="button" className="btn btn-sm btn-outline-secondary" id="btn-apreciacion-dia" title="Añadir o editar la nota del día" onClick={() => openNota(todayIso())}>
                    <i className="fas fa-comment-alt me-1" />
                    Nota del día
                  </button>
                ) : null}
                <div className="btn-group" role="group" id="incidents-chart-view" aria-label="Vista de evolución">
                  <ChartToggle id="btn-date" active={view === "date"} onClick={() => patchParams({ view: "date" })}>Por día</ChartToggle>
                  <ChartToggle id="btn-month" active={view === "month"} onClick={() => patchParams({ view: "month" })}>Por mes</ChartToggle>
                  <ChartToggle id="btn-year" active={view === "year"} onClick={() => patchParams({ view: "year" })}>Por año</ChartToggle>
                </div>
              </div>
            </div>
            {loading ? <ChartSkeleton /> : <EvolutionChart points={serie} view={view} canEdit={admin} onPickDate={openNota} />}
          </div>
        </div>
        <div className="col-lg-4 mb-3">
          <div className="chart-container h-100 d-flex flex-column">
            <div className="d-flex flex-column gap-2 flex-shrink-0">
              <h5 className="mb-0">
                <i id="operateur-chart-icon" className={`fas ${opChart === "bar" ? "fa-chart-bar" : "fa-chart-pie"} text-danger me-2`} />
                Distribución por operador
              </h5>
              <div className="btn-group" role="group" id="operateur-chart-type" aria-label="Tipo de gráfico">
                <ChartToggle id="btn-operateur-doughnut" active={opChart === "doughnut"} onClick={() => patchParams({ opchart: "doughnut" })}>
                  <i className="fas fa-chart-pie me-1" />Tarta
                </ChartToggle>
                <ChartToggle id="btn-operateur-bar" active={opChart === "bar"} onClick={() => patchParams({ opchart: "bar" })}>
                  <i className="fas fa-chart-bar me-1" />Barras
                </ChartToggle>
              </div>
            </div>
            {loading ? <ChartSkeleton pie /> : <OperatorChart rows={data?.por_operador ?? []} type={opChart} onPick={(id) => { window.location.href = incidentHref({ operateur: String(id) }); }} />}
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <div className="card content-card" id="instalaciones-dia-card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">
                <i className="fas fa-building me-2" aria-hidden="true" />
                Instalaciones del día
                {data?.instalaciones_dia?.length ? <span className="text-muted fw-normal"> ({data.instalaciones_dia.length})</span> : null}
              </h5>
              {admin ? (
                <Link to={`/instalaciones?date_from=${hoy}&date_to=${hoy}`} className="btn btn-sm btn-outline-secondary">
                  Ver lista
                </Link>
              ) : null}
            </div>
            <div className="card-body p-0">
              {loading ? (
                <LoadingLines />
              ) : data?.instalaciones_dia?.length ? (
                <>
                  <div className="table-responsive d-none d-lg-block">
                    <table className="table table-hover mb-0 align-middle">
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
                        {data.instalaciones_dia.map((item) => (
                          <tr key={item.id}>
                            <td><strong>#{item.id}</strong></td>
                            <td>{item.fecha}</td>
                            <td><span className={`badge ${TIPO_BADGE[item.tipo] ?? "bg-secondary"}`}>{item.tipo_label}</span></td>
                            <td>
                              {item.tecnico ? (
                                <div className="d-flex align-items-center gap-2">
                                  <img src={item.tecnico.avatar_url || "/static/img/default_avatar.png"} alt={item.tecnico.nom} className="rounded-circle" width={28} height={28} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/static/img/default_avatar.png"; }} />
                                  <span>{item.tecnico.nom}</span>
                                </div>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td>
                              {item.client ? (
                                <>
                                  <span className="d-inline-flex align-items-center gap-1">
                                    <Corporativo categoria={item.client.categoria} />
                                    <i className="fas fa-user-tie me-1" aria-hidden="true" />
                                    <Link to={`/clientes/${item.client.id}`} className="text-decoration-none text-dark">{item.client.nom}</Link>
                                  </span>
                                  {item.direccion ? <><br /><small className="small text-muted fst-italic" style={{ fontSize: "0.65rem" }}><i className="fas fa-map-marker-alt me-1" aria-hidden="true" />{item.direccion}</small></> : null}
                                </>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td>
                              <div className="text-truncate small text-muted" style={{ maxWidth: 220 }} title={item.materiales || undefined}>
                                {item.materiales || "—"}
                              </div>
                            </td>
                            <td><span className={`badge ${ESTADO_BADGE[item.estado] ?? "bg-secondary"}`}>{item.estado_label}</span></td>
                            <td>
                              {admin ? (
                                <div className="btn-group" role="group">
                                  <Link to={`/instalaciones/${item.id}`} className="btn btn-sm btn-outline-secondary" title="Ver"><i className="fas fa-eye" aria-hidden="true" /></Link>
                                  <Link to={`/instalaciones/${item.id}/editar`} className="btn btn-sm btn-outline-primary" title="Modificar"><i className="fas fa-edit" aria-hidden="true" /></Link>
                                </div>
                              ) : <span className="text-muted">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mobile-list d-lg-none">
                    {data.instalaciones_dia.map((item) => (
                      <article className="mobile-list-card" key={item.id}>
                        <div className="mobile-list-card__head">
                          <div className="mobile-list-card__meta">
                            <span className="mobile-list-card__id">#{item.id}</span>
                            <span className={`badge ${TIPO_BADGE[item.tipo] ?? "bg-secondary"}`}>{item.tipo_label}</span>
                            <span className={`badge ${ESTADO_BADGE[item.estado] ?? "bg-secondary"}`}>{item.estado_label}</span>
                          </div>
                          {admin ? (
                            <div className="dropdown mobile-list-card__menu">
                              <button type="button" className="btn btn-sm btn-outline-secondary mobile-list-card__menu-btn" aria-label="Acciones" onClick={() => setMenuId(menuId === item.id ? null : item.id)}>
                                <i className="fas fa-ellipsis-v" />
                              </button>
                              {menuId === item.id ? (
                                <ul className="dropdown-menu dropdown-menu-end show">
                                  <li><Link className="dropdown-item" to={`/instalaciones/${item.id}`}><i className="fas fa-eye me-2" />Ver</Link></li>
                                  <li><Link className="dropdown-item" to={`/instalaciones/${item.id}/editar`}><i className="fas fa-edit me-2" />Modificar</Link></li>
                                  <li><button type="button" className="dropdown-item" onClick={() => void copyInstalacion(item)}><i className="fas fa-copy me-2" />Copiar información</button></li>
                                </ul>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        {admin ? (
                          <Link className="mobile-list-card__title" to={`/instalaciones/${item.id}`}>{item.client?.nom ?? "—"}</Link>
                        ) : item.client ? (
                          <Link className="mobile-list-card__title" to={`/clientes/${item.client.id}`}>{item.client.nom}</Link>
                        ) : <span className="mobile-list-card__title">—</span>}
                        <div className="mobile-list-card__badges">
                          <span className="badge rounded-pill mobile-list-card__chip"><i className="fas fa-user-cog me-1" />{item.tecnico?.nom ?? "—"}</span>
                          <span className="badge rounded-pill mobile-list-card__chip mobile-list-card__chip--date"><i className="fas fa-clock me-1" />{item.fecha}</span>
                          {item.lineas.map((linea, index) => (
                            <span className="badge rounded-pill mobile-list-card__chip" key={`${item.id}-${index}`}>{linea.nombre} ×{linea.cantidad}</span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-building fa-3x text-muted mb-3" aria-hidden="true" />
                  <h5 className="text-muted">No hay instalaciones registradas hoy</h5>
                  {admin ? (
                    <Link to="/instalaciones/nueva" className="btn btn-primary">
                      <i className="fas fa-plus me-1" aria-hidden="true" />
                      Nueva instalación
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className={`card content-card ${loadingClass}`}>
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0"><i className="fas fa-list me-2" />5 Clientes Recurrentes</h5>
              <Link to="/clientes" className="btn btn-sm btn-outline-secondary">Ver clientes</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive d-none d-lg-block">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th className="text-center col-categoria-icon" title="Cliente corporativo">Categoría</th>
                      <th>Cliente</th>
                      <th>N° de Incidencias</th>
                      <th>Asuntos</th>
                    </tr>
                  </thead>
                  <tbody id="clients-recurrents-tbody">
                    {loading
                      ? SKELETON_ROWS.map((row) => (
                          <tr key={row} aria-hidden="true">
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                          </tr>
                        ))
                      : null}
                    {!loading ? (data?.clientes ?? []).map((client, index) => (
                      <tr key={client.id}>
                        <td><strong># {index + 1}</strong></td>
                        <td className="col-categoria-icon text-center"><Corporativo categoria={client.categoria} /></td>
                        <td>
                          <i className="fas fa-user-tie me-1" aria-hidden="true" />
                          <Link to={`/clientes/${client.id}`} className="text-decoration-none text-dark">{client.nom}</Link>
                          <br />
                          <small className="small text-muted fst-italic" style={{ fontSize: "0.65rem" }}>
                            <i className="fas fa-map-marker-alt me-1" aria-hidden="true" />
                            {client.adresse}
                          </small>
                        </td>
                        <td>
                          <Link to={incidentHref({ search: client.nom })} className={`badge badge-rank-${index + 1} text-decoration-none`} title="Ver incidencias">{client.count}</Link>
                        </td>
                        <td>{client.intitule}</td>
                      </tr>
                    )) : null}
                  </tbody>
                </table>
              </div>
              <div className="mobile-list d-lg-none" id="clients-recurrents-cards">
                {loading ? <LoadingLines /> : (data?.clientes ?? []).length ? (data?.clientes ?? []).map((client, index) => (
                  <article className="mobile-list-card" key={client.id}>
                    <div className="mobile-list-card__head">
                      <div className="mobile-list-card__meta">
                        <span className="mobile-list-card__id">#{index + 1}</span>
                        <Corporativo categoria={client.categoria} />
                      </div>
                      <Link to={incidentHref({ search: client.nom })} className={`badge badge-rank-${index + 1} ms-auto text-decoration-none`} title="Ver incidencias">{client.count}</Link>
                    </div>
                    <Link className="mobile-list-card__title" to={`/clientes/${client.id}`}>{client.nom}</Link>
                    <div className="small text-muted">{client.intitule}</div>
                  </article>
                )) : <p className="text-muted text-center mb-0 py-3">Sin clientes recurrentes en este período</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {filtroOpen ? (
        <Modal id="modalDashboardFiltro" title={<><i className="fas fa-filter me-2" aria-hidden="true" />Filtrar</>} onClose={() => setFiltroOpen(false)}>
          <div className="modal-body">
          <div className="mb-3">
            <label htmlFor="dashboard-ciudad" className="form-label">Ciudad</label>
            <select className="form-select" id="dashboard-ciudad" value={draftCiudad} onChange={(event) => { setDraftCiudad(event.target.value); setDraftAgencia(""); }}>
              <option value="">Todas las ciudades</option>
              {(data?.ciudades ?? []).map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
            </select>
          </div>
          <div className="mb-0">
            <label htmlFor="dashboard-agencia" className="form-label">Agencia</label>
            <select className="form-select" id="dashboard-agencia" value={agenciasModal.some((row) => String(row.id) === draftAgencia) ? draftAgencia : ""} onChange={(event) => setDraftAgencia(event.target.value)}>
              <option value="">Todas las agencias</option>
              {agenciasModal.map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}
            </select>
            <div className="form-text">La agencia depende de la ciudad elegida.</div>
          </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary me-auto" id="btn-limpiar-dashboard-filtro" onClick={() => { setDraftCiudad(""); setDraftAgencia(""); patchParams({ ciudad: "", agencia: "" }); setFiltroOpen(false); }}>Limpiar</button>
            <button type="button" className="btn btn-secondary" onClick={() => setFiltroOpen(false)}>Cancelar</button>
            <button type="button" className="btn btn-danger" id="btn-aplicar-dashboard-filtro" onClick={() => { patchParams({ ciudad: draftCiudad, agencia: draftAgencia }); setFiltroOpen(false); }}>Aplicar</button>
          </div>
        </Modal>
      ) : null}

      {notaOpen ? (
        <Modal id="modalApreciacionDia" title={<><i className="fas fa-comment-alt me-2" />Nota del día</>} onClose={() => setNotaOpen(false)}>
          <form onSubmit={(event) => void saveNota(event)}>
            <div className="modal-body">
            {notaFeedback ? <div className={`alert alert-${notaFeedback.type} mb-3`} role="alert">{notaFeedback.message}</div> : null}
            <div className="mb-3">
              <label htmlFor="apreciacion-fecha" className="form-label">Fecha</label>
              <input type="date" className="form-control" id="apreciacion-fecha" required value={notaFecha} onChange={(event) => setNotaFecha(event.target.value)} />
              <p className="form-text mb-0" id="apreciacion-alcance">{notaAlcance}</p>
            </div>
            <div className="mb-0">
              <label htmlFor="apreciacion-texto" className="form-label">Nota</label>
              <input type="text" className="form-control" id="apreciacion-texto" list="apreciacion-sugerencias" maxLength={120} placeholder="Ej. Día normal" required value={notaTexto} onChange={(event) => setNotaTexto(event.target.value)} />
              <datalist id="apreciacion-sugerencias">
                {SUGERENCIAS.map((item) => <option key={item} value={item} />)}
              </datalist>
              <div className="form-text">Máximo 120 caracteres, una por día, ciudad y agencia. Se muestra al pasar el cursor sobre el gráfico (vista por día).</div>
            </div>
            </div>
            <div className="modal-footer">
              <button type="button" className={`btn btn-outline-danger me-auto ${notaId ? "" : "d-none"}`} id="btn-eliminar-apreciacion" onClick={() => void deleteNota()}>
                <i className="fas fa-trash me-1" />Eliminar
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setNotaOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-danger" id="btn-guardar-apreciacion"><i className="fas fa-save me-1" />Guardar</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, tone, icon, to, loading, delay, hint }: { label: ReactNode; value: number; tone: string; icon: string; to: string; loading: string; delay: string; hint: string }) {
  const busy = Boolean(loading);
  return (
    <div className="col">
      <Link className="stat-card-link h-100" to={to} aria-label={hint}>
        <div className={`card stat-card stat-card--${tone} h-100 stagger-in ${delay} ${loading}`}>
          <div className="card-body">
            <div className="stat-card-inner">
              <div className={`stat-card-icon stat-card-icon--${tone}`} aria-hidden="true"><i className={`fas ${icon}`} /></div>
              <div className="stat-card-copy">
                <div className="stat-label">{label}</div>
                {busy ? <div className="skeleton skeleton-number" aria-hidden="true" /> : null}
                <div className={`stat-number stat-card-value${busy ? " d-none" : ""}`}>
                  <CountUp value={busy ? null : value} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function CountUp({ value }: { value: number | null }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const from = displayRef.current;
    const start = performance.now();
    const duration = 500;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const current = Math.round(from + (value - from) * progress);
      displayRef.current = current;
      setDisplay(current);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return <>{display}</>;
}

function ChartSkeleton({ pie = false }: { pie?: boolean }) {
  return (
    <div className={`chart-canvas-wrap flex-grow-1${pie ? " chart-canvas-wrap--pie" : ""}`} aria-hidden="true">
      <div className="skeleton skeleton-chart" />
    </div>
  );
}

function LoadingLines() {
  return (
    <div className="p-3" aria-hidden="true">
      {SKELETON_ROWS.slice(0, 3).map((row) => <div className="skeleton skeleton-line" key={row} />)}
    </div>
  );
}

function ChartToggle({ id, active, onClick, children }: { id: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" id={id} className={`btn btn-sm ${active ? "btn-danger active" : "btn-outline-danger"}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Corporativo({ categoria }: { categoria: string }) {
  if (categoria !== "corporativo") return null;
  return <img src="/static/img/icon-cliente-corporativo.png" alt="Cliente corporativo" title="Cliente corporativo" className="icon-cliente-corporativo" width={22} height={22} />;
}

function ScopeBadge({ data, ciudad, agencia }: { data: DashboardPayload | null; ciudad: string; agencia: string }) {
  const ciudadNom = data?.ciudades.find((row) => String(row.id) === ciudad)?.nombre ?? "";
  const agenciaNom = data?.agencias.find((row) => String(row.id) === agencia)?.nombre ?? "";
  const label = [ciudadNom, agenciaNom].filter(Boolean).join(" · ");
  if (!label) return null;
  return <span className="badge bg-danger" id="dashboard-scope-badge">{label}</span>;
}

function Modal({ id, title, onClose, children }: { id: string; title: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block" id={id} tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

function EvolutionChart({ points, view, canEdit, onPickDate }: { points: SeriePoint[]; view: string; canEdit: boolean; onPickDate: (fecha: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);
  const pickRef = useRef(onPickDate);
  pickRef.current = onPickDate;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void import("chart.js/auto").then(({ default: Chart }) => {
      if (cancelled || !canvasRef.current) return;
      const hasNote = points.map((item) => view === "date" && Boolean(item.apreciacion));
      const spec = {
        type: "line" as const,
        data: {
          labels: points.map((item) => item.date),
          datasets: [
            lineDataset("Bitrix", "#0d6efd", points.map((item) => item.bitrix), hasNote),
            lineDataset("Solucionadas", "#198754", points.map((item) => item.solucionadas), hasNote),
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 4, right: 12, bottom: 0, left: 4 } },
          animation: { duration: 800 },
          onClick: (_event: unknown, elements: { index: number }[]) => {
            if (!canEdit || view !== "date" || !elements.length) return;
            const fecha = points[elements[0].index]?.fecha;
            if (fecha) pickRef.current(fecha);
          },
          plugins: {
            legend: { display: true, position: "top" as const },
            tooltip: {
              mode: "index" as const,
              intersect: false,
              callbacks: {
                footer: (items: { dataIndex: number }[]) => {
                  if (view !== "date" || !items.length) return "";
                  return tooltipLines(points[items[0].dataIndex]?.apreciaciones ?? []);
                },
              },
            },
          },
          scales: {
            x: { display: true, title: { display: true, text: view === "date" ? "Fecha" : "Fecha y Hora" } },
            y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Cantidad" } },
          },
          interaction: { mode: "nearest" as const, axis: "x" as const, intersect: false },
        },
      };
      if (chartRef.current) chartRef.current.destroy();
      const chart = new Chart(canvasRef.current, spec);
      canvasRef.current.style.cursor = canEdit && view === "date" ? "pointer" : "default";
      chartRef.current = chart;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [points, view, canEdit]);

  useEffect(() => () => chartRef.current?.destroy(), []);

  return (
    <div className="chart-canvas-wrap flex-grow-1">
      <canvas ref={canvasRef} id="incidentsChart" />
    </div>
  );
}

function lineDataset(label: string, color: string, data: number[], hasNote: boolean[]) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color === "#0d6efd" ? "rgba(13, 110, 253, 0.15)" : "rgba(25, 135, 84, 0.15)",
    borderWidth: 3,
    fill: false,
    tension: 0.3,
    pointBackgroundColor: color,
    pointBorderColor: hasNote.map((flag) => (flag ? "#fd7e14" : "#fff")),
    pointBorderWidth: hasNote.map((flag) => (flag ? 3 : 2)),
    pointRadius: hasNote.map((flag) => (flag ? 5 : 3)),
    pointHoverRadius: hasNote.map((flag) => (flag ? 7 : 5)),
  };
}

function tooltipLines(items: NotaPunto[]): string[] {
  if (!items.length) return [];
  const lines: string[] = [];
  const source = items.length === 1 ? [items[0].texto] : items.map((item) => {
    const where = [item.ciudad, item.agencia].filter(Boolean).join(" · ");
    return where ? `${where}: ${item.texto}` : item.texto;
  });
  for (const texto of source) lines.push(...wrapTooltip(texto));
  return lines;
}

function wrapTooltip(texto: string): string[] {
  const maxLen = 42;
  if (!texto) return [];
  if (texto.length <= maxLen) return [texto];
  const lines: string[] = [];
  let line = "";
  for (const word of texto.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLen) {
      if (line) lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function OperatorChart({ rows, type, onPick }: { rows: OperadorRow[]; type: string; onPick: (id: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<{ destroy: () => void } | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const canvas = canvasRef.current;
    chartRef.current?.destroy();
    chartRef.current = null;
    if (!canvas || !rows.length) return;
    let cancelled = false;
    void import("chart.js/auto").then(({ default: Chart }) => {
      if (cancelled || !canvasRef.current) return;
      const labels = rows.map((row) => row.nom);
      const values = rows.map((row) => row.count);
      const colors = labels.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]);
      const chart = new Chart(canvasRef.current, {
        type: type === "bar" ? "bar" : "doughnut",
        data: {
          labels,
          datasets: type === "bar"
            ? [{ label: "Incidencias", data: values, backgroundColor: colors, borderColor: "#fff", borderWidth: 1, borderRadius: 4, maxBarThickness: 48 }]
            : [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
          layout: { padding: 4 },
          onHover: (event, elements) => {
            const target = event.native?.target as HTMLCanvasElement | undefined;
            if (target) target.style.cursor = elements.length ? "pointer" : "default";
          },
          onClick: (_event, elements) => {
            if (!elements.length) return;
            const row = rows[elements[0].index];
            if (row) pickRef.current(row.id);
          },
          plugins: type === "bar"
            ? { legend: { display: false } }
            : { legend: { position: "bottom", labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } },
          scales: type === "bar"
            ? {
                x: { ticks: { autoSkip: false, maxRotation: 40, minRotation: 0, font: { size: 11 } } },
                y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Incidencias" } },
              }
            : undefined,
        },
      });
      chartRef.current = chart;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [rows, type]);

  useEffect(() => () => chartRef.current?.destroy(), []);

  if (!rows.length) {
    return (
      <div className="chart-canvas-wrap chart-canvas-wrap--pie flex-grow-1">
        <div className="text-center py-4"><p className="text-muted mb-0">Sin datos para este período</p></div>
      </div>
    );
  }
  return (
    <div className="chart-canvas-wrap chart-canvas-wrap--pie flex-grow-1">
      <canvas ref={canvasRef} id="operateursChart" />
    </div>
  );
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function readFilters(userId: number): SavedFilters | null {
  const raw = readCookie(COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedFilters;
    if (!parsed || parsed.scope !== `dashboard_user_${userId}`) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeFilters(payload: SavedFilters) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=${COOKIE_AGE}; SameSite=Lax`;
}

function clearFiltersCookie() {
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const cookie of cookies) {
    const index = cookie.indexOf("=");
    const key = index >= 0 ? cookie.slice(0, index) : cookie;
    if (key === name) return decodeURIComponent(index >= 0 ? cookie.slice(index + 1) : "");
  }
  return null;
}
