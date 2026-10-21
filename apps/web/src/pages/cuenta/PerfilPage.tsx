import { FormEvent, useEffect, useState } from "react";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { usePageMeta } from "../../layout/Shell";

interface Profile {
  nom: string;
  telephone: string;
  email: string | null;
  role: string;
  ciudad: string;
  agencia: string;
}

export function PerfilPage() {
  const session = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: "Perfil",
    icon: <i className="fas fa-user-cog" aria-hidden="true" />,
    subtitle: "Cuenta",
  });

  useEffect(() => {
    void (async () => {
      const payload = await api<{ item: Profile }>("/api/perfil");
      setProfile(payload.item);
      setNom(payload.item.nom);
      setTelephone(payload.item.telephone);
    })();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const payload = await api<{ item: Profile }>("/api/perfil", {
        method: "PUT",
        body: JSON.stringify({ nom, telephone, password, password2 }),
      });
      setProfile(payload.item);
      setPassword("");
      setPassword2("");
      setMessage("Perfil actualizado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function onAvatar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const input = event.currentTarget.elements.namedItem("avatar");
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (!file) {
      setError("Seleccione un archivo.");
      return;
    }
    const body = new FormData();
    body.set("avatar", file);
    try {
      const payload = await api<{ avatar_url: string; message: string }>("/api/perfil/avatar", {
        method: "POST",
        body,
      });
      session.patchAvatar(payload.avatar_url);
      setMessage(payload.message || "Avatar actualizado.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  if (!profile) return <p className="text-muted">Cargando…</p>;

  return (
    <>
    <form className="card" onSubmit={(e) => void onAvatar(e)}>
      <div className="card-body">
        {error ? <div className="alert alert-danger">{error}</div> : null}
        {message ? <div className="alert alert-success">{message}</div> : null}
        <div className="mb-3">
          <label className="form-label" htmlFor="avatar">
            Avatar (JPG, PNG, WEBP, máx. 2 MB)
          </label>
          <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="form-control" />
        </div>
        <button className="btn btn-outline-primary btn-sm" type="submit">
          Subir avatar
        </button>
      </div>
    </form>
    <form className="card mt-3" onSubmit={(e) => void onSubmit(e)}>
      <div className="card-body">
        <p className="text-muted">
          {profile.role} · {profile.agencia} / {profile.ciudad}
          {profile.email ? ` · ${profile.email}` : ""}
        </p>
        <div className="mb-3">
          <label className="form-label" htmlFor="nom">
            Nombre
          </label>
          <input id="nom" className="form-control" value={nom} onChange={(e) => setNom(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="telephone">
            Teléfono
          </label>
          <input
            id="telephone"
            className="form-control"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="password">
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            className="form-control"
            value={password}
            minLength={password ? 6 : undefined}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="password2">
            Confirmar contraseña
          </label>
          <input
            id="password2"
            type="password"
            className="form-control"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm" type="submit">
          Guardar
        </button>
      </div>
    </form>
    </>
  );
}
