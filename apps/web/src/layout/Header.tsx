import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import type { SessionUser } from "../auth/session";

export function Header({
  user,
  onToggleSidebar,
  onLogout,
}: {
  user: SessionUser;
  onToggleSidebar: () => void;
  onLogout: () => void;
}) {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("sidebarTheme") === "light" ? "light" : "dark",
  );
  const avatar = user.avatarUrl || "/static/img/default_avatar.png";

  useEffect(() => {
    document.documentElement.setAttribute("data-sidebar-theme", theme);
    document.documentElement.setAttribute("data-app-theme", theme);
    localStorage.setItem("sidebarTheme", theme);
  }, [theme]);

  return (
    <header className="app-header header-shadow" role="banner">
      <div className="app-header__logo">
        <Link className="app-header__brand" to="/">
          <img src="/static/img/logo.png" alt="CONNEXIA" className="app-header__logo-img" />
          <span className="app-header__brand-copy">
            <span className="app-header__title">Registro de Atención al cliente</span>
            <span className="app-header__meta">
              {user.agenciaNombre} / {user.ciudadNombre}
            </span>
          </span>
        </Link>
      </div>

      <div className="app-header__content">
        <div className="app-header-right">
          <button
            type="button"
            className="btn btn-link app-header__toggle p-0"
            id="sidebar-toggle"
            aria-label="Alternar menú lateral"
            aria-controls="app-sidebar"
            onClick={onToggleSidebar}
          >
            <span className="hamburger hamburger--elastic" aria-hidden="true">
              <span className="hamburger-box">
                <span className="hamburger-inner" />
              </span>
            </span>
          </button>

          <button
            type="button"
            className="btn btn-light btn-sm app-header__theme-btn"
            id="sidebar-theme-toggle"
            aria-label="Cambiar tema de la aplicación"
            title="Cambiar tema de la aplicación"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            <i className="fas fa-sun theme-icon-light" aria-hidden="true" />
            <i className="fas fa-moon theme-icon-dark" aria-hidden="true" />
          </button>

          <div className="dropdown app-header__bell" id="comment-notifications-dropdown">
            <button
              className="btn btn-light btn-sm notification-bell-btn position-relative app-header__icon-btn"
              type="button"
              aria-label="Notificaciones"
              disabled
            >
              <i className="fas fa-bell" />
            </button>
          </div>

          <div className="dropdown app-header__user">
            <button
              className="btn btn-light btn-sm dropdown-toggle d-flex align-items-center gap-2 app-header__user-btn"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              id="user-menu-toggle"
              onClick={(event) => {
                const menu = document.getElementById("user-menu");
                const open = menu?.classList.toggle("show");
                event.currentTarget.setAttribute("aria-expanded", open ? "true" : "false");
              }}
            >
              <img src={avatar} alt="" className="rounded-circle border" width={32} height={32} style={{ objectFit: "cover" }} />
              <span className="small d-none d-lg-inline">{user.nom}</span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end" id="user-menu">
              <li>
                <NavLink className={({ isActive }) => `dropdown-item${isActive ? " active" : ""}`} to="/perfil">
                  <i className="fas fa-user-cog me-2" />
                  Perfil
                </NavLink>
              </li>
              <li>
                <NavLink className={({ isActive }) => `dropdown-item${isActive ? " active" : ""}`} to="/ayuda">
                  <i className="fas fa-question-circle me-2" />
                  Ayuda
                </NavLink>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <a
                  className="dropdown-item text-danger"
                  href="/login"
                  onClick={(event) => {
                    event.preventDefault();
                    onLogout();
                  }}
                >
                  <i className="fas fa-sign-out-alt me-2" />
                  Salir
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
