import { hash, Algorithm } from "@node-rs/argon2";

/** Hash Argon2id préfixé pour le distinguer des hash Werkzeug. */
export async function hashArgon2id(password: string): Promise<string> {
  const encoded = await hash(password, { algorithm: Algorithm.Argon2id });
  return encoded.startsWith("argon2id:") ? encoded : `argon2id:${encoded}`;
}
