export interface LoginUser {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  motDePasseHash: string;
  actif: boolean | null;
  role: string;
  idCiudad: number;
  idAgencia: number;
}

export interface UserDirectory {
  findByEmail(email: string): Promise<LoginUser | null>;
  findByTelephone(telephone: string): Promise<LoginUser | null>;
  findByNom(nom: string): Promise<LoginUser[]>;
  listForPhoneCompact(): Promise<LoginUser[]>;
  touchModified(id: number, at: Date): Promise<void>;
  updatePasswordHash(id: number, hash: string, at: Date): Promise<void>;
}

/** NULL ou true = actif. Seul false désactive. */
export function compteActif(actif: boolean | null): boolean {
  if (actif === null) {
    return true;
  }
  return actif;
}

function compactPhone(value: string): string {
  return value.replace(/[\s-]+/g, "");
}

/**
 * Email insensible à la casse, téléphone exact, nom unique, puis téléphone compacté.
 * Même ordre que `_find_operateur_for_login`.
 */
export async function findForLogin(identRaw: string, directory: UserDirectory): Promise<LoginUser | null> {
  const ident = identRaw.trim();
  if (!ident) {
    return null;
  }
  const byEmail = await directory.findByEmail(ident.toLowerCase());
  if (byEmail) {
    return byEmail;
  }
  const byPhone = await directory.findByTelephone(ident);
  if (byPhone) {
    return byPhone;
  }
  const byNom = await directory.findByNom(ident.toLowerCase());
  if (byNom.length === 1) {
    return byNom[0] ?? null;
  }
  const compact = compactPhone(ident);
  if (compact && compact !== ident) {
    for (const user of await directory.listForPhoneCompact()) {
      if (user.telephone && compactPhone(user.telephone) === compact) {
        return user;
      }
    }
  }
  return null;
}

/** `next` accepté seulement s'il reste sur le même hôte. */
export function safeRedirectTarget(target: string | null | undefined, hostUrl: string): string | null {
  if (!target || !target.trim()) {
    return null;
  }
  let base: URL;
  let next: URL;
  try {
    base = new URL(hostUrl);
    next = new URL(target, base);
  } catch {
    return null;
  }
  if (next.protocol !== "http:" && next.protocol !== "https:") {
    return null;
  }
  if (next.host !== base.host) {
    return null;
  }
  return target;
}
