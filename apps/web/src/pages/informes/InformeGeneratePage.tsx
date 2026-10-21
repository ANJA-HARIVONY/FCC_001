import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import type { InformeDetail, InformeType } from "./types";

interface MetaResponse {
  types: InformeType[];
  periodes: { id: string; nom: string }[];
  agencies: { id: number; nombre: string; id_ciudad: number }[];
  is_superadmin: boolean;
  default_agence_id: number;
}

export function InformeGeneratePage() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [typeEtat, setTypeEtat] = useState("summary");
  const [periode, setPeriode] = useState("current_month");
  const [agenceId, setAgenceId] = useState("");
  const [titre, setTitre] = useState("");
  const [prompt, setPrompt] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const payload = await api<MetaResponse>("/api/informes/meta");
        setMeta(payload);
        if (!payload.is_superadmin) {
          setAgenceId(String(payload.default_agence_id));
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Error");
      }
    })();
  }, []);

  const actions = useMemo(
    () => (
      <Link to="/informes" className="btn btn-outline-secondary btn-sm">
        <i className="fas fa-arrow-left me-1" aria-hidden="true" />
        Volver
      </Link>
    ),
    [],
  );

  usePageMeta({
    title: "Generar un Informe",
    icon: <i className="fas fa-file-alt" aria-hidden="true" />,
    subtitle: "Cree análisis personalizados",
    actions,
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = await api<{ item: InformeDetail }>("/api/informes", {
        method: "POST",
        body: JSON.stringify({
          type_etat: typeEtat,
          periode,
          titre: titre.trim() || undefined,
          prompt_personnalise: typeEtat === "custom" ? prompt : undefined,
          agence_id: agenceId || null,
          date_debut: periode === "custom" ? dateDebut : undefined,
          date_fin: periode === "custom" ? dateFin : undefined,
        }),
      });
      navigate(`/informes/${payload.item.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid px-0 etats-page">
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {!meta ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="row">
            <div className="col-lg-8">
              <div className="card mb-4 etats-section-card">
                <div className="card-header">
                  <h5 className="mb-0 fw-semibold">
                    <i className="fas fa-cogs me-2" aria-hidden="true" />
                    Tipo de Análisis
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {meta.types.map((type) => (
                      <div className="col-md-6" key={type.id}>
                        <div className="form-check border rounded p-3 h-100">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="type_etat"
                            id={`type_${type.id}`}
                            value={type.id}
                            checked={typeEtat === type.id}
                            onChange={() => setTypeEtat(type.id)}
                          />
                          <label className="form-check-label ms-2" htmlFor={`type_${type.id}`}>
                            <strong className="d-block">
                              <i className={`fas ${type.icon} me-1`} aria-hidden="true" />
                              {type.nom}
                            </strong>
                            <span className="small text-muted">{type.description}</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card mb-4 etats-section-card">
                <div className="card-header">
                  <h5 className="mb-0 fw-semibold">
                    <i className="fas fa-calendar-alt me-2" aria-hidden="true" />
                    Período de Análisis
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="periode" className="form-label">
                        Período predefinido
                      </label>
                      <select
                        className="form-select"
                        id="periode"
                        value={periode}
                        onChange={(e) => setPeriode(e.target.value)}
                      >
                        {meta.periodes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="agence_id" className="form-label">
                        Agencia
                      </label>
                      <select
                        className="form-select"
                        id="agence_id"
                        value={agenceId}
                        disabled={!meta.is_superadmin}
                        onChange={(e) => setAgenceId(e.target.value)}
                      >
                        {meta.is_superadmin ? <option value="">Todas las agencias</option> : null}
                        {meta.agencies.map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    {periode === "custom" ? (
                      <>
                        <div className="col-md-6 mb-3">
                          <label htmlFor="date_debut" className="form-label">
                            Fecha inicio
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            id="date_debut"
                            value={dateDebut}
                            onChange={(e) => setDateDebut(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label htmlFor="date_fin" className="form-label">
                            Fecha fin
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            id="date_fin"
                            value={dateFin}
                            onChange={(e) => setDateFin(e.target.value)}
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {typeEtat === "custom" ? (
                <div className="card mb-4 etats-section-card">
                  <div className="card-header">
                    <h5 className="mb-0 fw-semibold">Pregunta personalizada</h5>
                  </div>
                  <div className="card-body">
                    <textarea
                      className="form-control"
                      rows={4}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describa el análisis que necesita…"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="col-lg-4">
              <div className="card etats-section-card">
                <div className="card-header">
                  <h5 className="mb-0 fw-semibold">Opciones</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label htmlFor="titre" className="form-label">
                      Título (opcional)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="titre"
                      value={titre}
                      onChange={(e) => setTitre(e.target.value)}
                      placeholder="Se generará automáticamente"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                        Generando…
                      </>
                    ) : (
                      <>
                        <i className="fas fa-magic me-1" aria-hidden="true" />
                        Generar Informe
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
