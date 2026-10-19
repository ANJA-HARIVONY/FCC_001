import { isAdmin, isSuperadmin } from "./roles.ts";

/** Libellés de `_sidebar.html`. Le menu Operadores n'existe pas. */
export const NAV_ITEMS = [
  "Dashboard",
  "Incidencias",
  "Clientes",
  "Informes",
  "Materiales",
  "Instalaciones",
  "Usuarios",
  "Trazabilidad",
  "Base de datos",
  "Perfil",
  "Ayuda",
  "Salir",
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

const PRINCIPAL: NavItem[] = ["Dashboard", "Incidencias", "Clientes", "Informes"];
const MATERIALES: NavItem[] = ["Materiales", "Instalaciones"];
const ADMINISTRACION: NavItem[] = ["Usuarios", "Trazabilidad", "Base de datos"];
const CUENTA: NavItem[] = ["Perfil", "Ayuda", "Salir"];

export function navForRole(role: string | null | undefined): NavItem[] {
  const items: NavItem[] = [...PRINCIPAL];
  if (isAdmin(role)) {
    items.push(...MATERIALES);
  }
  if (isSuperadmin(role)) {
    items.push(...ADMINISTRACION);
  }
  items.push(...CUENTA);
  return items;
}
