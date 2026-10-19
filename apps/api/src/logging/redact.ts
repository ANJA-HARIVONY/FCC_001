const REDACTED = "[redacted]";
const SECRET_KEYS = new Set([
  "password",
  "password2",
  "mot_de_passe_hash",
  "motDePasseHash",
  "authorization",
  "cookie",
  "database_url",
  "databaseurl",
]);

/** Retire mots de passe, cookies et URI de connexion avant journalisation. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = SECRET_KEYS.has(key.toLowerCase()) ? REDACTED : redact(item);
    }
    return out;
  }
  if (typeof value === "string" && /mysql:\/\/[^@\s]+@/i.test(value)) {
    return value.replace(/mysql:\/\/[^@\s]+@/i, "mysql://[redacted]@");
  }
  return value;
}
