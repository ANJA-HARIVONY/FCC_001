import assert from "node:assert/strict";
import { describe, it } from "node:test";

import ExcelJS from "exceljs";

import {
  assertInformeExportPeriod,
  buildInformeResumen,
  buildInformeWorkbook,
  informeCliente,
  tecnicoFichaAccess,
  type InformeLinea,
} from "../src/materiales/informe.ts";

const linea: InformeLinea = {
  id: 1,
  cantidad: 2,
  id_material: 5,
  material: { nombre: "Router", modelo: "X", tipo: "material_cliente" },
  salida: {
    id: 9,
    fecha: new Date("2026-10-01T00:00:00Z"),
    tipo_salida: "uso_interno",
    tecnico_nom: "Luis",
    client_nom: null,
  },
};

describe("informe de materiales", () => {
  it("refuse un export sans période", () => {
    assert.throws(
      () => assertInformeExportPeriod("", "2026-10-21"),
      /Indique el período del informe antes de exportar/,
    );
  });

  it("regroupe les lignes d'une même salida et marque Uso interno", () => {
    const resumen = buildInformeResumen([linea, { ...linea, id: 2, cantidad: 1 }], "uso_interno");
    assert.equal(resumen.salidas_count, 1);
    assert.equal(resumen.salidas_count_label, "Nº usos internos");
    assert.equal(resumen.material_rows[0]?.cantidad_total, 3);
    assert.equal(informeCliente(linea.salida), "Uso interno");
  });

  it("écrit la colonne Tipo material dans l'Excel", async () => {
    const buffer = await buildInformeWorkbook([linea]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.getWorksheet("Informe salidas");
    assert.equal(sheet?.getCell(1, 5).value, "Tipo material");
    assert.equal(sheet?.getCell(2, 5).value, "Materiales de cliente");
    assert.equal(sheet?.getCell(2, 3).value, "Uso interno");
  });
});

describe("ficha técnico", () => {
  const scope = { agenciaId: 10, ciudadId: 100 };

  it("refuse un compte atención al cliente", () => {
    assert.equal(
      tecnicoFichaAccess({ categoria: "atencion_cliente", id_agencia: 10, id_ciudad: 100 }, scope),
      "not_tecnico",
    );
  });

  it("cache un técnico d'une autre agencia", () => {
    assert.equal(
      tecnicoFichaAccess({ categoria: "tecnico", id_agencia: 20, id_ciudad: 100 }, scope),
      "out_of_scope",
    );
  });
});
