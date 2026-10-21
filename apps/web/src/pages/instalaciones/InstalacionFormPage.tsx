import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import type { InstalacionDetail } from "./types";

interface Options {
  tecnicos: { id: number; nom: string }[];
  clients: { id: number; nom: string; telephone: string; ville: string }[];
  materiales: { id: number; nombre: string; modelo: string | null; tipo: string }[];
}

export function InstalacionCreatePage() {
  const [params] = useSearchParams();
  return <InstalacionForm mode="create" preselectedClient={params.get("client")} />;
}

export function InstalacionEditPage() {
  const { id } = useParams();
  return <InstalacionForm mode="edit" instalacionId={Number(id)} />;
}

function InstalacionForm({
  mode,
  instalacionId,
  preselectedClient,
}: {
  mode: "create" | "edit";
  instalacionId?: number;
  preselectedClient?: string | null;
}) {
  const navigate = useNavigate();
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    id_tecnico: 0,
    id_client: preselectedClient ? Number(preselectedClient) : 0,
    observaciones: "",
    lineas: [] as { id_material: number; cantidad: number }[],
  });

  usePageMeta({
    title: mode === "create" ? "Nueva instalación" : `Modificar instalación #${instalacionId}`,
    icon: <i className="fas fa-building" aria-hidden="true" />,
    subtitle: mode === "create" ? "Datos y material opcional" : "Cliente, sitio y tipo no modificables",
    actions: (
      <Link to="/instalaciones" className="btn btn-outline-secondary btn-sm">
        Volver
      </Link>
    ),
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const opts = await api<Options>("/api/instalaciones/options");
        if (cancelled) {
          return;
        }
        setOptions(opts);
        if (mode === "edit" && instalacionId) {
          const payload = await api<{ item: InstalacionDetail }>(`/api/instalaciones/${instalacionId}`);
          if (cancelled) {
            return;
          }
          const item = payload.item;
          setForm({
            fecha: item.fecha,
            id_tecnico: item.tecnico.id,
            id_client: item.client.id,
            observaciones: item.observaciones ?? "",
            lineas: [],
          });
        } else if (opts.tecnicos[0]) {
          setForm((prev) => ({ ...prev, id_tecnico: prev.id_tecnico || opts.tecnicos[0]!.id }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, instalacionId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const body = {
        fecha: form.fecha,
        id_tecnico: form.id_tecnico,
        id_client: form.id_client,
        observaciones: form.observaciones,
        lineas: mode === "create" ? form.lineas.filter((linea) => linea.id_material > 0) : undefined,
      };
      if (mode === "create") {
        const payload = await api<{ item: InstalacionDetail }>("/api/instalaciones", {
          method: "POST",
          body: JSON.stringify(body),
        });
        navigate(`/instalaciones/${payload.item.id}`);
      } else if (instalacionId) {
        await api(`/api/instalaciones/${instalacionId}`, { method: "PUT", body: JSON.stringify(body) });
        navigate(`/instalaciones/${instalacionId}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  if (loading) {
    return <p className="p-3">Cargando…</p>;
  }

  return (
    <div className="container-fluid px-0">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card content-card">
            <div className="card-body">
              {error ? (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              ) : null}
              <form onSubmit={(event) => void onSubmit(event)}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="fecha">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      id="fecha"
                      className="form-control"
                      required
                      value={form.fecha}
                      onChange={(event) => setForm({ ...form, fecha: event.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="id_tecnico">
                      Técnico *
                    </label>
                    <select
                      id="id_tecnico"
                      className="form-select"
                      required
                      value={form.id_tecnico || ""}
                      onChange={(event) => setForm({ ...form, id_tecnico: Number(event.target.value) })}
                    >
                      <option value="">Seleccione</option>
                      {(options?.tecnicos ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="id_client">
                      Cliente *
                    </label>
                    <select
                      id="id_client"
                      className="form-select"
                      required
                      disabled={mode === "edit"}
                      value={form.id_client || ""}
                      onChange={(event) => setForm({ ...form, id_client: Number(event.target.value) })}
                    >
                      <option value="">Seleccione</option>
                      {(options?.clients ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom} — {c.telephone}
                        </option>
                      ))}
                    </select>
                  </div>
                  {mode === "create" ? (
                    <div className="col-12">
                      <label className="form-label">Materiales (opcional)</label>
                      {form.lineas.map((linea, index) => (
                        <div key={index} className="row g-2 mb-2">
                          <div className="col-8">
                            <select
                              className="form-select"
                              value={linea.id_material || ""}
                              onChange={(event) => {
                                const lineas = [...form.lineas];
                                lineas[index] = { ...linea, id_material: Number(event.target.value) };
                                setForm({ ...form, lineas });
                              }}
                            >
                              <option value="">Material</option>
                              {(options?.materiales ?? []).map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.nombre}
                                  {m.modelo ? ` (${m.modelo})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-3">
                            <input
                              type="number"
                              min={1}
                              className="form-control"
                              value={linea.cantidad}
                              onChange={(event) => {
                                const lineas = [...form.lineas];
                                lineas[index] = { ...linea, cantidad: Number(event.target.value) };
                                setForm({ ...form, lineas });
                              }}
                            />
                          </div>
                          <div className="col-1">
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() =>
                                setForm({ ...form, lineas: form.lineas.filter((_, i) => i !== index) })
                              }
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() =>
                          setForm({ ...form, lineas: [...form.lineas, { id_material: 0, cantidad: 1 }] })
                        }
                      >
                        Añadir material
                      </button>
                      <div className="form-text">Si añade líneas, se crea la primera salida de instalación.</div>
                    </div>
                  ) : null}
                  <div className="col-12">
                    <label className="form-label" htmlFor="observaciones">
                      Observaciones
                    </label>
                    <textarea
                      id="observaciones"
                      className="form-control"
                      rows={3}
                      value={form.observaciones}
                      onChange={(event) => setForm({ ...form, observaciones: event.target.value })}
                    />
                  </div>
                </div>
                <div className="d-flex justify-content-between mt-4">
                  <Link to="/instalaciones" className="btn btn-secondary">
                    Volver
                  </Link>
                  <button type="submit" className="btn btn-primary">
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
