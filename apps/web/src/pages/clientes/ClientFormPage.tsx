import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CLIENT_CATEGORY_DEFAULT } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { usePageMeta } from "../../layout/Shell";
import type { ClientItem, ClientWriteBody } from "./types";

export function ClientCreatePage() {
  return <ClientForm mode="create" />;
}

export function ClientEditPage() {
  const { id } = useParams();
  return <ClientForm mode="edit" clientId={Number(id)} />;
}

function ClientForm({ mode, clientId }: { mode: "create" | "edit"; clientId?: number }) {
  const session = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get("next") || "/clientes";
  const [ciudades, setCiudades] = useState<{ id: number; nombre: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [adresseVilleAlert, setAdresseVilleAlert] = useState(false);
  const [form, setForm] = useState<ClientWriteBody>({
    nom: "",
    telephone: "",
    adresse: "",
    ville: "",
    ip_router: "",
    ip_antea: "",
    username_radius: "",
    id_ciudad: session.user?.idCiudad ?? 0,
    categoria: CLIENT_CATEGORY_DEFAULT,
  });

  usePageMeta({
    title: mode === "create" ? "Nuevo Cliente" : "Modificar Cliente",
    icon: <i className={mode === "create" ? "fas fa-user-plus" : "fas fa-user-edit"} aria-hidden="true" />,
    subtitle:
      mode === "create"
        ? "Añadir un nuevo cliente al sistema"
        : form.nom
          ? `Modificar los datos del cliente ${form.nom}`
          : "Modificar los datos del cliente",
    actions: (
      <Link to="/clientes" className="btn btn-outline-secondary btn-sm">
        <i className="fas fa-arrow-left me-1" aria-hidden="true" />
        Volver
      </Link>
    ),
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const geo = await api<{ items: { id: number; nombre: string }[] }>("/api/ciudades");
        if (cancelled) {
          return;
        }
        setCiudades(geo.items);
        if (mode === "edit" && clientId) {
          const payload = await api<{ item: ClientItem }>(`/api/clients/${clientId}`);
          if (cancelled) {
            return;
          }
          const item = payload.item;
          setForm({
            nom: item.nom,
            telephone: item.telephone,
            adresse: item.adresse,
            ville: item.ville,
            ip_router: item.ip_router ?? "",
            ip_antea: item.ip_antea ?? "",
            username_radius: item.username_radius ?? "",
            id_ciudad: item.id_ciudad ?? session.user?.idCiudad ?? 0,
            categoria: item.categoria || CLIENT_CATEGORY_DEFAULT,
          });
        } else if (geo.items.length && !form.id_ciudad) {
          const preferred = session.user?.idCiudad;
          const match = geo.items.find((row) => row.id === preferred) ?? geo.items[0];
          if (match) {
            setForm((prev) => ({ ...prev, id_ciudad: match.id }));
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial
  }, [mode, clientId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.adresse.trim().toLowerCase() === form.ville.trim().toLowerCase()) {
      setAdresseVilleAlert(true);
      return;
    }
    setAdresseVilleAlert(false);
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...form,
        id_ciudad: Number(form.id_ciudad),
      };
      if (mode === "create") {
        await api("/api/clients", { method: "POST", body: JSON.stringify(body) });
        navigate("/clientes");
      } else if (clientId) {
        await api(`/api/clients/${clientId}`, { method: "PUT", body: JSON.stringify(body) });
        navigate(nextUrl.startsWith("/") ? nextUrl : "/clientes");
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
            <Link to="/clientes">Clientes</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {mode === "create" ? "Nuevo Cliente" : "Modificar Cliente"}
          </li>
        </ol>
      </nav>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card content-card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-info-circle me-2" aria-hidden="true" />
                Datos del Cliente
              </h5>
            </div>
            <div className="card-body">
              {error ? (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              ) : null}
              <div className={`alert alert-warning${adresseVilleAlert ? "" : " d-none"}`} role="alert">
                <i className="fas fa-exclamation-triangle me-2" aria-hidden="true" />
                La Dirección debe ser diferente del Barrio. Por favor, la Dirección debe tener mas detallas.
              </div>
              <form onSubmit={(event) => void onSubmit(event)}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="nom" className="form-label">
                      Nombre del Cliente <span className="text-danger">*</span>
                    </label>
                    <input
                      id="nom"
                      className="form-control"
                      required
                      value={form.nom}
                      onChange={(event) => setForm({ ...form, nom: event.target.value })}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="telephone" className="form-label">
                      Teléfono <span className="text-danger">*</span>
                    </label>
                    <input
                      id="telephone"
                      className="form-control"
                      required
                      value={form.telephone}
                      onChange={(event) => setForm({ ...form, telephone: event.target.value })}
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label htmlFor="adresse" className="form-label">
                      Dirección <span className="text-danger">*</span>
                    </label>
                    <input
                      id="adresse"
                      className="form-control"
                      required
                      value={form.adresse}
                      onChange={(event) => {
                        setAdresseVilleAlert(false);
                        setForm({ ...form, adresse: event.target.value });
                      }}
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label htmlFor="ville" className="form-label">
                      Barrio <span className="text-danger">*</span>
                    </label>
                    <input
                      id="ville"
                      className="form-control"
                      required
                      value={form.ville}
                      onChange={(event) => {
                        setAdresseVilleAlert(false);
                        setForm({ ...form, ville: event.target.value });
                      }}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <span className="form-label d-block">
                    Categoría <span className="text-danger">*</span>
                  </span>
                  <div className="categoria-cliente-radios d-flex flex-wrap gap-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="categoria"
                        id="categoria_particular"
                        value="particular"
                        checked={form.categoria === "particular"}
                        onChange={() => setForm({ ...form, categoria: "particular" })}
                        required
                      />
                      <label className="form-check-label" htmlFor="categoria_particular">
                        Particular
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="categoria"
                        id="categoria_corporativo"
                        value="corporativo"
                        checked={form.categoria === "corporativo"}
                        onChange={() => setForm({ ...form, categoria: "corporativo" })}
                        required
                      />
                      <label
                        className="form-check-label d-inline-flex align-items-center gap-2"
                        htmlFor="categoria_corporativo"
                      >
                        <img
                          src="/static/img/icon-cliente-corporativo.png"
                          alt=""
                          className="icon-cliente-corporativo"
                          width={22}
                          height={22}
                          aria-hidden="true"
                        />
                        Corporativo
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="id_ciudad" className="form-label">
                    Ciudad <span className="text-danger">*</span>
                  </label>
                  <select
                    id="id_ciudad"
                    className="form-select"
                    required
                    value={form.id_ciudad || ""}
                    onChange={(event) => setForm({ ...form, id_ciudad: Number(event.target.value) })}
                  >
                    <option value="">Seleccione una ciudad</option>
                    {ciudades.map((ciudad) => (
                      <option key={ciudad.id} value={ciudad.id}>
                        {ciudad.nombre}
                      </option>
                    ))}
                  </select>
                  {mode === "create" ? (
                    <div className="form-text">Por defecto: ciudad del usuario conectado.</div>
                  ) : null}
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="ip_router" className="form-label">
                      IP Router
                    </label>
                    <input
                      id="ip_router"
                      className="form-control"
                      placeholder="192.168.1.1"
                      value={form.ip_router}
                      onChange={(event) => setForm({ ...form, ip_router: event.target.value })}
                    />
                    <div className="form-text">Format: xxx.xxx.xxx.xxx (opcional)</div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="ip_antea" className="form-label">
                      IP Antena
                    </label>
                    <input
                      id="ip_antea"
                      className="form-control"
                      placeholder="192.168.1.2"
                      value={form.ip_antea}
                      onChange={(event) => setForm({ ...form, ip_antea: event.target.value })}
                    />
                    <div className="form-text">Format: xxx.xxx.xxx.xxx (opcional)</div>
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="username_radius" className="form-label">
                    Username RADIUS
                  </label>
                  <input
                    id="username_radius"
                    className="form-control"
                    placeholder="ej. vatsy_r2i"
                    autoComplete="off"
                    value={form.username_radius}
                    onChange={(event) => setForm({ ...form, username_radius: event.target.value })}
                  />
                  <div className="form-text">Login RADIUS (SysAPI get_userdata). Obligatorio para consultar RADIUS.</div>
                </div>
                <div className="d-flex justify-content-between mt-4">
                  <Link to={mode === "edit" ? nextUrl : "/clientes"} className="btn btn-secondary">
                    <i className="fas fa-arrow-left me-1" aria-hidden="true" />
                    Volver
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="fas fa-save me-1" aria-hidden="true" />
                    {mode === "create" ? "Guardar" : "Guardar las modificaciones"}
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
