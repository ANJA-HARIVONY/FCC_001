import "reflect-metadata";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { SESSION_IDLE_MS } from "@fcc/domain";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import cookieParser from "cookie-parser";
import request from "supertest";

import { AUTH_OPTIONS, AUDIT_WRITER, AuthService, CLOCK, USER_DIRECTORY } from "../dist/auth/auth.service.js";
import { AuthController } from "../dist/auth/auth.controller.js";
import { CsrfGuard, SessionGuard } from "../dist/auth/guards.js";
import type { LoginUser, UserDirectory } from "../src/auth/login-identifier.ts";
import { MemorySessionStore } from "../dist/auth/session-store.js";
import { securityHeaders } from "../dist/security/headers.js";

const WERKZEUG_HASH =
  "scrypt:32768:8:1$I66kzKWsv8qi31BC$eb8230b018e3ffd0f59f185c9453d3981eacdb48b1567f032e88f38aefd928fdaa0f26d7446021557667528c7da76ad879f3d612563ac1bb933049045d80c3b7";

const ana: LoginUser = {
  id: 7,
  nom: "Ana",
  telephone: "222",
  email: "ana@fcc.test",
  motDePasseHash: WERKZEUG_HASH,
  actif: true,
  role: "usuario",
  idCiudad: 1,
  idAgencia: 2,
};

function directory(): UserDirectory {
  return {
    async findByEmail(email) {
      return ana.email === email ? ana : null;
    },
    async findByTelephone() {
      return null;
    },
    async findByNom() {
      return [];
    },
    async listForPhoneCompact() {
      return [ana];
    },
    async touchModified() {},
    async updatePasswordHash() {},
  };
}

describe("HTTP auth", () => {
  let now = 1_000_000;
  const audits: string[] = [];
  let close: () => Promise<void> = async () => {};
  let agent: ReturnType<typeof request.agent>;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        MemorySessionStore,
        { provide: APP_GUARD, useClass: CsrfGuard },
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: USER_DIRECTORY, useValue: directory() },
        {
          provide: AUDIT_WRITER,
          useValue: { async write(action: string) { audits.push(action); } },
        },
        { provide: CLOCK, useValue: { now: () => now } },
        { provide: AUTH_OPTIONS, useValue: { rehash: false } },
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.use(securityHeaders);
    await app.init();
    agent = request.agent(app.getHttpServer());
    close = () => app.close();
  });

  after(async () => {
    await close();
  });

  it("pose le cookie de session et refuse l'inactivité de 30 minutes", async () => {
    const csrf = await agent.get("/api/auth/csrf").expect(200);
    assert.equal(typeof csrf.body.token, "string");
    assert.match(csrf.headers["set-cookie"].join(";"), /fcc_csrf=/);

    await agent.post("/api/auth/login").send({ identifiant: "ana@fcc.test", password: "correct horse" }).expect(403);

    const logged = await agent
      .post("/api/auth/login")
      .set("X-CSRFToken", csrf.body.token)
      .send({ identifiant: "ana@fcc.test", password: "correct horse", next: "/clientes" })
      .expect(200);
    assert.equal(logged.body.ok, true);
    assert.match(logged.headers["set-cookie"].join(";"), /fcc_session=/);
    assert.equal(logged.headers["x-content-type-options"], "nosniff");

    const me = await agent.get("/api/auth/me").expect(200);
    assert.equal(me.body.user.nom, "Ana");
    assert.equal(me.body.user.motDePasseHash, undefined);

    now += SESSION_IDLE_MS;
    const expired = await agent.get("/api/auth/me").expect(401);
    assert.equal(expired.body.error, "Sesión expirada.");
    assert.ok(audits.includes("LOGOUT_IDLE_TIMEOUT"));
  });
});
