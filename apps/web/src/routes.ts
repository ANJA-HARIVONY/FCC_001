import { navForRole, type NavItem } from "@fcc/domain";

export const PATH_BY_ITEM = {
  Dashboard: "/",
  Incidencias: "/incidencias",
  Clientes: "/clientes",
  Informes: "/informes",
  Materiales: "/materiales",
  Instalaciones: "/instalaciones",
  Usuarios: "/usuarios",
  Trazabilidad: "/trazabilidad",
  "Base de datos": "/base-de-datos",
  Perfil: "/perfil",
  Ayuda: "/ayuda",
} as const satisfies Record<Exclude<NavItem, "Salir">, string>;

export function itemForPath(pathname: string): Exclude<NavItem, "Salir"> | null {
  const found = (Object.entries(PATH_BY_ITEM) as [Exclude<NavItem, "Salir">, string][]).find(
    ([, path]) => path === pathname,
  );
  return found?.[0] ?? null;
}

export function canAccessPath(role: string, pathname: string): boolean {
  const item = itemForPath(pathname);
  if (!item) {
    return false;
  }
  return navForRole(role).includes(item);
}
