import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { ensureDatabaseUrl, loadProjectEnv, parseEnvFile } from "../src/config/load-env.ts";
import { redactSecrets } from "../src/logging/redact.ts";

describe("chargement du .env", () => {
  it("ignore les commentaires et ne garde que des clés valides", () => {
    const parsed = parseEnvFile("# secret\nGEMINI_MODEL=gemini-3.6-flash\nexport RADIUS_ENABLED=true\nmauvais\n");
    assert.deepEqual(parsed, { GEMINI_MODEL: "gemini-3.6-flash", RADIUS_ENABLED: "true" });
  });

  it("n'écrase pas l'environnement déjà défini et laisse le dernier fichier gagner", () => {
    const dir = mkdtempSync(join(tmpdir(), "fcc-env-"));
    const root = join(dir, "root.env");
    const api = join(dir, "api.env");
    writeFileSync(root, "GEMINI_MODEL=from-root\nPORT=1\nDB_HOST=db\nDB_PORT=3306\nDB_NAME=fcc\nDB_USER=u\nDB_PASSWORD=p@ss:word\n");
    writeFileSync(api, "PORT=4000\n");
    const env: NodeJS.ProcessEnv = { PORT: "9" };
    loadProjectEnv({ files: [root, api], env });
    assert.equal(env.PORT, "9");
    assert.equal(env.GEMINI_MODEL, "from-root");
    assert.equal(env.DATABASE_URL, "mysql://u:p%40ss%3Aword@db:3306/fcc");
  });

  it("ne reconstruit pas DATABASE_URL si elle existe", () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: "mysql://deja@localhost/fcc",
      DB_HOST: "db",
      DB_NAME: "fcc",
      DB_USER: "u",
    };
    ensureDatabaseUrl(env);
    assert.equal(env.DATABASE_URL, "mysql://deja@localhost/fcc");
  });
});

describe("masquage des secrets d'intégration", () => {
  it("retire mot de passe RADIUS, jeton Bearer et webhook Bitrix", () => {
    const raw = "http://host/sysapi.php?apiuser=u&apipass=secret Bearer abc.def /rest/1/webhooksecret/tasks";
    const clean = redactSecrets(raw);
    assert.equal(clean.includes("secret"), false);
    assert.equal(clean.includes("webhooksecret"), false);
    assert.match(clean, /apipass=\[redacted\]/);
    assert.match(clean, /Bearer \[redacted\]/);
    assert.match(clean, /\/rest\/1\/\[redacted\]/);
  });
});
