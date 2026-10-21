import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampListPerPage,
  iterPages,
  canAccessClient,
  canDeleteIncident,
  canModifyIncident,
  clientInMovementCiudad,
  apreciacionVisible,
  apreciacionWriteScope,
  etatVisible,
  incidentVisible,
  instalacionInScope,
  navForRole,
  normalizeClientCategory,
  normalizeRefBitrix,
  normalizeRole,
  salidaInScope,
  seesAllMovements,
  type Actor,
} from "../src/index.ts";

const adminA: Actor = { id: 1, role: "admin", idAgencia: 10, idCiudad: 100, authenticated: true };
const adminB: Actor = { id: 2, role: "admin", idAgencia: 20, idCiudad: 200, authenticated: true };
const usuarioA: Actor = { id: 3, role: "usuario", idAgencia: 10, idCiudad: 100, authenticated: true };
const superadmin: Actor = { id: 4, role: "superadmin", idAgencia: 10, idCiudad: 100, authenticated: true };

const incidentA = { creatorId: 3, creatorAgenciaId: 10, clientCiudadId: 100 };
const incidentB = { creatorId: 9, creatorAgenciaId: 20, clientCiudadId: 200 };

describe("normalisation", () => {
  it("refuse un statut ou un rôle inventé", () => {
    assert.equal(normalizeRole("owner"), "usuario");
    assert.equal(normalizeClientCategory("residencial"), "particular");
  });

  it("efface ref_bitrix hors Bitrix ou au-delà de 10 chiffres", () => {
    assert.equal(normalizeRefBitrix("Pendiente", "123"), null);
    assert.equal(normalizeRefBitrix("Bitrix", "12345678901"), null);
    assert.equal(normalizeRefBitrix("Bitrix", "0042"), "0042");
  });
});

describe("visibilité incidencias", () => {
  it("le superadmin voit une incidencia d'une autre agencia", () => {
    assert.equal(seesAllMovements(superadmin), true);
    assert.equal(seesAllMovements(adminA), false);
    assert.equal(incidentVisible(superadmin, incidentB), true);
  });

  it("l'admin ne voit pas l'agencia ni la ciudad d'un autre", () => {
    assert.equal(incidentVisible(adminA, incidentA), true);
    assert.equal(incidentVisible(adminA, incidentB), false);
    assert.equal(incidentVisible(adminA, { ...incidentA, clientCiudadId: 200 }), false);
    assert.equal(incidentVisible(usuarioA, incidentB), false);
  });

  it("modifier suit la consultation, supprimer suit créateur ou admin", () => {
    assert.equal(canModifyIncident(usuarioA, incidentA), true);
    assert.equal(canModifyIncident(usuarioA, incidentB), false);
    assert.equal(canDeleteIncident(usuarioA, incidentA), true);
    assert.equal(canDeleteIncident(usuarioA, incidentB), false);
    assert.equal(canDeleteIncident(adminB, incidentA), true);
  });
});

describe("clients, salidas, instalaciones", () => {
  it("le client est partagé, le mouvement reste dans la ciudad", () => {
    assert.equal(canAccessClient(usuarioA, { id: 1 }), true);
    assert.equal(canAccessClient(adminB, { id: 1 }), true);
    assert.equal(clientInMovementCiudad(adminA, { idCiudad: 100 }), true);
    assert.equal(clientInMovementCiudad(adminA, { idCiudad: 200 }), false);
    assert.equal(clientInMovementCiudad(superadmin, { idCiudad: 200 }), true);
  });

  it("une salida uso_interno suit la ciudad du técnico", () => {
    const scope = { agenciaId: 10, ciudadId: 100 };
    assert.equal(
      salidaInScope(scope, { tecnicoAgenciaId: 10, tecnicoCiudadId: 100, clientCiudadId: null }),
      true,
    );
    assert.equal(
      salidaInScope(scope, { tecnicoAgenciaId: 10, tecnicoCiudadId: 200, clientCiudadId: null }),
      false,
    );
    assert.equal(
      salidaInScope(scope, { tecnicoAgenciaId: 20, tecnicoCiudadId: 100, clientCiudadId: 100 }),
      false,
    );
  });

  it("une installation est scopée agencia du técnico et ciudad du client", () => {
    assert.equal(instalacionInScope(adminA, { tecnicoAgenciaId: 10, clientCiudadId: 100 }), true);
    assert.equal(instalacionInScope(adminA, { tecnicoAgenciaId: 20, clientCiudadId: 100 }), false);
    assert.equal(instalacionInScope(superadmin, { tecnicoAgenciaId: 20, clientCiudadId: 200 }), true);
  });
});

describe("apreciaciones et informes", () => {
  it("une note sans périmètre n'est visible que du superadmin", () => {
    const row = { idCiudad: null, idAgencia: null };
    assert.equal(apreciacionVisible(adminA, row), false);
    assert.equal(apreciacionVisible(superadmin, row), true);
    assert.equal(apreciacionVisible(adminA, { idCiudad: 100, idAgencia: 10 }), true);
    assert.equal(apreciacionVisible(adminA, { idCiudad: 200, idAgencia: 20 }), false);
  });

  it("le superadmin écrit sur la paire filtrée seulement si elle est cohérente", () => {
    assert.deepEqual(apreciacionWriteScope(adminA, { ciudadId: 200, agenciaId: 20, agenciaCiudadId: 200 }), {
      idCiudad: 100,
      idAgencia: 10,
    });
    assert.deepEqual(
      apreciacionWriteScope(superadmin, { ciudadId: 200, agenciaId: 20, agenciaCiudadId: 200 }),
      { idCiudad: 200, idAgencia: 20 },
    );
    assert.deepEqual(
      apreciacionWriteScope(superadmin, { ciudadId: 200, agenciaId: 20, agenciaCiudadId: 100 }),
      { idCiudad: 100, idAgencia: 10 },
    );
  });

  it("l'informe filtre la chaîne agence_id avec l'espace du Flask", () => {
    assert.equal(etatVisible(adminA, '{"agence_id": 10}'), true);
    assert.equal(etatVisible(adminA, '{"agence_id": 20}'), false);
    assert.equal(etatVisible(adminA, '{"agence_id":10}'), false);
    assert.equal(etatVisible(superadmin, "{}"), true);
    // contains() du Flask : l'agencia 10 matche aussi "agence_id": 100.
    assert.equal(etatVisible(adminA, '{"agence_id": 100}'), true);
  });
});

describe("pagination et menus", () => {
  it("clamp_list_per_page retombe sur 50", () => {
    assert.equal(clampListPerPage("100"), 100);
    assert.equal(clampListPerPage("75"), 50);
    assert.equal(clampListPerPage(null), 50);
  });

  it("iter_pages reprend la fenêtre Flask", () => {
    assert.deepEqual(iterPages(1, 1), [1]);
    assert.deepEqual(iterPages(1, 109), [1, 2, null, 109]);
    assert.deepEqual(iterPages(5, 109), [1, null, 4, 5, 6, null, 109]);
    assert.deepEqual(iterPages(108, 109), [1, null, 107, 108, 109]);
    assert.deepEqual(iterPages(2, 3), [1, 2, 3]);
  });

  it("la sidebar suit le rôle et n'affiche pas Operadores", () => {
    assert.deepEqual(navForRole("usuario"), [
      "Dashboard",
      "Incidencias",
      "Clientes",
      "Informes",
      "Perfil",
      "Ayuda",
      "Salir",
    ]);
    assert.ok(navForRole("admin").includes("Materiales"));
    assert.ok(navForRole("admin").includes("Instalaciones"));
    assert.equal(navForRole("admin").includes("Usuarios"), false);
    assert.ok(navForRole("superadmin").includes("Trazabilidad"));
    assert.equal((navForRole("superadmin") as readonly string[]).includes("Operadores"), false);
  });
});
