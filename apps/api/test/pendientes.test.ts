import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Actor } from "@fcc/domain";

import { pendienteCutoff, selectPendientes, type PendienteSource } from "../src/incidencias/pendientes.ts";

const admin: Actor = {
  id: 1,
  role: "admin",
  idAgencia: 10,
  idCiudad: 100,
  authenticated: true,
};

function row(minutesAgo: number, agencia = 10, ciudad = 100): PendienteSource {
  return {
    id: minutesAgo,
    intitule: "Corte",
    date_heure: new Date(Date.now() - minutesAgo * 60_000),
    client_nom: "Ana",
    client_ville: "Malabo",
    operateur_nom: "Luis",
    creatorAgenciaId: agencia,
    clientCiudadId: ciudad,
  };
}

describe("incidencias pendientes > 30 min", () => {
  it("excluye una incidencia de hace 10 minutos", () => {
    const now = new Date();
    const selected = selectPendientes([row(10), row(31)], admin, now);
    assert.equal(selected.some((item) => item.id === 10), false);
    assert.equal(selected.some((item) => item.id === 31), true);
    assert.ok(row(10).date_heure.getTime() > pendienteCutoff(now).getTime());
  });

  it("un admin no ve la incidencia de otra agencia ni de otra ciudad", () => {
    const now = new Date();
    const selected = selectPendientes([row(40, 20, 100), row(40, 10, 200), row(40)], admin, now);
    assert.deepEqual(selected.map((item) => item.id), [40]);
  });
});
