import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SALIDA_TYPES } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import { SALIDA_TIPO_BADGE, type MaterialItem, type SalidaDetail } from "./types";

const SALIDA_TIPO_LABELS: Record<string, string> = {
  uso_interno: "Uso interno",
  incidencia: "Incidencia",
  instalacion: "Instalación",
};

const VALID_TIPOS = new Set<string>(SALIDA_TYPES);

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

interface FormOptions {
  tecnicos: TecnicoOption[];
  materiales: MaterialItem[];
  clients: ClientOption[];
}

interface InstalacionLock {
  id: number;
  tecnico: { id: number; nom: string };
  client: { id: number; nom: string };
}

interface LineaForm {
  id_material: number;
  cantidad: number;
}

interface FormState {
  fecha: string;
  id_tecnico: number;
  tecnicoQuery: string;
  tecnicoInfo: string;
  tipo_salida: string;
  id_client: number;
  clientQuery: string;
  clientInfo: string;
  clientLocked: boolean;
  lockedClientNom: string;
  observaciones: string;
  lineas: LineaForm[];
  id_instalacion: number | null;
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

function searchItems<T extends object>(items: T[], query: string, fields: (keyof T)[]): T[] {
  if (!query || query.length < 2) {
    return [];
  }
  const term = query.toLowerCase();
  return items
    .filter((item) => fields.some((field) => String(item[field] ?? "").toLowerCase().includes(term)))
    .slice(0, 10);
}

function materialChoices(base: MaterialItem[], lineas: SalidaDetail["lineas"]): MaterialItem[] {
  const seen = new Set(base.map((item) => item.id));
  const merged = [...base];
  for (const linea of lineas) {
    const material = linea.material;
    if (!material || seen.has(material.id)) {
      continue;
    }
    seen.add(material.id);
    merged.push({
      id: material.id,
      nombre: material.nombre,
      modelo: material.modelo,
      tipo: material.tipo,
      tipo_label: material.tipo,
      activo: false,
      descripcion: null,
      foto: null,
    });
  }
  return merged;
}

function emptyForm(tipo: string): FormState {
  return {
    fecha: todayIso(),
    id_tecnico: 0,
    tecnicoQuery: "",
    tecnicoInfo: "",
    tipo_salida: tipo,
    id_client: 0,
    clientQuery: "",
    clientInfo: "",
    clientLocked: false,
    lockedClientNom: "",
    observaciones: "",
    lineas: [{ id_material: 0, cantidad: 1 }],
    id_instalacion: null,
  };
}

export function SalidaCreatePage() {
  const [params] = useSearchParams();
  const tipo = params.get("tipo") || "";
  return <SalidaForm mode="create" initialTipo={tipo} instalacionId={positiveId(params.get("instalacion"))} />;
}

export function SalidaEditPage() {
  const { id } = useParams();
  return <SalidaForm mode="edit" salidaId={Number(id)} />;
}

function SalidaForm({
  mode,
  salidaId,
  initialTipo = "",
  instalacionId = null,
}: {
  mode: "create" | "edit";
  salidaId?: number;
  initialTipo?: string;
  instalacionId?: number | null;
}) {
  const navigate = useNavigate();
  const blocked =
    mode === "create" &&
    (!VALID_TIPOS.has(initialTipo) || (initialTipo === "instalacion" && !instalacionId));
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [materiales, setMateriales] = useState<MaterialItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!blocked);
  const [form, setForm] = useState<FormState>(() => emptyForm(initialTipo));

  const linkedId = form.id_instalacion;
  const volverUrl = linkedId ? `/instalaciones/${linkedId}` : "/materiales/salidas";
  const title =
    mode === "edit"
      ? `Modificar salida #${salidaId ?? ""}`
      : linkedId
        ? `Añadir material a la instalación #${linkedId}`
        : "Nueva salida de material";

  usePageMeta({
    title,
    icon: <i className="fas fa-dolly" aria-hidden="true" />,
    subtitle: "Formulario de salida de material",
    actions: (
      <Link to={volverUrl} className="btn btn-outline-secondary btn-sm">
        <i className="fas fa-arrow-left me-1" aria-hidden="true" />
        Volver
      </Link>
    ),
  });

  useEffect(() => {
    if (mode !== "create") {
      return;
    }
    if (!VALID_TIPOS.has(initialTipo)) {
      navigate("/materiales/salidas", { replace: true });
      return;
    }
    if (initialTipo === "instalacion" && !instalacionId) {
      navigate("/instalaciones/nueva", { replace: true });
    }
  }, [mode, initialTipo, instalacionId, navigate]);

  useEffect(() => {
    if (blocked) {
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const opts = await api<FormOptions>("/api/materiales/salidas/options");
        if (cancelled) {
          return;
        }
        setOptions(opts);
        setMateriales(opts.materiales);
        if (mode === "edit" && salidaId) {
          const payload = await api<{ item: SalidaDetail }>(`/api/materiales/salidas/${salidaId}`);
          if (cancelled) {
            return;
          }
          const item = payload.item;
          const tecnico = opts.tecnicos.find((row) => row.id === item.tecnico.id);
          const locked = item.id_instalacion != null;
          setMateriales(materialChoices(opts.materiales, item.lineas));
          setForm({
            fecha: item.fecha,
            id_tecnico: item.tecnico.id,
            tecnicoQuery: item.tecnico.nom,
            tecnicoInfo: tecnico ? `${tecnico.nom} — ${tecnico.telephone}` : item.tecnico.nom,
            tipo_salida: item.tipo_salida,
            id_client: item.client?.id ?? 0,
            clientQuery: item.client?.nom ?? "",
            clientInfo: item.client?.nom ?? "",
            clientLocked: locked,
            lockedClientNom: locked ? (item.client?.nom ?? "") : "",
            observaciones: item.observaciones ?? "",
            lineas: item.lineas.length
              ? item.lineas.map((linea) => ({ id_material: linea.id_material, cantidad: linea.cantidad }))
              : [{ id_material: 0, cantidad: 1 }],
            id_instalacion: item.id_instalacion,
          });
        } else if (mode === "create" && initialTipo === "instalacion" && instalacionId) {
          const payload = await api<{ item: InstalacionLock }>(`/api/instalaciones/${instalacionId}`);
          if (cancelled) {
            return;
          }
          const item = payload.item;
          const tecnico = opts.tecnicos.find((row) => row.id === item.tecnico.id);
          setForm({
            ...emptyForm("instalacion"),
            id_tecnico: item.tecnico.id,
            tecnicoQuery: item.tecnico.nom,
            tecnicoInfo: tecnico ? `${tecnico.nom} — ${tecnico.telephone}` : item.tecnico.nom,
            id_client: item.client.id,
            clientQuery: item.client.nom,
            clientInfo: item.client.nom,
            clientLocked: true,
            lockedClientNom: item.client.nom,
            id_instalacion: item.id,
          });
        } else {
          setForm(emptyForm(initialTipo));
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
  }, [blocked, mode, salidaId, initialTipo, instalacionId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.id_tecnico) {
      window.alert("Seleccione un técnico.");
      return;
    }
    if (form.tipo_salida !== "uso_interno" && !form.id_client) {
      window.alert("Seleccione un cliente.");
      return;
    }
    setError(null);
    try {
      const body = {
        fecha: form.fecha,
        id_tecnico: form.id_tecnico,
        tipo_salida: form.tipo_salida,
        id_client: form.tipo_salida === "uso_interno" ? null : form.id_client,
        id_instalacion: form.id_instalacion,
        observaciones: form.observaciones,
        lineas: form.lineas.filter((linea) => linea.id_material > 0),
      };
      if (mode === "create") {
        const payload = await api<{ item: SalidaDetail }>("/api/materiales/salidas", {
          method: "POST",
          body: JSON.stringify(body),
        });
        navigate(form.id_instalacion ? `/instalaciones/${form.id_instalacion}` : `/materiales/salidas/${payload.item.id}`);
      } else if (salidaId) {
        await api(`/api/materiales/salidas/${salidaId}`, { method: "PUT", body: JSON.stringify(body) });
        navigate(`/materiales/salidas/${salidaId}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  function updateLinea(index: number, patch: Partial<LineaForm>) {
    setForm((prev) => ({
      ...prev,
      lineas: prev.lineas.map((linea, i) => (i === index ? { ...linea, ...patch } : linea)),
    }));
  }

  function removeLinea(index: number) {
    if (form.lineas.length <= 1) {
      window.alert("Debe haber al menos una línea.");
      return;
    }
    setForm((prev) => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== index) }));
  }

  if (blocked || loading) {
    return blocked ? null : <p className="p-3">Cargando…</p>;
  }

  const tipoLabel = SALIDA_TIPO_LABELS[form.tipo_salida] ?? form.tipo_salida;
  const showClient = form.tipo_salida !== "uso_interno";

  return (
    <div className="container-fluid px-0">
      <nav aria-label="breadcrumb" className="app-breadcrumb page-title-breadcrumb mb-3">
        <ol className="breadcrumb mb-0">
          {linkedId ? (
            <>
              <li className="breadcrumb-item">
                <Link to="/instalaciones">Instalaciones</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={volverUrl}>#{linkedId}</Link>
              </li>
            </>
          ) : (
            <>
              <li className="breadcrumb-item">
                <Link to="/materiales">Materiales</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/materiales/salidas">Salidas</Link>
              </li>
            </>
          )}
          <li className="breadcrumb-item active" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>
      <div className="card content-card">
        <div className="card-body">
          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : null}
          <form onSubmit={(event) => void onSubmit(event)}>
            <div className="alert alert-light border mb-4 py-2">
              <strong>Tipo de salida:</strong>
              <span className={`badge ${SALIDA_TIPO_BADGE[form.tipo_salida] ?? "bg-secondary"} ms-1`}>{tipoLabel}</span>
              {mode === "edit" ? <span className="text-muted small ms-2">(no modificable)</span> : null}
              {linkedId ? (
                <span className="ms-2">
                  Instalación <Link to={volverUrl}>#{linkedId}</Link>
                </span>
              ) : null}
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
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
              <div className="col-md-4">
                <label className="form-label" htmlFor="tecnico_search">
                  Técnico <span className="text-danger">*</span>
                </label>
                <Autocomplete
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
              <div className="col-md-4" style={{ display: showClient ? undefined : "none" }}>
                <label className="form-label" htmlFor="client_search">
                  Cliente {showClient ? <span className="text-danger">*</span> : null}
                </label>
                {form.clientLocked ? (
                  <p className="form-control-plaintext mb-0">
                    {form.lockedClientNom}
                    <span className="text-muted small ms-1">(no modificable)</span>
                  </p>
                ) : (
                  <Autocomplete
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
                        <span className={`badge ms-1 ${item.categoria === "corporativo" ? "bg-primary" : "bg-secondary"}`}>
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
                  placeholder="Notas adicionales sobre la salida..."
                  value={form.observaciones}
                  onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                />
              </div>
            </div>

            <h5 className="mb-3">
              <i className="fas fa-boxes me-2" aria-hidden="true" />
              Líneas de material
            </h5>
            <div className="table-responsive mb-3">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "55%" }}>Material</th>
                    <th style={{ width: "20%" }}>Cantidad</th>
                    <th style={{ width: "25%" }} className="text-end">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {form.lineas.map((linea, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          className="form-select"
                          required
                          value={linea.id_material || ""}
                          onChange={(event) => updateLinea(index, { id_material: Number(event.target.value) })}
                        >
                          <option value="">— Seleccionar —</option>
                          {materiales.map((material) => (
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
                          required
                          value={linea.cantidad}
                          onChange={(event) => updateLinea(index, { cantidad: Number(event.target.value) })}
                        />
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeLinea(index)}
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm mb-4"
              onClick={() => setForm((prev) => ({ ...prev, lineas: [...prev.lineas, { id_material: 0, cantidad: 1 }] }))}
            >
              <i className="fas fa-plus me-1" aria-hidden="true" />
              Añadir línea
            </button>

            <div className="d-flex justify-content-between">
              <Link to={volverUrl} className="btn btn-secondary">
                <i className="fas fa-arrow-left me-1" aria-hidden="true" />
                Volver
              </Link>
              <button type="submit" className="btn btn-primary">
                <i className="fas fa-save me-1" aria-hidden="true" />
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Autocomplete<T extends { id: number; nom: string }>({
  inputId,
  placeholder,
  initialQuery,
  initialSelected,
  items,
  fields,
  boxClass,
  icon,
  selectedLabel,
  formatSelected,
  renderItem,
  onPick,
  onReset,
}: {
  inputId: string;
  placeholder: string;
  initialQuery: string;
  initialSelected: string;
  items: T[];
  fields: (keyof T)[];
  boxClass: string;
  icon: string;
  selectedLabel: string;
  formatSelected: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onPick: (item: T) => void;
  onReset: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(initialSelected);
  const [open, setOpen] = useState(false);
  const results = open ? searchItems(items, query, fields) : [];

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <>
      <div className="position-relative" ref={wrapRef}>
        <input
          type="text"
          id={inputId}
          className="form-control"
          placeholder={placeholder}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected("");
            onReset();
            setOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) {
              setOpen(true);
            }
          }}
        />
        {open ? (
          <div
            className="dropdown-menu w-100 show"
            style={{ display: "block", maxHeight: 300, overflowY: "auto" }}
          >
            {query.length >= 2 && results.length > 0 ? (
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="dropdown-item text-start"
                  onClick={() => {
                    setQuery(item.nom);
                    setSelected(formatSelected(item));
                    setOpen(false);
                    onPick(item);
                  }}
                >
                  {renderItem(item)}
                </button>
              ))
            ) : (
              <div className="dropdown-item-text text-muted">No se encontraron resultados</div>
            )}
          </div>
        ) : null}
      </div>
      {selected ? (
        <div className="mt-2">
          <div className={`alert ${boxClass} py-2 mb-0`}>
            <i className={`fas ${icon} me-2`} aria-hidden="true" />
            <strong>{selectedLabel}</strong> {selected}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary ms-2"
              onClick={() => {
                setQuery("");
                setSelected("");
                onReset();
              }}
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
