import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { usePageMeta } from "../../layout/Shell";

interface UserRow {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  role: string;
  categoria: string;
  actif: boolean;
  id_ciudad: number;
  id_agencia: number;
  ciudad: string;
  agencia: string;
}

interface ListPayload {
  items: UserRow[];
  ciudades: { id: number; nombre: string }[];
  agencias: { id: number; nombre: string; id_ciudad: number }[];
}

export function UsuariosListPage() {
  const [data, setData] = useState<ListPayload | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: "Usuarios",
    icon: <i className="fas fa-users" aria-hidden="true" />,
    subtitle: "Administración",
    actions: (
      <Link to="/usuarios/nuevo" className="btn btn-primary btn-sm">
        Nuevo usuario
      </Link>
    ),
  });

  async function load(q = search) {
    const payload = await api<ListPayload>(`/api/usuarios?search=${encodeURIComponent(q)}`);
    setData(payload);
  }

  useEffect(() => {
    void load("").catch((err) => setError(err instanceof ApiError ? err.message : "Error"));
  }, []);

  async function toggle(id: number) {
    try {
      await api(`/api/usuarios/${id}/activo`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  return (
    <div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      <form
        className="mb-3 d-flex gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void load();
        }}
      >
        <input className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" />
        <button className="btn btn-outline-primary btn-sm" type="submit">
          Buscar
        </button>
      </form>
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Categoría</th>
              <th>Ciudad</th>
              <th>Agencia</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id}>
                <td>{row.nom}</td>
                <td>{row.telephone}</td>
                <td>{row.role}</td>
                <td>{row.categoria}</td>
                <td>{row.ciudad}</td>
                <td>{row.agencia}</td>
                <td>{row.actif ? "Activo" : "Inactivo"}</td>
                <td className="text-nowrap">
                  <Link className="btn btn-sm btn-outline-primary me-1" to={`/usuarios/${row.id}/editar`}>
                    Modificar
                  </Link>
                  {row.categoria === "atencion_cliente" ? (
                    <Link className="btn btn-sm btn-outline-secondary me-1" to={`/atencion-cliente/${row.id}/ficha`}>
                      Ficha
                    </Link>
                  ) : null}
                  {row.categoria === "tecnico" ? (
                    <Link className="btn btn-sm btn-outline-secondary me-1" to={`/tecnicos/${row.id}/ficha`}>
                      Ficha
                    </Link>
                  ) : null}
                  <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => void toggle(row.id)}>
                    {row.actif ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UsuarioFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const editing = Boolean(id);
  const [ciudades, setCiudades] = useState<{ id: number; nombre: string }[]>([]);
  const [agencias, setAgencias] = useState<{ id: number; nombre: string; id_ciudad: number }[]>([]);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [idCiudad, setIdCiudad] = useState("");
  const [idAgencia, setIdAgencia] = useState("");
  const [role, setRole] = useState("usuario");
  const [categoria, setCategoria] = useState("atencion_cliente");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  usePageMeta({
    title: editing ? "Modificar usuario" : "Nuevo usuario",
    icon: <i className="fas fa-user" aria-hidden="true" />,
  });

  useEffect(() => {
    void (async () => {
      const payload = await api<ListPayload>("/api/usuarios");
      setCiudades(payload.ciudades);
      setAgencias(payload.agencias);
      if (id) {
        const current = payload.items.find((row) => row.id === Number(id));
        if (current) {
          setNom(current.nom);
          setTelephone(current.telephone);
          setEmail(current.email ?? "");
          setIdCiudad(String(current.id_ciudad));
          setIdAgencia(String(current.id_agencia));
          setRole(current.role);
          setCategoria(current.categoria);
        }
      }
    })();
  }, [id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const body = {
      nom,
      telephone,
      email,
      password,
      id_ciudad: Number(idCiudad),
      id_agencia: Number(idAgencia),
      role,
      categoria,
    };
    try {
      await api(editing ? `/api/usuarios/${id}` : "/api/usuarios", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      navigate("/usuarios");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function onAvatar(file: File | undefined) {
    if (!id || !file) {
      setError("Seleccione un archivo.");
      return;
    }
    setError(null);
    setMessage(null);
    const body = new FormData();
    body.set("avatar", file);
    try {
      const payload = await api<{ avatar_url: string; message: string }>(`/api/usuarios/${id}/avatar`, {
        method: "POST",
        body,
      });
      if (session.user?.userId === Number(id)) {
        session.patchAvatar(payload.avatar_url);
      }
      setMessage(payload.message || "Avatar actualizado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  const agenciasCiudad = agencias.filter((a) => !idCiudad || a.id_ciudad === Number(idCiudad));

  return (
    <form className="card" onSubmit={(e) => void onSubmit(e)}>
      <div className="card-body">
        {error ? <div className="alert alert-danger">{error}</div> : null}
        {message ? <div className="alert alert-success">{message}</div> : null}
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Nombre</label>
            <input className="form-control" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Teléfono</label>
            <input className="form-control" value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Correo</label>
            <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Contraseña</label>
            <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Ciudad</label>
            <select className="form-select" value={idCiudad} onChange={(e) => setIdCiudad(e.target.value)} required>
              <option value="">Seleccione</option>
              {ciudades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Agencia</label>
            <select className="form-select" value={idAgencia} onChange={(e) => setIdAgencia(e.target.value)} required>
              <option value="">Seleccione</option>
              {agenciasCiudad.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Rol</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="usuario">usuario</option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Categoría</label>
            <select className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="atencion_cliente">atencion_cliente</option>
              <option value="tecnico">tecnico</option>
            </select>
          </div>
        </div>
        {editing ? (
          <div className="mb-3">
            <label className="form-label" htmlFor="avatar">
              Avatar (JPG, PNG, WEBP, máx. 2 MB)
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="form-control"
              onChange={(e) => void onAvatar(e.target.files?.[0])}
            />
          </div>
        ) : null}
        <button className="btn btn-primary btn-sm mt-3" type="submit">
          Guardar
        </button>
      </div>
    </form>
  );
}
