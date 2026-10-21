import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CLIENT_EXPORT_COLUMNS, clientExportRow } from "../src/clientes/export-xlsx.ts";

describe("liste clientes", () => {
  it("l'Excel de la page reprend les dix colonnes Flask", () => {
    assert.deepEqual([...CLIENT_EXPORT_COLUMNS], [
      "ID",
      "Categoría",
      "Nombre",
      "Teléfono",
      "Dirección",
      "Barrio",
      "Ciudad",
      "IP Router",
      "IP Antea",
      "Incidencias",
    ]);
    const row = clientExportRow({
      id: 4,
      categoria: "particular",
      nom: "Ana",
      telephone: "222",
      adresse: "Calle 2",
      ville: "Centro",
      ip_router: "10.0.0.1",
      ip_antea: null,
      ciudad: { nombre: "Malabo" },
      incidencias: 3,
    });
    assert.equal(row[0], 4);
    assert.equal(row[1], "Particular");
    assert.equal(row[6], "Malabo");
    assert.equal(row[8], "");
    assert.equal(row[9], 3);
  });
});
