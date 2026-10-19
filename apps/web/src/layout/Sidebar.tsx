import { navForRole, type NavItem } from "@fcc/domain";
import { NavLink } from "react-router-dom";

import { PATH_BY_ITEM } from "../routes";

const HEADINGS: { label: string; items: NavItem[] }[] = [
  { label: "Principal", items: ["Dashboard", "Incidencias", "Clientes", "Informes"] },
  { label: "Materiales", items: ["Materiales", "Instalaciones"] },
  { label: "Administración", items: ["Usuarios", "Trazabilidad", "Base de datos"] },
  { label: "Cuenta", items: ["Perfil", "Ayuda"] },
];

export function Sidebar({ role, onLogout, onNavigate }: { role: string; onLogout: () => void; onNavigate?: () => void }) {
  const allowed = new Set(navForRole(role));
  return (
    <nav aria-label="Navegación principal">
      {HEADINGS.map((group) => {
        const items = group.items.filter((item) => allowed.has(item));
        if (items.length === 0) {
          return null;
        }
        return (
          <div key={group.label} className="mb-3">
            <div className="text-uppercase small text-secondary px-2">{group.label}</div>
            <ul className="nav flex-column">
              {items.map((item) => (
                <li key={item} className="nav-item">
                  <NavLink
                    to={PATH_BY_ITEM[item as keyof typeof PATH_BY_ITEM]}
                    end={item === "Dashboard"}
                    className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                    onClick={onNavigate}
                  >
                    {item}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {allowed.has("Salir") ? (
        <button type="button" className="btn btn-link nav-link text-danger" onClick={onLogout}>
          Salir
        </button>
      ) : null}
    </nav>
  );
}
