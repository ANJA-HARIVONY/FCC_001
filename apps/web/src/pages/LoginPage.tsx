import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useSession } from "../auth/session";

export function LoginPage() {
  const session = useSession();
  const { t } = useTranslation();
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!session.loading && session.user) {
    return <Navigate to="/" replace />;
  }
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await session.login(identifiant, password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Error");
    }
  }
  return (
    <main className="container py-5" style={{ maxWidth: 420 }}>
      <h1 className="h4 mb-3">Atención al Cliente</h1>
      <p className="small text-secondary">{t("Introduzca correo o teléfono y contraseña.")}</p>
      <form onSubmit={(event) => void onSubmit(event)}>
        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}
        <label className="form-label" htmlFor="identifiant">
          Correo, teléfono o nombre
        </label>
        <input
          id="identifiant"
          className="form-control mb-3"
          value={identifiant}
          autoComplete="username"
          onChange={(event) => setIdentifiant(event.target.value)}
        />
        <label className="form-label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          className="form-control mb-3"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
        <button type="submit" className="btn btn-danger">
          Iniciar sesión
        </button>
      </form>
    </main>
  );
}
