import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from "@fcc/domain";

import { performLogin } from "../src/auth/login-flow.ts";
import type { LoginUser, UserDirectory } from "../src/auth/login-identifier.ts";
import { safeRedirectTarget } from "../src/auth/login-identifier.ts";
import { MemorySessionStore, csrfMatches } from "../src/auth/session-store.ts";
import { verifyWerkzeugPassword } from "../src/auth/werkzeug-password.ts";
import { redact } from "../src/logging/redact.ts";

const WERKZEUG_HASH =
  "scrypt:32768:8:1$I66kzKWsv8qi31BC$eb8230b018e3ffd0f59f185c9453d3981eacdb48b1567f032e88f38aefd928fdaa0f26d7446021557667528c7da76ad879f3d612563ac1bb933049045d80c3b7";

function user(partial: Partial<LoginUser> = {}): LoginUser {
  return {
    id: 7,
    nom: "Ana Lopez",
    telephone: "222 11 00",
    email: "ana@fcc.test",
    motDePasseHash: WERKZEUG_HASH,
    actif: true,
    role: "usuario",
    idCiudad: 1,
    idAgencia: 2,
    ciudadNombre: "Malabo",
    agenciaNombre: "Afrimal",
    avatarUrl: null,
    ...partial,
  };
}

function directory(rows: LoginUser[]): UserDirectory & { touched: number; rehashed: string | null } {
  return {
    touched: 0,
    rehashed: null,
    async findByEmail(email) {
      return rows.find((row) => row.email?.toLowerCase() === email) ?? null;
    },
    async findByTelephone(telephone) {
      return rows.find((row) => row.telephone === telephone) ?? null;
    },
    async findByNom(nom) {
      return rows.filter((row) => row.nom.toLowerCase() === nom);
    },
    async listForPhoneCompact() {
      return rows;
    },
    async touchModified() {
      this.touched += 1;
    },
    async updatePasswordHash(_id, hash) {
      this.rehashed = hash;
    },
  };
}

describe("werkzeug", () => {
  it("accepte le hash scrypt généré par Werkzeug 3 et refuse le mauvais mot de passe", async () => {
    assert.equal(await verifyWerkzeugPassword(WERKZEUG_HASH, "correct horse"), true);
    assert.equal(await verifyWerkzeugPassword(WERKZEUG_HASH, "autre"), false);
    assert.equal(await verifyWerkzeugPassword("", "correct horse"), false);
  });
});

describe("login", () => {
  it("connecte par email, refuse un compte inactif et un hash vide", async () => {
    const dir = directory([user(), user({ id: 8, email: "off@fcc.test", actif: false }), user({ id: 9, email: "vide@fcc.test", motDePasseHash: "" })]);
    const sessions = new MemorySessionStore();
    const audits: string[] = [];
    const ok = await performLogin(
      { identifiant: "ANA@fcc.test", password: "correct horse", next: "/clientes", hostUrl: "http://localhost:4000/" },
      { users: dir, sessions, clock: { now: () => 10 }, options: { rehash: false }, audit: { async write(action) { audits.push(action); } } },
    );
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.next, "/clientes");
      assert.equal(ok.session.userId, 7);
    }
    assert.deepEqual(audits, ["LOGIN"]);
    assert.equal(dir.touched, 1);
    assert.equal(dir.rehashed, null);

    const off = await performLogin(
      { identifiant: "off@fcc.test", password: "correct horse", next: null, hostUrl: "http://localhost:4000/" },
      { users: dir, sessions, clock: { now: () => 10 }, options: { rehash: false }, audit: { async write() {} } },
    );
    assert.equal(off.ok, false);
    if (!off.ok) {
      assert.equal(off.error, "Cuenta desactivada.");
    }

    const empty = await performLogin(
      { identifiant: "vide@fcc.test", password: "correct horse", next: null, hostUrl: "http://localhost:4000/" },
      { users: dir, sessions, clock: { now: () => 10 }, options: { rehash: false }, audit: { async write() {} } },
    );
    assert.equal(empty.ok, false);
    if (!empty.ok) {
      assert.match(empty.error, /administrador/);
    }
  });

  it("retrouve un téléphone compacté et ignore un nom ambigu", async () => {
    const dir = directory([
      user({ id: 1, nom: "Meme", email: null }),
      user({ id: 2, nom: "Meme", email: "autre@fcc.test", telephone: "600-10" }),
    ]);
    const found = await dir.findByNom("meme");
    assert.equal(found.length, 2);
    const sessions = new MemorySessionStore();
    const byPhone = await performLogin(
      { identifiant: "600 10", password: "correct horse", next: "https://evil.test/x", hostUrl: "http://localhost:4000/" },
      { users: dir, sessions, clock: { now: () => 1 }, options: { rehash: false }, audit: { async write() {} } },
    );
    assert.equal(byPhone.ok, true);
    if (byPhone.ok) {
      assert.equal(byPhone.session.userId, 2);
      assert.equal(byPhone.next, null);
    }
  });

  it("réécrit en Argon2id seulement si PASSWORD_REHASH est actif", async () => {
    const dir = directory([user()]);
    const sessions = new MemorySessionStore();
    await performLogin(
      { identifiant: "ana@fcc.test", password: "correct horse", next: null, hostUrl: "http://localhost:4000/" },
      { users: dir, sessions, clock: { now: () => 1 }, options: { rehash: true }, audit: { async write() {} } },
    );
    assert.equal(dir.touched, 0);
    assert.equal(dir.rehashed?.startsWith("argon2id:"), true);
  });
});

describe("session", () => {
  it("expire après 30 minutes d'inactivité et après 12 heures", () => {
    const store = new MemorySessionStore();
    const record = store.create(user(), 0);
    assert.equal(store.read(record.id, SESSION_IDLE_MS - 1).status, "ok");
    assert.equal(store.read(record.id, SESSION_IDLE_MS).status, "idle");
    store.touch(record.id, SESSION_IDLE_MS);
    assert.equal(store.read(record.id, SESSION_ABSOLUTE_MS).status, "absolute");
  });

  it("compare le jeton CSRF sans accepter une longueur différente", () => {
    assert.equal(csrfMatches("abcd", "abcd"), true);
    assert.equal(csrfMatches("abcd", "abce"), false);
    assert.equal(csrfMatches("abcd", "abc"), false);
  });
});

describe("redaction et redirection", () => {
  it("masque le mot de passe et l'URI MySQL", () => {
    const value = redact({ password: "secret", nested: { cookie: "a=b" }, note: "mysql://user:pass@db/fcc" });
    assert.deepEqual(value, {
      password: "[redacted]",
      nested: { cookie: "[redacted]" },
      note: "mysql://[redacted]@db/fcc",
    });
  });

  it("refuse un next hors hôte", () => {
    assert.equal(safeRedirectTarget("/clientes", "http://localhost:4000/"), "/clientes");
    assert.equal(safeRedirectTarget("https://evil.test/x", "http://localhost:4000/"), null);
    assert.equal(safeRedirectTarget("//evil.test/x", "http://localhost:4000/"), null);
  });
});
