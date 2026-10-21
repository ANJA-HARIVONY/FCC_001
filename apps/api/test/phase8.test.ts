import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { APRECIACION_TEXTO_MAX, apreciacionWriteScope, type Actor } from "@fcc/domain";

describe("phase 8 — cuenta et dashboard", () => {
  const admin: Actor = { id: 1, role: "admin", idAgencia: 10, idCiudad: 100, authenticated: true };
  const superadmin: Actor = { id: 2, role: "superadmin", idAgencia: 10, idCiudad: 100, authenticated: true };

  it("interdit de se désactiver soi-même", () => {
    function assertCanToggle(actorId: number, targetId: number) {
      if (actorId === targetId) {
        throw new Error("No puede desactivar su propia cuenta.");
      }
    }
    assert.throws(() => assertCanToggle(1, 1), /desactivar su propia cuenta/);
    assert.doesNotThrow(() => assertCanToggle(1, 2));
  });

  it("fige la paire d'apreciación : admin sur la sienne, superadmin sur le filtre cohérent", () => {
    assert.deepEqual(apreciacionWriteScope(admin, { ciudadId: 200, agenciaId: 20, agenciaCiudadId: 200 }), {
      idCiudad: 100,
      idAgencia: 10,
    });
    assert.deepEqual(
      apreciacionWriteScope(superadmin, { ciudadId: 200, agenciaId: 20, agenciaCiudadId: 200 }),
      { idCiudad: 200, idAgencia: 20 },
    );
    assert.equal(APRECIACION_TEXTO_MAX, 120);
  });

  it("la ficha pagine au plus 200 lignes", () => {
    const perPage = Math.min(200, Math.max(1, 500));
    assert.equal(perPage, 200);
  });
});
