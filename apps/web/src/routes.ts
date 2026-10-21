import { isAdmin, navForRole, type NavItem } from "@fcc/domain";

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
  const entries = Object.entries(PATH_BY_ITEM) as [Exclude<NavItem, "Salir">, string][];
  const exact = entries.find(([, path]) => path === pathname);
  if (exact) {
    return exact[0];
  }
  // Sous-routes métier : /clientes/nuevo, /clientes/12/editar, …
  const nested = entries
    .filter(([, path]) => path !== "/" && pathname.startsWith(`${path}/`))
    .sort((a, b) => b[1].length - a[1].length)[0];
  return nested?.[0] ?? null;
}

export function canAccessPath(role: string, pathname: string): boolean {
  if (pathname === "/buscar" || pathname.startsWith("/buscar/")) {
    return true;
  }
  if (/^\/atencion-cliente\/\d+\/ficha/.test(pathname) || /^\/tecnicos\/\d+\/ficha/.test(pathname)) {
    return isAdmin(role);
  }
  const item = itemForPath(pathname);
  if (!item) {
    return false;
  }
  return navForRole(role).includes(item);
}
