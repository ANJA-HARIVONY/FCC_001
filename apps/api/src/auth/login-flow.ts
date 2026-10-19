import type { AuditWriter, AuthOptions, Clock } from "./auth.contracts.ts";
import { compteActif, findForLogin, safeRedirectTarget, type UserDirectory } from "./login-identifier.ts";
import type { MemorySessionStore, SessionRecord } from "./session-store.ts";
import { verifyWerkzeugPassword } from "./werkzeug-password.ts";
import { hashArgon2id } from "./argon2-hash.ts";

export type LoginResult =
  | { ok: true; session: SessionRecord; next: string | null }
  | { ok: false; status: number; error: string };

export async function performLogin(
  input: { identifiant: string; password: string; next: string | null; hostUrl: string; ip?: string },
  deps: {
    users: UserDirectory;
    audit: AuditWriter;
    sessions: MemorySessionStore;
    clock: Clock;
    options: AuthOptions;
  },
): Promise<LoginResult> {
  const ident = input.identifiant.trim();
  if (!ident || !input.password) {
    return { ok: false, status: 400, error: "Introduzca correo o teléfono y contraseña." };
  }
  const user = await findForLogin(ident, deps.users);
  if (!user) {
    return { ok: false, status: 401, error: "Credenciales incorrectas o cuenta desactivada." };
  }
  if (!compteActif(user.actif)) {
    return { ok: false, status: 403, error: "Cuenta desactivada." };
  }
  if (!user.motDePasseHash.trim()) {
    return {
      ok: false,
      status: 403,
      error: "Su cuenta no tiene contraseña asignada; contacte al administrador.",
    };
  }
  const valid = await verifyWerkzeugPassword(user.motDePasseHash, input.password);
  if (!valid) {
    return { ok: false, status: 401, error: "Credenciales incorrectas." };
  }
  const now = deps.clock.now();
  if (deps.options.rehash && !user.motDePasseHash.startsWith("argon2id:")) {
    const nextHash = await hashArgon2id(input.password);
    await deps.users.updatePasswordHash(user.id, nextHash, new Date(now));
  } else {
    await deps.users.touchModified(user.id, new Date(now));
  }
  await deps.audit.write("LOGIN", user.id, undefined, input.ip);
  return {
    ok: true,
    session: deps.sessions.create(user, now),
    next: safeRedirectTarget(input.next, input.hostUrl),
  };
}
