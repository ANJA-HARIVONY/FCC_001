import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildStatusDelayRows, parseFichaFilters, type DelayHistorial, type DelayIncident } from "../src/cuenta/ficha-retraso.ts";

function incident(created: Date): DelayIncident {
  return {
    id: 7,
    intitule: "Sin señal",
    date_heure: created,
    observations: "",
    ref_bitrix: "12",
    client: { nom: "Ana", ville: "Malabo", categoria: "particular" },
  };
}

describe("retrasos ficha atención al cliente", () => {
  const created = new Date("2026-10-01T08:00:00");
  const bitrixAt = new Date("2026-10-19T09:00:00");
  const solvedAt = new Date("2026-10-19T09:10:00");

  it("Bitrix → Solucionadas 10 min después de entrar en Bitrix no cuenta, aunque el alta sea de ayer", () => {
    const history: DelayHistorial[] = [
      { id: 1, id_incident: 7, estado_anterior: null, estado_nuevo: "Bitrix", cambiado_en: bitrixAt, ref_bitrix: "12" },
      {
        id: 2,
        id_incident: 7,
        estado_anterior: "Bitrix",
        estado_nuevo: "Solucionadas",
        cambiado_en: solvedAt,
        ref_bitrix: "12",
      },
    ];
    const filters = parseFichaFilters({ date_from: "2026-10-01", date_to: "2026-10-31", umbral: "30" });
    const { rows } = buildStatusDelayRows(history, [incident(created)], history, [], filters);
    assert.equal(rows.some((row) => row.historial_id === 2), false);
    assert.equal(rows.some((row) => row.historial_id === 1), true);
  });

  it("una transición no permitida se ignora", () => {
    const history: DelayHistorial[] = [
      {
        id: 3,
        id_incident: 7,
        estado_anterior: "Solucionadas",
        estado_nuevo: "Bitrix",
        cambiado_en: solvedAt,
        ref_bitrix: null,
      },
    ];
    const filters = parseFichaFilters({ date_from: "2026-10-01", date_to: "2026-10-31", umbral: "1" });
    const { rows, kpis } = buildStatusDelayRows(history, [incident(created)], history, [], filters);
    assert.equal(rows.length, 0);
    assert.equal(kpis.total, 0);
  });
});
