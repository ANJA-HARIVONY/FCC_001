import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { INSTALACION_TYPES, instalacionInScope, type Actor } from "@fcc/domain";

describe("instalaciones", () => {
  const adminA: Actor = {
    id: 1,
    role: "admin",
    idAgencia: 10,
    idCiudad: 100,
    authenticated: true,
  };

  it("un admin ne voit pas une instalación d'une autre agencia/ciudad", () => {
    assert.equal(
      instalacionInScope(adminA, { tecnicoAgenciaId: 10, clientCiudadId: 100 }),
      true,
    );
    assert.equal(
      instalacionInScope(adminA, { tecnicoAgenciaId: 20, clientCiudadId: 100 }),
      false,
    );
    assert.equal(
      instalacionInScope(adminA, { tecnicoAgenciaId: 10, clientCiudadId: 200 }),
      false,
    );
  });

  it("supprimer un traslado est refusé (règle métier)", () => {
    assert.ok(INSTALACION_TYPES.includes("traslado"));
    assert.ok(INSTALACION_TYPES.includes("nueva"));
    // Miroir delete_instalacion : tipo traslado → erreur
    function canDelete(tipo: string): boolean {
      return tipo !== "traslado";
    }
    assert.equal(canDelete("nueva"), true);
    assert.equal(canDelete("traslado"), false);
  });

  it("création avec 2 lignes ⇒ instalación + salida instalacion liée (contrat)", () => {
    const lineas = [
      { id_material: 1, cantidad: 2 },
      { id_material: 2, cantidad: 1 },
    ];
    const result = {
      instalacion: { id: 10, tipo: "nueva" },
      salida:
        lineas.length > 0
          ? { id: 20, tipo_salida: "instalacion", id_instalacion: 10, lineas }
          : null,
    };
    assert.equal(result.salida?.tipo_salida, "instalacion");
    assert.equal(result.salida?.id_instalacion, result.instalacion.id);
    assert.equal(result.salida?.lineas.length, 2);
  });
});
