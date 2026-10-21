import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { MemorySessionStore } from "../src/auth/session-store.ts";
import type { LoginUser } from "../src/auth/login-identifier.ts";

const user: LoginUser = {
  id: 7,
  nom: "Ana",
  telephone: "222",
  email: "ana@fcc.test",
  motDePasseHash: "scrypt:1",
  actif: true,
  role: "usuario",
  idCiudad: 1,
  idAgencia: 2,
  ciudadNombre: "Malabo",
  agenciaNombre: "Afrimal",
  avatarUrl: null,
};

describe("session sur fichier", () => {
  it("relit une session après recréation du store", () => {
    const file = join(mkdtempSync(join(tmpdir(), "fcc-session-")), "sessions.json");
    const now = Date.now();
    const first = new MemorySessionStore(file);
    const created = first.create(user, now);
    const second = new MemorySessionStore(file);
    const read = second.read(created.id, now + 1000);
    assert.equal(read.status, "ok");
    assert.equal(read.session?.nom, "Ana");
    assert.equal(JSON.parse(readFileSync(file, "utf8")).length, 1);
  });

  it("ignore une session déjà expirée à la relecture", () => {
    const file = join(mkdtempSync(join(tmpdir(), "fcc-session-")), "sessions.json");
    const now = Date.now();
    const first = new MemorySessionStore(file);
    const created = first.create(user, now - 31 * 60 * 1000);
    const second = new MemorySessionStore(file);
    assert.equal(second.read(created.id, now).status, "missing");
  });
});
