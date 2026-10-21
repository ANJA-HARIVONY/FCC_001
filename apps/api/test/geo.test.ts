import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSuperadmin } from "@fcc/domain";

import type { SessionRecord } from "../src/auth/session-store.ts";

/** Miroir de GeoService.listAgencias sans Prisma. */
function filterAgencias(
  ciudadId: number,
  user: Pick<SessionRecord, "role" | "idCiudad" | "idAgencia">,
  all: { id: number; id_ciudad: number; nombre: string }[],
) {
  if (!isSuperadmin(user.role)) {
    if (ciudadId !== user.idCiudad) {
      return [];
    }
    return all.filter((row) => row.id === user.idAgencia);
  }
  return all.filter((row) => row.id_ciudad === ciudadId);
}

describe("agencias par ciudad", () => {
  const rows = [
    { id: 1, id_ciudad: 10, nombre: "Afrimal" },
    { id: 2, id_ciudad: 10, nombre: "Malabo II" },
    { id: 3, id_ciudad: 20, nombre: "Cocoteros" },
  ];

  it("un admin ne voit que son agencia dans sa ciudad", () => {
    const admin = { role: "admin", idCiudad: 10, idAgencia: 1 };
    assert.deepEqual(filterAgencias(10, admin, rows), [rows[0]]);
    assert.deepEqual(filterAgencias(20, admin, rows), []);
  });

  it("le superadmin voit toutes les agencias de la ciudad", () => {
    const superadmin = { role: "superadmin", idCiudad: 10, idAgencia: 1 };
    assert.equal(filterAgencias(10, superadmin, rows).length, 2);
    assert.equal(filterAgencias(20, superadmin, rows).length, 1);
  });
});
