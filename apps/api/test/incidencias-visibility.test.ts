import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAccessIncident,
  canDeleteIncident,
  canModifyIncident,
  clientInMovementCiudad,
  incidentVisible,
  type Actor,
  type IncidentAccess,
} from "@fcc/domain";

/**
 * Critère phase 4 : un admin de l'agencia A ne voit pas une incidencia
 * créée dans l'agencia B (règle 10.4), même client si ciudad différente.
 */
describe("visibilité incidencias 10.4", () => {
  const adminA: Actor = {
    id: 1,
    role: "admin",
    idAgencia: 10,
    idCiudad: 100,
    authenticated: true,
  };
  const adminB: Actor = {
    id: 2,
    role: "admin",
    idAgencia: 20,
    idCiudad: 100,
    authenticated: true,
  };
  const usuarioA: Actor = { ...adminA, id: 3, role: "usuario" };
  const superadmin: Actor = {
    id: 99,
    role: "superadmin",
    idAgencia: 10,
    idCiudad: 100,
    authenticated: true,
  };

  const incidentA: IncidentAccess = {
    creatorId: 3,
    creatorAgenciaId: 10,
    clientCiudadId: 100,
  };
  const incidentB: IncidentAccess = {
    creatorId: 4,
    creatorAgenciaId: 20,
    clientCiudadId: 100,
  };
  const incidentAutreCiudad: IncidentAccess = {
    creatorId: 3,
    creatorAgenciaId: 10,
    clientCiudadId: 200,
  };

  it("l'admin A ne voit pas l'incidencia de l'agencia B", () => {
    assert.equal(incidentVisible(adminA, incidentA), true);
    assert.equal(incidentVisible(adminA, incidentB), false);
    assert.equal(canAccessIncident(adminA, incidentB), false);
    assert.equal(canModifyIncident(adminA, incidentB), false);
  });

  it("même créateur agencia A, client d'une autre ciudad : invisible", () => {
    assert.equal(incidentVisible(adminA, incidentAutreCiudad), false);
    assert.equal(incidentVisible(usuarioA, incidentAutreCiudad), false);
  });

  it("le superadmin voit tout ; la suppression admin ignore l'agencia", () => {
    assert.equal(incidentVisible(superadmin, incidentB), true);
    assert.equal(canDeleteIncident(adminB, incidentA), true);
    assert.equal(canDeleteIncident(usuarioA, incidentB), false);
    assert.equal(canDeleteIncident(usuarioA, incidentA), true);
  });

  it("création : client hors ciudad refusé pour admin et usuario", () => {
    assert.equal(clientInMovementCiudad(adminA, { idCiudad: 100 }), true);
    assert.equal(clientInMovementCiudad(adminA, { idCiudad: 200 }), false);
    assert.equal(clientInMovementCiudad(superadmin, { idCiudad: 200 }), true);
  });
});
