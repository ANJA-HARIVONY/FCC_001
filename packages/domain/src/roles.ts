import type { Role } from "./literals.ts";

export interface Actor {
  id: number;
  role: string;
  idAgencia: number;
  idCiudad: number;
  authenticated: boolean;
}

/** `Operateur.is_superadmin` : role === 'superadmin'. */
export function isSuperadmin(role: string | null | undefined): boolean {
  return role === "superadmin";
}

/** `Operateur.is_admin` : admin et superadmin. */
export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

/** Seul le superadmin traverse les agencias et les ciudades. */
export function seesAllMovements(actor: Pick<Actor, "authenticated" | "role"> | null | undefined): boolean {
  return Boolean(actor?.authenticated) && isSuperadmin(actor?.role);
}

export function movementScope(actor: Actor): { agenciaId: number | null; ciudadId: number | null } {
  if (seesAllMovements(actor)) {
    return { agenciaId: null, ciudadId: null };
  }
  return { agenciaId: actor.idAgencia, ciudadId: actor.idCiudad };
}

export function isKnownRole(role: string): role is Role {
  return role === "usuario" || role === "admin" || role === "superadmin";
}
