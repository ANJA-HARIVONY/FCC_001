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
  "gemini_api_key",
  "radius_api_pass",
  "apipass",
  "bitrix24_api",
  "zabbix_api_password",
  "zabbix_api_key",
  "odoo_api_password",
  "odoo_api_key",
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
  if (typeof value === "string") {
    return redactSecrets(value);
  }
  return value;
}

/** Retire jetons, mots de passe d'URL et webhooks avant d'afficher une erreur. */
export function redactSecrets(text: string): string {
  return text
    .replace(/mysql:\/\/[^@\s]+@/gi, "mysql://[redacted]@")
    .replace(/([?&](?:key|apipass|apiuser|password|token)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(\/rest\/\d+\/)[^/\s?]+/gi, "$1[redacted]");
}
