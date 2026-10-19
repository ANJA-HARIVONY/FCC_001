import { scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Vérifie un hash Werkzeug 3 (`scrypt:N:r:p$sel$hex` ou `pbkdf2:sha256:iter$sel$hex`).
 * Le sel est la chaîne UTF-8 telle quelle, le condensat est hexadécimal sur 64 octets
 * (scrypt) ou la taille du digest (pbkdf2).
 */
export async function verifyWerkzeugPassword(stored: string, password: string): Promise<boolean> {
  if (!stored.trim() || !password) {
    return false;
  }
  const parts = stored.split("$");
  if (parts.length !== 3) {
    return false;
  }
  const [method, salt, hex] = parts;
  if (!method || !salt || !hex || !/^[0-9a-f]+$/i.test(hex)) {
    return false;
  }
  let actual: Buffer;
  try {
    actual = await digest(method, salt, password);
  } catch {
    return false;
  }
  const expected = Buffer.from(hex, "hex");
  if (expected.length === 0 || expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

async function digest(method: string, salt: string, password: string): Promise<Buffer> {
  if (method.startsWith("scrypt")) {
    const [, nRaw, rRaw, pRaw] = method.split(":");
    const N = nRaw ? Number(nRaw) : 2 ** 15;
    const r = rRaw ? Number(rRaw) : 8;
    const p = pRaw ? Number(pRaw) : 1;
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
      throw new Error("paramètres scrypt invalides");
    }
    const maxmem = 132 * N * r * p;
    return scryptSync(password, salt, 64, { N, r, p, maxmem });
  }
  if (method.startsWith("pbkdf2")) {
    const { pbkdf2Sync } = await import("node:crypto");
    const [, hashName, iterRaw] = method.split(":");
    const digestName = hashName || "sha256";
    const iterations = iterRaw ? Number(iterRaw) : 600_000;
    if (!Number.isInteger(iterations) || iterations < 1) {
      throw new Error("paramètres pbkdf2 invalides");
    }
    return pbkdf2Sync(password, salt, iterations, 32, digestName);
  }
  throw new Error("méthode inconnue");
}
