import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CLIENT_CATEGORIES,
  INCIDENT_STATUSES,
  INSTALACION_TYPES,
  ROLES,
  SALIDA_TYPES,
} from "@fcc/domain";

import { diffOrdered } from "../src/parite/compare.ts";

describe("comparaison de listes Flask / Node", () => {
  it("accepte le même ordre", () => {
    const diff = diffOrdered(["7", "4", "2"], ["7", "4", "2"]);
    assert.equal(diff.same, true);
    assert.deepEqual(diff.missing, []);
    assert.deepEqual(diff.extra, []);
  });

  it("signale un ordre différent et une ligne en trop", () => {
    const diff = diffOrdered(["7", "4"], ["4", "7", "9"]);
    assert.equal(diff.same, false);
    assert.deepEqual(diff.missing, []);
    assert.deepEqual(diff.extra, ["9"]);
  });

  it("le jeu de référence n'invente aucun littéral", () => {
    assert.deepEqual([...ROLES], ["usuario", "admin", "superadmin"]);
    assert.deepEqual([...CLIENT_CATEGORIES], ["particular", "corporativo"]);
    assert.deepEqual([...INCIDENT_STATUSES], ["Pendiente", "Solucionadas", "Bitrix"]);
    assert.deepEqual([...SALIDA_TYPES], ["uso_interno", "incidencia", "instalacion"]);
    assert.deepEqual([...INSTALACION_TYPES], ["nueva", "traslado"]);
  });
});
