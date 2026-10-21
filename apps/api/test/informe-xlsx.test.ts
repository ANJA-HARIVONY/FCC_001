import assert from "node:assert/strict";
import { describe, it } from "node:test";

import ExcelJS from "exceljs";

import { buildEtatWorkbook } from "../src/informes/export-xlsx.ts";

describe("excel de un informe generado", () => {
  it("abre las hojas Resumen y Datos", async () => {
    const buffer = await buildEtatWorkbook({
      id: 4,
      titre: "Octubre",
      type_etat: "summary",
      statut: "generated",
      periode_debut: new Date("2026-10-01T00:00:00"),
      periode_fin: new Date("2026-10-31T00:00:00"),
      date_creation: new Date("2026-10-20T10:00:00"),
      contenu: {
        kpis_cles: { TOTAL_INCIDENTES: 3 },
        resume_executif: "Mes estable",
        points_positifs: ["Cobertura"],
        points_attention: [],
        recommandations: [],
      },
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    assert.deepEqual(
      wb.worksheets.map((sheet) => sheet.name),
      ["Resumen", "Datos"],
    );
    assert.equal(wb.getWorksheet("Resumen")?.getCell(1, 1).value, "Campo");
    assert.equal(wb.getWorksheet("Resumen")?.getCell(1, 2).value, "Valor");
  });
});
