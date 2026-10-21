import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import { materialFotoSrc, type MaterialItem } from "./types";

interface CatalogoResponse {
  items: MaterialItem[];
  filters: { tipo: string; sort: string; order: string };
  meta: { tipos: { value: string; label: string }[] };
}

const FALLBACK_TIPOS = [
  { value: "outillage", label: "Herramientas" },
  { value: "material_cliente", label: "Materiales de cliente" },
];

const EMPTY_FORM = { nombre: "", tipo: "outillage", modelo: "", descripcion: "", activo: true };

export function CatalogoPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<CatalogoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [foto, setFoto] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  usePageMeta({
    title: "Catálogo de materiales",
    icon: <i className="fas fa-list" aria-hidden="true" />,
    subtitle: "Catálogo de materiales",
    actions: (
      <Link to="/materiales" className="btn btn-secondary btn-sm">
        <i className="fas fa-arrow-left me-1" aria-hidden="true" />
        Volver
      </Link>
    ),
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const payload = await api<CatalogoResponse>(`/api/materiales/catalogo?${params.toString()}`);
      setData(payload);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  const tipos = data?.meta.tipos?.length ? data.meta.tipos : FALLBACK_TIPOS;
  const sortBy = params.get("sort") ?? "";
  const sortOrder = params.get("order") === "desc" ? "desc" : "asc";
  const tipoFilter = params.get("tipo") ?? "";

  function setTipo(value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set("tipo", value);
    } else {
      next.delete("tipo");
    }
    setParams(next);
  }

  function toggleSort(column: "nombre" | "modelo") {
    const next = new URLSearchParams(params);
    next.set("sort", column);
    next.set("order", sortBy === column && sortOrder === "asc" ? "desc" : "asc");
    setParams(next);
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/materiales/catalogo", { method: "POST", body: materialFormData(form, foto) });
      setForm(EMPTY_FORM);
      setFoto(null);
      setFormKey((value) => value + 1);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate(event: FormEvent, item: MaterialItem, values: typeof EMPTY_FORM, file: File | null) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/api/materiales/catalogo/${item.id}`, { method: "PUT", body: materialFormData(values, file) });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid px-0">
      <nav aria-label="breadcrumb" className="app-breadcrumb page-title-breadcrumb mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/materiales">Materiales</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Catálogo
          </li>
        </ol>
      </nav>
      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card content-card">
            <div className="card-header">
              <h5 className="mb-0">Nuevo material</h5>
            </div>
            <div className="card-body">
              <form key={formKey} onSubmit={(event) => void onCreate(event)}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="nombre">
                    Nombre <span className="text-danger">*</span>
                  </label>
                  <input
                    id="nombre"
                    className="form-control"
                    required
                    maxLength={120}
                    value={form.nombre}
                    onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="modelo">
                    Modelo
                  </label>
                  <input
                    id="modelo"
                    className="form-control"
                    maxLength={100}
                    placeholder="Referencia o modelo"
                    value={form.modelo}
                    onChange={(event) => setForm({ ...form, modelo: event.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="descripcion">
                    Descripción
                  </label>
                  <textarea
                    id="descripcion"
                    className="form-control"
                    rows={3}
                    maxLength={2000}
                    placeholder="Características, uso…"
                    value={form.descripcion}
                    onChange={(event) => setForm({ ...form, descripcion: event.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="tipo">
                    Tipo <span className="text-danger">*</span>
                  </label>
                  <select
                    id="tipo"
                    className="form-select"
                    required
                    value={form.tipo}
                    onChange={(event) => setForm({ ...form, tipo: event.target.value })}
                  >
                    {tipos.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="foto">
                    Foto
                  </label>
                  <input
                    id="foto"
                    type="file"
                    className="form-control"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setFoto(event.target.files?.[0] ?? null)}
                  />
                  <div className="form-text">JPG, PNG o WEBP — máx. 2 MB</div>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="activo_new"
                    checked={form.activo}
                    onChange={(event) => setForm({ ...form, activo: event.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="activo_new">
                    Activo (visible en salidas)
                  </label>
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                  <i className="fas fa-plus me-1" aria-hidden="true" />
                  Añadir
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card content-card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Lista</h5>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <select className="form-select form-select-sm" value={tipoFilter} onChange={(event) => setTipo(event.target.value)}>
                  <option value="">Todos los tipos</option>
                  {tipos.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
                <div className="d-lg-none btn-group btn-group-sm" role="group" aria-label="Ordenar lista">
                  <SortButton column="nombre" label="Nombre" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                  <SortButton column="modelo" label="Modelo" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {data && data.items.length === 0 ? (
                <div className="text-center py-5 px-3">
                  <i className="fas fa-box-open fa-3x text-muted mb-3" aria-hidden="true" />
                  <h5 className="text-muted">No hay materiales. Añada el primero con el formulario.</h5>
                </div>
              ) : (
                <>
                  <div className="table-responsive d-none d-lg-block">
                    <table className="table table-hover mb-0 align-middle">
                      <thead>
                        <tr>
                          <th className="text-white" style={{ width: 52 }}>
                            Foto
                          </th>
                          <th className="text-white">
                            <SortLink column="nombre" label="Nombre" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                          </th>
                          <th className="text-white">
                            <SortLink column="modelo" label="Modelo" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                          </th>
                          <th className="text-white">Tipo</th>
                          <th className="text-white">Activo</th>
                          <th className="text-white text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.items ?? []).map((item) => (
                          <CatalogRows
                            key={item.id}
                            item={item}
                            tipos={tipos}
                            open={editId === item.id}
                            saving={saving}
                            onToggle={() => setEditId((current) => (current === item.id ? null : item.id))}
                            onSubmit={onUpdate}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mobile-list d-lg-none">
                    {(data?.items ?? []).map((item) => (
                      <MobileCard
                        key={item.id}
                        item={item}
                        tipos={tipos}
                        open={editId === item.id}
                        saving={saving}
                        onToggle={() => setEditId((current) => (current === item.id ? null : item.id))}
                        onSubmit={onUpdate}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CatalogRows({
  item,
  tipos,
  open,
  saving,
  onToggle,
  onSubmit,
}: {
  item: MaterialItem;
  tipos: { value: string; label: string }[];
  open: boolean;
  saving: boolean;
  onToggle: () => void;
  onSubmit: (event: FormEvent, item: MaterialItem, values: typeof EMPTY_FORM, file: File | null) => Promise<void>;
}) {
  return (
    <>
      <tr className={item.activo ? undefined : "table-secondary"}>
        <td>
          <FotoThumb foto={item.foto} size={40} />
        </td>
        <td>
          <div>{item.nombre}</div>
          {item.descripcion ? (
            <small className="text-muted d-block text-truncate" style={{ maxWidth: 220 }} title={item.descripcion}>
              {item.descripcion}
            </small>
          ) : null}
        </td>
        <td className="small">{item.modelo || "—"}</td>
        <td>
          <span className="badge bg-secondary">{item.tipo_label}</span>
        </td>
        <td>{item.activo ? <span className="text-success">Sí</span> : <span className="text-muted">No</span>}</td>
        <td className="text-end">
          <button type="button" className="btn btn-sm btn-outline-primary" aria-expanded={open} onClick={onToggle}>
            Editar
          </button>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={6} className="bg-light">
            <EditForm item={item} tipos={tipos} saving={saving} compact onSubmit={onSubmit} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function MobileCard({
  item,
  tipos,
  open,
  saving,
  onToggle,
  onSubmit,
}: {
  item: MaterialItem;
  tipos: { value: string; label: string }[];
  open: boolean;
  saving: boolean;
  onToggle: () => void;
  onSubmit: (event: FormEvent, item: MaterialItem, values: typeof EMPTY_FORM, file: File | null) => Promise<void>;
}) {
  const src = materialFotoSrc(item.foto);
  return (
    <article className={`mobile-list-card${item.activo ? "" : " mobile-list-card--inactive"}`}>
      <div className="mobile-list-card__head">
        <div className="mobile-list-card__meta">
          <span className="badge bg-secondary">{item.tipo_label}</span>
          {item.activo ? <span className="badge bg-success">Activo</span> : <span className="badge bg-secondary">Inactivo</span>}
        </div>
        <button type="button" className="btn btn-sm btn-outline-primary" aria-expanded={open} onClick={onToggle}>
          Editar
        </button>
      </div>
      <div className="d-flex align-items-start gap-2">
        {src ? <img src={src} alt="" className="rounded flex-shrink-0" style={{ width: 40, height: 40, objectFit: "cover" }} /> : null}
        <div className="min-w-0">
          <span className="mobile-list-card__title">{item.nombre}</span>
          {item.modelo ? <p className="mobile-list-card__subtitle mb-0">{item.modelo}</p> : null}
          {item.descripcion ? (
            <p className="mobile-list-card__asunto" title={item.descripcion}>
              {item.descripcion}
            </p>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="mt-3">
          <EditForm item={item} tipos={tipos} saving={saving} compact={false} onSubmit={onSubmit} />
        </div>
      ) : null}
    </article>
  );
}

function EditForm({
  item,
  tipos,
  saving,
  compact,
  onSubmit,
}: {
  item: MaterialItem;
  tipos: { value: string; label: string }[];
  saving: boolean;
  compact: boolean;
  onSubmit: (event: FormEvent, item: MaterialItem, values: typeof EMPTY_FORM, file: File | null) => Promise<void>;
}) {
  const [values, setValues] = useState({
    nombre: item.nombre,
    tipo: item.tipo,
    modelo: item.modelo ?? "",
    descripcion: item.descripcion ?? "",
    activo: item.activo,
  });
  const [file, setFile] = useState<File | null>(null);
  const src = materialFotoSrc(item.foto);
  const control = "form-control form-control-sm";
  return (
    <form className={compact ? "p-3" : "p-2 bg-light rounded"} onSubmit={(event) => void onSubmit(event, item, values, file)}>
      {compact ? (
        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label small" htmlFor={`nombre-${item.id}`}>
              Nombre
            </label>
            <input id={`nombre-${item.id}`} className={control} required maxLength={120} value={values.nombre} onChange={(event) => setValues({ ...values, nombre: event.target.value })} />
          </div>
          <div className="col-md-3">
            <label className="form-label small" htmlFor={`modelo-${item.id}`}>
              Modelo
            </label>
            <input id={`modelo-${item.id}`} className={control} maxLength={100} value={values.modelo} onChange={(event) => setValues({ ...values, modelo: event.target.value })} />
          </div>
          <div className="col-md-3">
            <label className="form-label small" htmlFor={`tipo-${item.id}`}>
              Tipo
            </label>
            <select id={`tipo-${item.id}`} className="form-select form-select-sm" value={values.tipo} onChange={(event) => setValues({ ...values, tipo: event.target.value })}>
              {tipos.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <div className="form-check mt-4">
              <input className="form-check-input" type="checkbox" id={`activo-${item.id}`} checked={values.activo} onChange={(event) => setValues({ ...values, activo: event.target.checked })} />
              <label className="form-check-label small" htmlFor={`activo-${item.id}`}>
                Activo
              </label>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label small" htmlFor={`descripcion-${item.id}`}>
              Descripción
            </label>
            <textarea id={`descripcion-${item.id}`} className={control} rows={2} maxLength={2000} value={values.descripcion} onChange={(event) => setValues({ ...values, descripcion: event.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label small" htmlFor={`foto-${item.id}`}>
              Foto
            </label>
            <input id={`foto-${item.id}`} type="file" className={control} accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            {src ? (
              <div className="mt-2 d-flex align-items-center gap-2">
                <img src={src} alt="" className="rounded" style={{ width: 48, height: 48, objectFit: "cover" }} />
                <small className="text-muted">Subir otra imagen para reemplazar</small>
              </div>
            ) : null}
          </div>
          <div className="col-md-6 text-end align-self-end">
            <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <>
          <Field label="Nombre" id={`nombre-mobile-${item.id}`}>
            <input id={`nombre-mobile-${item.id}`} className={control} required maxLength={120} value={values.nombre} onChange={(event) => setValues({ ...values, nombre: event.target.value })} />
          </Field>
          <Field label="Modelo" id={`modelo-mobile-${item.id}`}>
            <input id={`modelo-mobile-${item.id}`} className={control} maxLength={100} value={values.modelo} onChange={(event) => setValues({ ...values, modelo: event.target.value })} />
          </Field>
          <Field label="Tipo" id={`tipo-mobile-${item.id}`}>
            <select id={`tipo-mobile-${item.id}`} className="form-select form-select-sm" value={values.tipo} onChange={(event) => setValues({ ...values, tipo: event.target.value })}>
              {tipos.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-check mb-2">
            <input className="form-check-input" type="checkbox" id={`activo-mobile-${item.id}`} checked={values.activo} onChange={(event) => setValues({ ...values, activo: event.target.checked })} />
            <label className="form-check-label small" htmlFor={`activo-mobile-${item.id}`}>
              Activo
            </label>
          </div>
          <Field label="Descripción" id={`descripcion-mobile-${item.id}`}>
            <textarea id={`descripcion-mobile-${item.id}`} className={control} rows={2} maxLength={2000} value={values.descripcion} onChange={(event) => setValues({ ...values, descripcion: event.target.value })} />
          </Field>
          <Field label="Foto" id={`foto-mobile-${item.id}`}>
            <input id={`foto-mobile-${item.id}`} type="file" className={control} accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </Field>
          <div className="text-end">
            <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
              Guardar
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <label className="form-label small" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

function FotoThumb({ foto, size }: { foto: string | null; size: number }) {
  const src = materialFotoSrc(foto);
  if (!src) {
    return (
      <span className="text-muted">
        <i className="fas fa-image" aria-hidden="true" />
      </span>
    );
  }
  return <img src={src} alt="" className="rounded" style={{ width: size, height: size, objectFit: "cover" }} />;
}

function SortLink({
  column,
  label,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: "nombre" | "modelo";
  label: string;
  sortBy: string;
  sortOrder: string;
  onSort: (column: "nombre" | "modelo") => void;
}) {
  const active = sortBy === column;
  const icon = active ? (sortOrder === "asc" ? "fa-sort-up" : "fa-sort-down") : "fa-sort";
  return (
    <a
      href="#ordenar"
      className="table-sort-link text-white text-decoration-none"
      onClick={(event) => {
        event.preventDefault();
        onSort(column);
      }}
    >
      {label} <i className={`fas ${icon}`} aria-hidden="true" />
    </a>
  );
}

function SortButton({
  column,
  label,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: "nombre" | "modelo";
  label: string;
  sortBy: string;
  sortOrder: string;
  onSort: (column: "nombre" | "modelo") => void;
}) {
  const active = sortBy === column;
  const icon = active ? (sortOrder === "asc" ? "fa-sort-up" : "fa-sort-down") : "fa-sort";
  return (
    <button type="button" className={`btn btn-outline-secondary${active ? " active" : ""}`} onClick={() => onSort(column)}>
      {label} <i className={`fas ${icon}`} aria-hidden="true" />
    </button>
  );
}

function materialFormData(values: typeof EMPTY_FORM, file: File | null): FormData {
  const body = new FormData();
  body.set("nombre", values.nombre);
  body.set("modelo", values.modelo);
  body.set("descripcion", values.descripcion);
  body.set("tipo", values.tipo);
  body.set("activo", values.activo ? "1" : "0");
  if (file) {
    body.set("foto", file);
  }
  return body;
}
