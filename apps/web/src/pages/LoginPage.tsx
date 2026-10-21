import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useSession } from "../auth/session";
import { LanguageSwitch } from "../layout/LanguageSwitch";

export function LoginPage() {
  const { t } = useTranslation();
  const session = useSession();
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session.loading && session.user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await session.login(identifiant, password, remember);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Error");
    }
  }

  return (
    <div className="login-page">
      <div className="login-lang">
        <LanguageSwitch />
      </div>
      <div className="login-layout">
        <aside className="login-aside" aria-hidden="false">
          <div className="login-aside__inner">
            <div className="login-aside__brand">
              <img src="/static/img/logo.png" alt="CONNEXIA" className="login-aside__logo" />
              <p className="login-aside__tagline">{t("Registro de Atención al cliente")}</p>
            </div>
            <ul className="login-aside__points">
              <li>
                <i className="fas fa-shield-alt" aria-hidden="true" /> {t("Acceso seguro para usuarios autorizados")}
              </li>
              <li>
                <i className="fas fa-headset" aria-hidden="true" /> {t("Gestión de incidencias y clientes")}
              </li>
              <li>
                <i className="fas fa-chart-line" aria-hidden="true" /> {t("Informes y seguimiento operativo")}
              </li>
            </ul>
            <p className="login-aside__copy">&copy; 2026 CONNEXIA</p>
          </div>
        </aside>

        <main className="login-main">
          <div className="app-login-box">
            <div className="app-login-box__mobile-brand d-lg-none text-center mb-4">
              <img src="/static/img/logo.png" alt="CONNEXIA" className="login-aside__logo login-aside__logo--sm" />
            </div>

            <div className="app-login-box__header mb-4">
              <h1 className="app-login-box__title">{t("Iniciar sesión")}</h1>
              <p className="app-login-box__subtitle mb-0">{t("Bienvenido. Ingresa con tu correo o teléfono y contraseña.")}</p>
            </div>

            {error ? (
              <div className="alert alert-danger alert-dismissible fade show small" role="alert">
                <i className="fas fa-circle-exclamation me-1" aria-hidden="true" />
                {error}
                <button type="button" className="btn-close" aria-label={t("Cerrar")} onClick={() => setError(null)} />
              </div>
            ) : null}

            <form onSubmit={(event) => void onSubmit(event)} noValidate className="app-login-box__form">
              <div className="mb-3">
                <label htmlFor="identifiant" className="form-label">
                  {t("Correo o teléfono")}
                </label>
                <div className="input-group login-input-group">
                  <span className="input-group-text" aria-hidden="true">
                    <i className="fas fa-user" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    id="identifiant"
                    name="identifiant"
                    required
                    autoComplete="username"
                    placeholder={t("usuario@correo.com o +240...")}
                    aria-describedby="identifiant-help"
                    value={identifiant}
                    onChange={(event) => setIdentifiant(event.target.value)}
                  />
                </div>
                <div id="identifiant-help" className="form-text">
                  {t("Utiliza tu correo o teléfono registrado.")}
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label">
                  {t("Contraseña")}
                </label>
                <div className="input-group login-input-group">
                  <span className="input-group-text" aria-hidden="true">
                    <i className="fas fa-lock" />
                  </span>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder={t("Tu contraseña")}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="remember"
                  name="remember"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <label className="form-check-label" htmlFor="remember">
                  {t("Recordarme")}
                </label>
              </div>

              <button type="submit" className="btn btn-danger w-100 btn-lg login-submit-btn">
                <i className="fas fa-sign-in-alt me-2" aria-hidden="true" />
                {t("Entrar")}
              </button>
            </form>

            <p className="app-login-box__footer text-center mt-4 mb-0 d-lg-none">&copy; 2026 CONNEXIA</p>
          </div>
        </main>
      </div>
    </div>
  );
}
