import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SALIDA_TYPES_MODAL, movementScope, salidaInScope, type Actor } from "@fcc/domain";

describe("materiales — scope salidas et modale", () => {
  const adminA: Actor = {
    id: 1,
    role: "admin",
    idAgencia: 10,
    idCiudad: 100,
    authenticated: true,
  };

  it("la modale Nueva salida n'offre pas instalacion", () => {
    assert.deepEqual([...SALIDA_TYPES_MODAL], ["uso_interno", "incidencia"]);
    assert.equal(SALIDA_TYPES_MODAL.includes("instalacion" as never), false);
  });

  it("un admin ne voit pas les salidas d'une autre ville", () => {
    const scope = movementScope(adminA);
    assert.equal(
      salidaInScope(scope, {
        tecnicoAgenciaId: 10,
        tecnicoCiudadId: 100,
        clientCiudadId: 100,
      }),
      true,
    );
    assert.equal(
      salidaInScope(scope, {
        tecnicoAgenciaId: 10,
        tecnicoCiudadId: 200,
        clientCiudadId: null,
      }),
      false,
    );
    assert.equal(
      salidaInScope(scope, {
        tecnicoAgenciaId: 10,
        tecnicoCiudadId: 100,
        clientCiudadId: 200,
      }),
      false,
    );
  });
});
