/** Tri du catalogue. Même règle que `_apply_catalogo_sort` : un tri inconnu revient au défaut. */

export type CatalogoSort = "" | "nombre" | "modelo";
export type CatalogoOrder = "" | "asc" | "desc";

export interface CatalogoRow {
  id: number;
  tipo: string;
  nombre: string;
  modelo: string | null;
}

export function catalogoSortParams(sort?: string, order?: string): { sort: CatalogoSort; order: CatalogoOrder } {
  const sortBy: CatalogoSort = sort === "nombre" || sort === "modelo" ? sort : "";
  if (!sortBy) {
    return { sort: "", order: "" };
  }
  return { sort: sortBy, order: order === "desc" ? "desc" : "asc" };
}

/**
 * `modelo` vide ou null est traité comme `''` (`coalesce` Flask), puis nom, puis id.
 */
export function compareCatalogo(a: CatalogoRow, b: CatalogoRow, sort: CatalogoSort, order: CatalogoOrder): number {
  const dir = order === "desc" ? -1 : 1;
  if (sort === "nombre") {
    return dir * a.nombre.localeCompare(b.nombre, "es") || a.id - b.id;
  }
  if (sort === "modelo") {
    const byModelo = (a.modelo ?? "").localeCompare(b.modelo ?? "", "es");
    return dir * byModelo || a.nombre.localeCompare(b.nombre, "es") || a.id - b.id;
  }
  return a.tipo.localeCompare(b.tipo, "es") || a.nombre.localeCompare(b.nombre, "es") || a.id - b.id;
}
