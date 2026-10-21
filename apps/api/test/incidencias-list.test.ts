import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyBitrixCache,
  buildBitrixExtras,
  formatRetraso,
  normalizeBitrixStatusFilter,
  shouldFetchBitrix,
  type BitrixTaskInfo,
} from "../src/incidencias/bitrix.ts";
import { INCIDENT_EXPORT_COLUMNS, incidentExportRow } from "../src/incidencias/export-xlsx.ts";

const info: BitrixTaskInfo = {
  task_status: "3",
  status_label: "En curso",
  status_emoji: "🔄",
  responsible_name: "Ana",
  title: "Fibra",
  priority: "2",
  deadline: null,
  created_date: null,
  closed_date: null,
  changed_date: new Date("2026-10-20T10:00:00Z"),
};

describe("liste incidencias", () => {
  it("le sous-filtre Bitrix n'accepte que les codes connus", () => {
    assert.equal(normalizeBitrixStatusFilter("Pendiente", "3"), "");
    assert.equal(normalizeBitrixStatusFilter("Bitrix", "3"), "3");
    assert.equal(normalizeBitrixStatusFilter("Bitrix", "_none"), "_none");
    assert.equal(normalizeBitrixStatusFilter("Bitrix", "99"), "");
  });

  it("le cache frais ou verrouillé ne rappelle pas Bitrix", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    const base = {
      status: "Bitrix",
      ref_bitrix: "12345",
      bitrix_fetch_locked: false,
      bitrix_fetched_at: new Date("2026-10-20T11:55:00Z"),
      bitrix_task_status: "3",
    };
    assert.equal(shouldFetchBitrix(base, { now, apiEnabled: true, ttlSeconds: 600 }), false);
    assert.equal(
      shouldFetchBitrix(
        { ...base, bitrix_fetched_at: new Date("2026-10-20T11:00:00Z") },
        { now, apiEnabled: true, ttlSeconds: 600 },
      ),
      true,
    );
    assert.equal(
      shouldFetchBitrix({ ...base, bitrix_fetch_locked: true, bitrix_task_status: "5" }, { now, apiEnabled: true, force: false }),
      false,
    );
    assert.equal(shouldFetchBitrix({ ...base, bitrix_fetched_at: null, bitrix_task_status: null }, { apiEnabled: false }), false);
  });

  it("le statut 5 verrouille le cache et le premier fetch ne marque pas Movida", () => {
    const fresh = applyBitrixCache(null, { ...info, task_status: "5" }, new Date("2026-10-20T12:00:00Z"));
    assert.equal(fresh.bitrix_fetch_locked, true);
    assert.equal("bitrix_moved_at" in fresh, false);
    const moved = applyBitrixCache(new Date("2026-10-19T10:00:00Z"), info, new Date("2026-10-20T12:00:00Z"));
    assert.ok(moved.bitrix_moved_at);
  });

  it("la ficha calcule le retard, la priorité et Movida", () => {
    assert.equal(formatRetraso(45), "45 min");
    assert.equal(formatRetraso(120), "2 h");
    assert.equal(formatRetraso(90), "1 h 30 min");
    const now = new Date("2026-10-20T12:00:00Z");
    const extras = buildBitrixExtras(
      {
        bitrix_task_status: "3",
        bitrix_priority: "2",
        bitrix_deadline: new Date("2026-10-20T10:00:00Z"),
        bitrix_created_at: new Date("2026-10-19T08:00:00Z"),
        bitrix_closed_at: null,
        bitrix_changed_at: new Date("2026-10-20T11:00:00Z"),
        bitrix_moved_at: new Date("2026-10-20T11:30:00Z"),
      },
      now,
    );
    assert.equal(extras?.is_overdue, true);
    assert.equal(extras?.plazo_label, "2 h");
    assert.equal(extras?.priority_label, "Alta");
    assert.equal(extras?.status_icon, "fa-spinner");
    assert.equal(extras?.moved_recently, true);
    assert.equal(extras?.show_plazo, true);
    const closed = buildBitrixExtras(
      {
        bitrix_task_status: "5",
        bitrix_priority: null,
        bitrix_deadline: new Date("2026-10-20T10:00:00Z"),
        bitrix_created_at: null,
        bitrix_closed_at: new Date("2026-10-20T11:00:00Z"),
        bitrix_changed_at: null,
        bitrix_moved_at: null,
      },
      now,
    );
    assert.equal(closed?.is_closed, true);
    assert.equal(closed?.show_plazo, false);
    assert.equal(
      buildBitrixExtras({
        bitrix_task_status: null,
        bitrix_priority: null,
        bitrix_deadline: null,
        bitrix_created_at: null,
        bitrix_closed_at: null,
        bitrix_changed_at: null,
        bitrix_moved_at: null,
      }),
      null,
    );
  });

  it("l'Excel de la page reprend les neuf colonnes Flask", () => {
    assert.deepEqual(INCIDENT_EXPORT_COLUMNS, [
      "ID",
      "Tipo cliente",
      "Cliente",
      "Dirección",
      "Asunto",
      "Estado",
      "Ref. Bitrix",
      "Usuario",
      "Fecha/Hora",
    ]);
    const row = incidentExportRow({
      id: 7,
      intitule: "Sin señal",
      status: "Bitrix",
      ref_bitrix: "998877",
      date_heure: "2026-10-20T08:05:00.000Z",
      client: { nom: "Acme", adresse: "Calle 1", categoria: "corporativo" },
      operateur: { nom: "Luis" },
    });
    assert.equal(row[0], 7);
    assert.equal(row[1], "Corporativo");
    assert.equal(row[2], "Acme");
    assert.equal(row[6], "998877");
    assert.equal(row[7], "Luis");
    assert.match(String(row[8]), /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });
});
