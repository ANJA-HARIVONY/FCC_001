/**
 * Charge le `.env` du dépôt, puis `apps/api/.env`.
 * Une variable déjà présente dans l'environnement (shell, Docker) n'est pas écrasée.
 * Les valeurs ne sont jamais journalisées.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function defaultEnvFiles(here = dirname(fileURLToPath(import.meta.url))): string[] {
  let repoRoot = here;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(resolve(repoRoot, "apps/api/package.json")) && existsSync(resolve(repoRoot, "package.json"))) {
      break;
    }
    repoRoot = resolve(repoRoot, "..");
  }
  return [resolve(repoRoot, ".env"), resolve(repoRoot, "apps/api/.env")];
}

export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const body = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = body.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = body.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }
    let value = body.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function ensureDatabaseUrl(env: NodeJS.ProcessEnv): void {
  if ((env.DATABASE_URL ?? "").trim()) {
    return;
  }
  const host = (env.DB_HOST ?? "").trim();
  const name = (env.DB_NAME ?? "").trim();
  const user = (env.DB_USER ?? "").trim();
  if (!host || !name || !user) {
    return;
  }
  const port = (env.DB_PORT ?? "").trim() || "3306";
  const password = env.DB_PASSWORD ?? "";
  env.DATABASE_URL = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(name)}`;
}

/** Applique les fichiers donnés. Le dernier fichier gagne ; l'environnement déjà défini gagne toujours. */
export function loadProjectEnv(
  options: { files?: string[]; env?: NodeJS.ProcessEnv; synthesizeDatabaseUrl?: boolean } = {},
): string[] {
  const env = options.env ?? process.env;
  const fromFiles: Record<string, string> = {};
  const loaded: string[] = [];
  for (const file of options.files ?? defaultEnvFiles()) {
    if (!existsSync(file)) {
      continue;
    }
    Object.assign(fromFiles, parseEnvFile(readFileSync(file, "utf8")));
    loaded.push(file);
  }
  for (const [key, value] of Object.entries(fromFiles)) {
    if (env[key] === undefined) {
      env[key] = value;
    }
  }
  if (options.synthesizeDatabaseUrl !== false) {
    ensureDatabaseUrl(env);
  }
  return loaded;
}
