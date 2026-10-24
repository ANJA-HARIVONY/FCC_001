import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { SearchAutocomplete } from "../../components/SearchAutocomplete";
import { usePageMeta } from "../../layout/Shell";
import { ESTADO_BADGE, TIPO_BADGE, type InstalacionDetail } from "./types";

interface TecnicoOption {
  id: number;
  nom: string;
  telephone: string;
  agencia: string;
  ciudad: string;
}

interface ClientOption {
  id: number;
  nom: string;
  telephone: string;
  ville: string;
  adresse: string;
  categoria: string;
}

interface MaterialOption {
  id: number;
  nombre: string;
  modelo: string | null;
  tipo: string;
}

interface Options {
  tecnicos: TecnicoOption[];
  clients: ClientOption[];
  materiales: MaterialOption[];
}

interface LineaForm {
  key: number;
  id_material: number;
  cantidad: number;
}

interface FormState {
  fecha: string;
  id_tecnico: number;
  tecnicoQuery: string;
  tecnicoInfo: string;
  id_client: number;
  clientQuery: string;
  clientInfo: string;
  clientNom: string;
  observaciones: string;
  lineas: LineaForm[];
}

interface EditSummary {
  tipo: string;
  tipo_label: string;
  estado: string;
  estado_label: string;
}

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function positiveId(raw: string | null): number | null {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function emptyLine(key: number): LineaForm {
  return { key, id_material: 0, cantidad: 1 };
}

function emptyForm(): FormState {
  return {
    fecha: todayIso(),
    id_tecnico: 0,
    tecnicoQuery: "",
    tecnicoInfo: "",
    id_client: 0,
    clientQuery: "",
    clientInfo: "",
    clientNom: "",
    observaciones: "",
    lineas: [emptyLine(1)],
  };
}

export function InstalacionCreatePage() {
  const [params] = useSearchParams();
  return <InstalacionForm mode="create" preselectedClient={params.get("client")} />;
}

export function InstalacionEditPage() {
  const { id } = useParams();
  return <InstalacionForm mode="edit" instalacionId={positiveId(id ?? null) ?? undefined} />;
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
  const lineSeq = useRef(1);
  const [options, setOptions] = useState<Options | null>(null);
  const [summary, setSummary] = useState<EditSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const title = mode === "create" ? "Nueva instalación" : `Modificar instalación #${instalacionId ?? ""}`;
  const volverUrl = mode === "edit" && instalacionId ? `/instalaciones/${instalacionId}` : "/instalaciones";

  usePageMeta({
    title,
    icon: <i className="fas fa-building" aria-hidden="true" />,
    subtitle: "Datos de la instalación",
    actions: (
      <Link to={volverUrl} className="btn btn-outline-secondary btn-sm">
        <i className="fas fa-arrow-left me-1" aria-hidden="true" />
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
        if (mode === "edit") {
          if (!instalacionId) {
            setError("Instalación no encontrada.");
            return;
          }
          const payload = await api<{ item: InstalacionDetail }>(`/api/instalaciones/${instalacionId}`);
          if (cancelled) {
            return;
          }
          const item = payload.item;
          const tecnico = opts.tecnicos.find((row) => row.id === item.tecnico.id);
          setSummary({
            tipo: item.tipo,
            tipo_label: item.tipo_label,
            estado: item.estado,
            estado_label: item.estado_label,
          });
          setForm({
            ...emptyForm(),
            fecha: item.fecha,
            id_tecnico: item.tecnico.id,
            tecnicoQuery: item.tecnico.nom,
            tecnicoInfo: tecnico ? `${tecnico.nom} — ${tecnico.telephone}` : item.tecnico.nom,
            id_client: item.client.id,
            clientNom: item.client.nom,
            observaciones: item.observaciones ?? "",
          });
          return;
        }
        const presetId = positiveId(preselectedClient ?? null);
        const preset = presetId ? opts.clients.find((row) => row.id === presetId) : undefined;
        setForm({
          ...emptyForm(),
          id_client: preset?.id ?? 0,
          clientQuery: preset?.nom ?? "",
          clientInfo: preset?.nom ?? "",
          clientNom: preset?.nom ?? "",
        });
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
  }, [mode, instalacionId, preselectedClient]);

  function addLinea() {
    lineSeq.current += 1;
    const key = lineSeq.current;
    setForm((prev) => ({ ...prev, lineas: [...prev.lineas, emptyLine(key)] }));
  }

  function updateLinea(key: number, patch: Partial<Pick<LineaForm, "id_material" | "cantidad">>) {
    setForm((prev) => ({
      ...prev,
      lineas: prev.lineas.map((linea) => (linea.key === key ? { ...linea, ...patch } : linea)),
    }));
  }

  function removeLinea(key: number) {
    if (form.lineas.length <= 1) {
      setError("Debe haber al menos una línea.");
      return;
    }
    setError(null);
    setForm((prev) => ({ ...prev, lineas: prev.lineas.filter((linea) => linea.key !== key) }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.id_tecnico) {
      setError("Seleccione un técnico.");
      return;
    }
    if (mode === "create" && !form.id_client) {
      setError("Seleccione un cliente.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const payload = await api<{ item: InstalacionDetail }>("/api/instalaciones", {
          method: "POST",
          body: JSON.stringify({
            fecha: form.fecha,
            id_tecnico: form.id_tecnico,
            id_client: form.id_client,
            observaciones: form.observaciones,
            lineas: form.lineas
              .filter((linea) => linea.id_material > 0)
              .map((linea) => ({ id_material: linea.id_material, cantidad: linea.cantidad })),
          }),
        });
        navigate(`/instalaciones/${payload.item.id}`);
      } else if (instalacionId) {
        await api(`/api/instalaciones/${instalacionId}`, {
          method: "PUT",
          body: JSON.stringify({
            fecha: form.fecha,
            id_tecnico: form.id_tecnico,
            observaciones: form.observaciones,
          }),
        });
        navigate(`/instalaciones/${instalacionId}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
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
            {title}
          </li>
        </ol>
      </nav>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 content-card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-building me-2" aria-hidden="true" />
                {title}
              </h5>
            </div>
            <div className="card-body">
              {error ? (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              ) : null}
              <form onSubmit={(event) => void onSubmit(event)}>
                {summary ? (
                  <div className="alert alert-light border mb-4 py-2">
                    <strong>Tipo:</strong>{" "}
                    <span className={`badge ${TIPO_BADGE[summary.tipo] ?? "bg-secondary"}`}>{summary.tipo_label}</span>
                    <strong className="ms-3">Estado:</strong>{" "}
                    <span className={`badge ${ESTADO_BADGE[summary.estado] ?? "bg-secondary"}`}>
                      {summary.estado_label}
                    </span>
                  </div>
                ) : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="fecha">
                      Fecha <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      id="fecha"
                      className="form-control"
                      required
                      value={form.fecha}
                      onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="tecnico_search">
                      Técnico <span className="text-danger">*</span>
                    </label>
                    <SearchAutocomplete
                      inputId="tecnico_search"
                      placeholder="Buscar técnico por nombre o teléfono..."
                      initialQuery={form.tecnicoQuery}
                      initialSelected={form.tecnicoInfo}
                      items={options?.tecnicos ?? []}
                      fields={["nom", "telephone", "agencia", "ciudad"]}
                      boxClass="alert-info"
                      icon="fa-user-cog"
                      selectedLabel="Técnico:"
                      formatSelected={(item) => `${item.nom} — ${item.telephone}`}
                      renderItem={(item) => (
                        <>
                          <strong>{item.nom}</strong>
                          <br />
                          <small className="text-muted">
                            <i className="fas fa-phone me-1" aria-hidden="true" />
                            {item.telephone} — {item.agencia}
                          </small>
                        </>
                      )}
                      onPick={(item) => setForm((prev) => ({ ...prev, id_tecnico: item.id }))}
                      onReset={() => setForm((prev) => ({ ...prev, id_tecnico: 0 }))}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="client_search">
                      Cliente <span className="text-danger">*</span>
                    </label>
                    {mode === "edit" ? (
                      <p className="form-control-plaintext mb-0">
                        <Link to={`/clientes/${form.id_client}`}>{form.clientNom}</Link>
                        <span className="text-muted small ms-2">(no modificable)</span>
                      </p>
                    ) : (
                      <>
                        <SearchAutocomplete
                          inputId="client_search"
                          placeholder="Buscar cliente por nombre, teléfono o ciudad..."
                          initialQuery={form.clientQuery}
                          initialSelected={form.clientInfo}
                          items={options?.clients ?? []}
                          fields={["nom", "telephone", "ville", "adresse"]}
                          boxClass="alert-secondary"
                          icon="fa-user"
                          selectedLabel="Cliente:"
                          formatSelected={(item) => item.nom}
                          renderItem={(item) => (
                            <>
                              <strong>{item.nom}</strong>
                              <span
                                className={`badge ms-1 ${item.categoria === "corporativo" ? "bg-primary" : "bg-secondary"}`}
                              >
                                {item.categoria === "corporativo" ? "Corporativo" : "Particular"}
                              </span>
                              <br />
                              <small className="text-muted">
                                {item.telephone} — {item.ville}
                              </small>
                            </>
                          )}
                          onPick={(item) => setForm((prev) => ({ ...prev, id_client: item.id }))}
                          onReset={() => setForm((prev) => ({ ...prev, id_client: 0 }))}
                        />
                        <div className="form-text">
                          La instalación se asocia a la dirección actual del cliente. Para un cambio de dirección use
                          «Traslado» en la ficha del cliente.
                        </div>
                      </>
                    )}
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="observaciones">
                      Observaciones <span className="text-muted">(opcional)</span>
                    </label>
                    <textarea
                      id="observaciones"
                      className="form-control"
                      rows={3}
                      value={form.observaciones}
                      onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                    />
                  </div>
                </div>
                {mode === "create" ? (
                  <>
                    <h6 className="mt-4 mb-2">
                      <i className="fas fa-boxes me-2" aria-hidden="true" />
                      Material entregado <span className="text-muted small">(opcional)</span>
                    </h6>
                    <div className="table-responsive mb-2">
                      <table className="table table-bordered align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "60%" }}>Material</th>
                            <th style={{ width: "25%" }}>Cantidad</th>
                            <th style={{ width: "15%" }} className="text-end">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.lineas.map((linea) => (
                            <tr key={linea.key}>
                              <td>
                                <select
                                  className="form-select"
                                  aria-label="Material"
                                  value={linea.id_material || ""}
                                  onChange={(event) =>
                                    updateLinea(linea.key, { id_material: Number(event.target.value) })
                                  }
                                >
                                  <option value="">— Seleccionar —</option>
                                  {(options?.materiales ?? []).map((material) => (
                                    <option key={material.id} value={material.id}>
                                      {material.nombre}
                                      {material.modelo ? ` (${material.modelo})` : ""}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  min={1}
                                  aria-label="Cantidad"
                                  value={linea.cantidad}
                                  onChange={(event) =>
                                    updateLinea(linea.key, { cantidad: Number(event.target.value) })
                                  }
                                />
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  aria-label="Quitar"
                                  onClick={() => removeLinea(linea.key)}
                                >
                                  <i className="fas fa-trash" aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={addLinea}>
                      <i className="fas fa-plus me-1" aria-hidden="true" />
                      Añadir línea
                    </button>
                    <p className="text-muted small mt-3 mb-0">
                      <i className="fas fa-info-circle me-1" aria-hidden="true" />
                      La instalación se crea «En curso». Las líneas sin material se ignoran; podrá añadir más material
                      desde la ficha de la instalación.
                    </p>
                  </>
                ) : null}
                <div className="d-flex justify-content-between mt-4">
                  <Link to={volverUrl} className="btn btn-secondary">
                    Cancelar
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="fas fa-save me-1" aria-hidden="true" />
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
