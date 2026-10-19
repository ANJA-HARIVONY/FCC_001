import { navForRole, type NavItem } from "@fcc/domain";
import { NavLink } from "react-router-dom";

import { PATH_BY_ITEM } from "../routes";

const ICONS: Record<Exclude<NavItem, "Salir">, string> = {
  Dashboard: "fas fa-tachometer-alt",
  Incidencias: "fa fa-ticket",
  Clientes: "fa fa-user",
  Informes: "fas fa-chart-bar",
  Materiales: "fas fa-toolbox",
  Instalaciones: "fas fa-building",
  Usuarios: "fas fa-users",
  Trazabilidad: "fas fa-clipboard-list",
  "Base de datos": "fas fa-database",
  Perfil: "fas fa-user-cog",
  Ayuda: "fas fa-question-circle",
};

type Group = { label: string; items: Exclude<NavItem, "Salir">[] };

const GROUPS: Group[] = [
  { label: "Principal", items: ["Dashboard", "Incidencias", "Clientes", "Informes"] },
  { label: "Materiales", items: ["Materiales", "Instalaciones"] },
  { label: "Administración", items: ["Usuarios", "Trazabilidad", "Base de datos"] },
  { label: "Cuenta", items: ["Perfil", "Ayuda"] },
];

export function Sidebar({ role, onLogout }: { role: string; onLogout: () => void }) {
  const allowed = new Set(navForRole(role));
  return (
    <aside className="app-sidebar sidebar-shadow" id="app-sidebar" aria-label="Navegación principal">
      <div className="scrollbar-sidebar">
        <div className="app-sidebar__inner">
          <ul className="vertical-nav-menu">
            {GROUPS.map((group) => {
              const items = group.items.filter((item) => allowed.has(item));
              if (items.length === 0) {
                return null;
              }
              return (
                <NavGroup key={group.label} label={group.label} items={items} />
              );
            })}
            {allowed.has("Salir") ? (
              <li>
                <a
                  href="/login"
                  className="app-sidebar__logout"
                  onClick={(event) => {
                    event.preventDefault();
                    onLogout();
                  }}
                >
                  <i className="nav-menu-icon fas fa-sign-out-alt" aria-hidden="true" />
                  <span className="nav-menu-label">Salir</span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({ label, items }: { label: string; items: Exclude<NavItem, "Salir">[] }) {
  return (
    <>
      <li className="app-sidebar__heading">{label}</li>
      {items.map((item) => (
        <li key={item}>
          <NavLink
            to={PATH_BY_ITEM[item]}
            end={item === "Dashboard"}
            className={({ isActive }) => (isActive ? "mm-active active" : "")}
          >
            <i className={`nav-menu-icon ${ICONS[item]}`} aria-hidden="true" />
            <span className="nav-menu-label">{item}</span>
          </NavLink>
        </li>
      ))}
    </>
  );
}
