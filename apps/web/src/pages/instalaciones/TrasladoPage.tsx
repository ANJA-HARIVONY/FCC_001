import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import type { InstalacionDetail } from "./types";

interface Options {
  tecnicos: { id: number; nom: string }[];
  materiales: { id: number; nombre: string; modelo: string | null }[];
  traslado_acciones: { value: string; label: string }[];
}

export function TrasladoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    id_tecnico: 0,
    adresse: "",
    ville: "",
    latitud: "",
    longitud: "",
    observaciones: "",
    lineas: [] as { id_material: number; cantidad: number; accion: string }[],
  });

  usePageMeta({
    title: "Traslado de domicilio",
    icon: <i className="fas fa-truck" aria-hidden="true" />,
    subtitle: "Cierra el sitio activo y crea una instalación tipo traslado",
    actions: (
      <Link to={`/clientes/${id}`} className="btn btn-outline-secondary btn-sm">
        Volver
      </Link>
    ),
  });

  useEffect(() => {
    let cancelled = false;
    api<Options>("/api/instalaciones/options")
      .then((payload) => {
        if (!cancelled) {
          setOptions(payload);
          if (payload.tecnicos[0]) {
            setForm((prev) => ({ ...prev, id_tecnico: payload.tecnicos[0]!.id }));
          }
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = await api<{ item: InstalacionDetail }>(`/api/instalaciones/clientes/${id}/traslado`, {
        method: "POST",
        body: JSON.stringify({
          fecha: form.fecha,
          id_tecnico: form.id_tecnico,
          adresse: form.adresse,
          ville: form.ville,
          latitud: form.latitud ? Number(form.latitud) : null,
          longitud: form.longitud ? Number(form.longitud) : null,
          observaciones: form.observaciones,
          lineas: form.lineas.filter((linea) => linea.id_material > 0),
        }),
      });
      navigate(`/instalaciones/${payload.item.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
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
                  <div className="col-md-8">
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
                  <div className="col-md-8">
                    <label className="form-label" htmlFor="adresse">
                      Nueva dirección *
                    </label>
                    <input
                      id="adresse"
                      className="form-control"
                      required
                      value={form.adresse}
                      onChange={(event) => setForm({ ...form, adresse: event.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="ville">
                      Barrio *
                    </label>
                    <input
                      id="ville"
                      className="form-control"
                      required
                      value={form.ville}
                      onChange={(event) => setForm({ ...form, ville: event.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="latitud">
                      Latitud
                    </label>
                    <input
                      id="latitud"
                      className="form-control"
                      value={form.latitud}
                      onChange={(event) => setForm({ ...form, latitud: event.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="longitud">
                      Longitud
                    </label>
                    <input
                      id="longitud"
                      className="form-control"
                      value={form.longitud}
                      onChange={(event) => setForm({ ...form, longitud: event.target.value })}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Materiales (reutilizado / retirado)</label>
                    {form.lineas.map((linea, index) => (
                      <div key={index} className="row g-2 mb-2">
                        <div className="col-5">
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
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-2">
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
                        <div className="col-4">
                          <select
                            className="form-select"
                            value={linea.accion}
                            onChange={(event) => {
                              const lineas = [...form.lineas];
                              lineas[index] = { ...linea, accion: event.target.value };
                              setForm({ ...form, lineas });
                            }}
                          >
                            {(options?.traslado_acciones ?? [
                              { value: "reutilizado", label: "Reutilizado" },
                              { value: "retirado", label: "Retirado" },
                            ]).map((accion) => (
                              <option key={accion.value} value={accion.value}>
                                {accion.label}
                              </option>
                            ))}
                          </select>
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
                        setForm({
                          ...form,
                          lineas: [...form.lineas, { id_material: 0, cantidad: 1, accion: "reutilizado" }],
                        })
                      }
                    >
                      Añadir línea
                    </button>
                  </div>
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
                  <Link to={`/clientes/${id}`} className="btn btn-secondary">
                    Volver
                  </Link>
                  <button type="submit" className="btn btn-primary">
                    Registrar traslado
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
