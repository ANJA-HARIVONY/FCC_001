import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import {
  STATUT_BADGE,
  STATUT_LABEL,
  formatDateTime,
  type InformeDetail,
} from "./types";

export function InformeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<InformeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setError(null);
    try {
      const payload = await api<{ item: InformeDetail }>(`/api/informes/${id}`);
      setItem(payload.item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function regenerar() {
    if (!item || !window.confirm("¿Regenerar este informe?")) {
      return;
    }
    setBusy(true);
    try {
      const payload = await api<{ item: InformeDetail }>(`/api/informes/${item.id}/regenerar`, {
        method: "POST",
      });
      setItem(payload.item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function exportJson() {
    if (!item) {
      return;
    }
    setBusy(true);
    try {
      const payload = await api<Record<string, unknown>>(`/api/informes/${item.id}/export`);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe-${item.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function eliminar() {
    if (!item || !window.confirm(`¿Eliminar el informe "${item.titre}"?`)) {
      return;
    }
    setBusy(true);
    try {
      await api(`/api/informes/${item.id}`, { method: "DELETE" });
      navigate("/informes");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
      setBusy(false);
    }
  }

  const actions = item ? (
    <>
      <Link to="/informes" className="btn btn-outline-secondary btn-sm">
        <i className="fas fa-arrow-left me-1" aria-hidden="true" />
        Volver
      </Link>
      {item.statut === "generated" || item.statut === "error" ? (
        <button
          type="button"
          className="btn btn-outline-warning btn-sm"
          disabled={busy}
          onClick={() => void regenerar()}
        >
          <i className="fas fa-sync me-1" aria-hidden="true" />
          Regenerar
        </button>
      ) : null}
      {item.statut === "generated" ? (
        <button
          type="button"
          className="btn btn-outline-success btn-sm"
          disabled={busy}
          onClick={() => void exportJson()}
        >
          <i className="fas fa-file-code me-1" aria-hidden="true" />
          Exportar JSON
        </button>
      ) : null}
      {item.statut === "generated" ? (
        <a className="btn btn-outline-success btn-sm" href={`/api/informes/${item.id}/export.xlsx`}>
          <i className="fas fa-file-excel me-1" aria-hidden="true" />
          Exportar Excel
        </a>
      ) : null}
      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => window.print()}>
        <i className="fas fa-print me-1" aria-hidden="true" />
        Imprimir
      </button>
      <button
        type="button"
        className="btn btn-outline-danger btn-sm"
        disabled={busy}
        onClick={() => void eliminar()}
      >
        <i className="fas fa-trash me-1" aria-hidden="true" />
        Eliminar
      </button>
    </>
  ) : null;

  usePageMeta({
    title: item?.titre ?? "Informe",
    icon: <i className="fas fa-file-lines" aria-hidden="true" />,
    subtitle: item
      ? `Generado el ${formatDateTime(item.date_creation)} | Período: ${item.periode_label}`
      : undefined,
    actions,
  });

  if (error && !item) {
    return <div className="alert alert-danger">{error}</div>;
  }
  if (!item) {
    return <p className="text-muted">Cargando…</p>;
  }

  const contenu = item.contenu ?? {};
  const errorMsg = typeof contenu.error === "string" ? contenu.error : null;

  return (
    <div className="container-fluid px-0 etats-page">
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="mb-3">
        <span className={`badge ${STATUT_BADGE[item.statut] ?? "bg-secondary"}`}>
          {STATUT_LABEL[item.statut] ?? item.statut}
        </span>
        <span className="badge bg-secondary bg-opacity-75 ms-2">{item.type_label}</span>
      </div>

      {item.statut === "generating" ? (
        <div className="card etats-section-card">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status" />
            <h4 className="text-primary">Generación en progreso...</h4>
            <p className="text-muted mb-0">El sistema analiza los datos y prepara el informe.</p>
          </div>
        </div>
      ) : null}

      {item.statut === "error" ? (
        <div className="alert alert-danger">
          <strong>Se produjo un error durante la generación:</strong>
          <br />
          {errorMsg || "Error desconocido"}
        </div>
      ) : null}

      {item.statut === "generated" && item.contenu ? <InformeBody type={item.type_etat} contenu={contenu} /> : null}
    </div>
  );
}

function InformeBody({ type, contenu }: { type: string; contenu: Record<string, unknown> }) {
  const resume = asString(contenu.resume_executif);
  const pointsPos = asStringArray(contenu.points_positivos);
  const pointsAtt = asStringArray(contenu.points_attention);
  const recs = asStringArray(contenu.recommandations);
  const tendances = asStringArray(contenu.tendances_principales);
  const custom = asString(contenu.analyse_personnalisee);
  const kpis = asRecord(contenu.kpis_cles);
  const activite = Array.isArray(contenu.activite_utilisateurs)
    ? (contenu.activite_utilisateurs as Array<Record<string, unknown>>)
    : [];
  const notas = Array.isArray(contenu.notas_del_dia)
    ? (contenu.notas_del_dia as Array<Record<string, unknown>>)
    : [];
  const evolution = Array.isArray(contenu.evolution)
    ? (contenu.evolution as Array<Record<string, unknown>>)
    : [];

  return (
    <article className="etats-report-doc">
      {(type === "summary" || type === "performance") && resume ? (
        <section className="mb-4">
          <h2 className="h5">{type === "summary" ? "Estado General" : "Actividad por Usuario"}</h2>
          {kpis && Object.keys(kpis).length > 0 ? (
            <div className="row row-cols-2 row-cols-md-3 g-2 mb-3">
              {Object.entries(kpis).map(([key, value]) => (
                <div className="col" key={key}>
                  <div className="border rounded p-2 small">
                    <div className="text-muted">{key}</div>
                    <strong>{String(value)}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <p className="lead">{resume}</p>
        </section>
      ) : null}

      {pointsPos.length || pointsAtt.length ? (
        <div className="row g-3 mb-4">
          {pointsPos.length ? (
            <div className="col-md-6">
              <div className="card border-success h-100">
                <div className="card-header bg-success-subtle">Puntos Positivos</div>
                <ul className="list-group list-group-flush">
                  {pointsPos.map((p) => (
                    <li className="list-group-item" key={p}>
                      <i className="fas fa-check-circle text-success me-2" aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          {pointsAtt.length ? (
            <div className="col-md-6">
              <div className="card border-warning h-100">
                <div className="card-header bg-warning-subtle">Puntos de Atención</div>
                <ul className="list-group list-group-flush">
                  {pointsAtt.map((p) => (
                    <li className="list-group-item" key={p}>
                      <i className="fas fa-exclamation-triangle text-warning me-2" aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {recs.length ? (
        <section className="mb-4">
          <h2 className="h5">Recomendaciones</h2>
          <ul>
            {recs.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {type === "analysis" && tendances.length ? (
        <section className="mb-4">
          <h2 className="h5">Tendencias principales</h2>
          <ul>
            {tendances.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {type === "custom" && custom ? (
        <section className="mb-4">
          <h2 className="h5">Análisis personalizado</h2>
          <pre className="bg-light border rounded p-3 small text-wrap" style={{ whiteSpace: "pre-wrap" }}>
            {custom}
          </pre>
        </section>
      ) : null}

      {activite.length ? (
        <section className="mb-4">
          <h2 className="h5">Actividad por usuario</h2>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Total</th>
                  <th>Solucionadas</th>
                  <th>Bitrix</th>
                </tr>
              </thead>
              <tbody>
                {activite.map((row) => (
                  <tr key={String(row.usuario)}>
                    <td>{String(row.usuario ?? "")}</td>
                    <td>{String(row.total ?? 0)}</td>
                    <td>{String(row.solucionadas ?? 0)}</td>
                    <td>{String(row.bitrix ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {evolution.length ? (
        <section className="mb-4">
          <h2 className="h5">Evolución diaria</h2>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Total</th>
                  <th>Solucionadas</th>
                  <th>Bitrix</th>
                </tr>
              </thead>
              <tbody>
                {evolution.map((row) => (
                  <tr key={String(row.label)}>
                    <td>{String(row.label ?? "")}</td>
                    <td>{String(row.count ?? 0)}</td>
                    <td>{String(row.solucionadas ?? 0)}</td>
                    <td>{String(row.bitrix ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {notas.length ? (
        <section className="mb-4">
          <h2 className="h5">Notas del día</h2>
          <ul className="list-unstyled">
            {notas.map((n, idx) => (
              <li key={`${String(n.fecha_iso)}-${idx}`} className="mb-2">
                <strong>{String(n.fecha ?? "")}</strong>
                {n.ciudad || n.agencia ? (
                  <span className="text-muted">
                    {" "}
                    ({[n.ciudad, n.agencia].filter(Boolean).join(" · ")})
                  </span>
                ) : null}
                : {String(n.texto ?? "")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
