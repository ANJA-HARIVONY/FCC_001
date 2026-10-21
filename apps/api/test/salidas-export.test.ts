import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SALIDA_EXPORT_COLUMNS,
  salidaClienteLabel,
  salidaExportRow,
  salidaMaterialesTabla,
} from "../src/materiales/export-xlsx.ts";

describe("export salidas", () => {
  it("reprend les six colonnes et le libellé client Flask", () => {
    assert.deepEqual(SALIDA_EXPORT_COLUMNS, ["ID", "Fecha", "Tipo", "Técnico", "Cliente", "Materiales"]);
    assert.equal(salidaClienteLabel({ client: null, tipo_salida: "uso_interno" }), "Uso interno");
    assert.equal(salidaClienteLabel({ client: null, tipo_salida: "incidencia" }), "Uso general");
    assert.equal(
      salidaMaterialesTabla([{ nombre: "Router", modelo: null, cantidad: 2 }]),
      "Router(?) x2",
    );
    const row = salidaExportRow({
      id: 4,
      fecha: "2026-10-20",
      tipo_salida: "uso_interno",
      tipo_label: "Uso interno",
      tecnico: { nom: "Ana" },
      client: null,
      lineas_vista: [{ nombre: "Cable", modelo: "UTP", cantidad: 1 }],
    });
    assert.deepEqual(row, [4, "20/10/2026", "Uso interno", "Ana", "Uso interno", "Cable(UTP) x1"]);
  });
});
