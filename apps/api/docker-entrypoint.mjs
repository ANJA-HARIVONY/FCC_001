/**
 * Reconstruit DATABASE_URL depuis DB_HOST / DB_USER / DB_PASSWORD / DB_NAME.
 * Les caractères du mot de passe sont encodés. Rien n'est journalisé.
 * Sans DB_HOST, la DATABASE_URL déjà fournie (compose de développement) est gardée.
 */
import { spawn } from "node:child_process";

const host = (process.env.DB_HOST ?? "").trim();
const name = (process.env.DB_NAME ?? "").trim();
const user = (process.env.DB_USER ?? "").trim();
if (host && name && user) {
  const port = (process.env.DB_PORT ?? "").trim() || "3306";
  const password = process.env.DB_PASSWORD ?? "";
  process.env.DATABASE_URL = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(name)}`;
}

const child = spawn(process.execPath, ["dist/main.js"], { stdio: "inherit", env: process.env });
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
