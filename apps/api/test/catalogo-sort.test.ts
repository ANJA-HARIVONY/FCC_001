import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { catalogoSortParams, compareCatalogo } from "../src/materiales/catalogo-sort.ts";

const rows = [
  { id: 1, nombre: "Antena", modelo: "A1", tipo: "outillage" },
  { id: 2, nombre: "Cable", modelo: "M9", tipo: "material_cliente" },
  { id: 3, nombre: "Router", modelo: null, tipo: "outillage" },
  { id: 4, nombre: "Bobina", modelo: "B2", tipo: "material_cliente" },
];

function names(sort?: string, order?: string): string[] {
  const params = catalogoSortParams(sort, order);
  return [...rows]
    .sort((a, b) => compareCatalogo(a, b, params.sort, params.order))
    .map((row) => row.nombre);
}

describe("tri du catalogue — oracle Flask", () => {
  it("groupe par tipo puis nombre", () => {
    assert.deepEqual(names(), ["Bobina", "Cable", "Antena", "Router"]);
  });

  it("trie le nombre ascendant et descendant", () => {
    assert.deepEqual(names("nombre", "asc"), ["Antena", "Bobina", "Cable", "Router"]);
    assert.deepEqual(names("nombre", "desc"), ["Router", "Cable", "Bobina", "Antena"]);
  });

  it("place un modelo vide en tête, comme coalesce", () => {
    assert.deepEqual(names("modelo", "asc"), ["Router", "Antena", "Bobina", "Cable"]);
  });

  it("ignore un tri invalide", () => {
    assert.deepEqual(names("tipo", "desc"), ["Bobina", "Cable", "Antena", "Router"]);
    assert.deepEqual(catalogoSortParams("tipo", "desc"), { sort: "", order: "" });
  });

  it("conserve le filtre tipo à part du tri", () => {
    const filtered = rows.filter((row) => row.tipo === "outillage");
    const params = catalogoSortParams("nombre", "asc");
    const ordered = filtered
      .sort((a, b) => compareCatalogo(a, b, params.sort, params.order))
      .map((row) => row.nombre);
    assert.deepEqual(ordered, ["Antena", "Router"]);
    assert.equal(params.sort, "nombre");
  });
});
