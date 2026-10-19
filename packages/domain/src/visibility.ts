import type { Actor } from "./roles.ts";
import { isAdmin, seesAllMovements } from "./roles.ts";

export interface IncidentAccess {
  creatorId: number;
  creatorAgenciaId: number;
  clientCiudadId: number | null;
}

/**
 * Règle 10.4. Superadmin : tout.
 * Admin et usuario : créateur dans la même agencia ET client dans leur ciudad.
 */
export function incidentVisible(actor: Actor, incident: IncidentAccess): boolean {
  if (seesAllMovements(actor)) {
    return true;
  }
  return incident.creatorAgenciaId === actor.idAgencia && incident.clientCiudadId === actor.idCiudad;
}

export function canAccessIncident(actor: Actor, incident: IncidentAccess): boolean {
  return incidentVisible(actor, incident);
}

/** Quiconque peut consulter peut modifier. Le créateur (`id_operateur`) reste immuable. */
export function canModifyIncident(actor: Actor, incident: IncidentAccess): boolean {
  return canAccessIncident(actor, incident);
}

/**
 * Créateur ou admin (admin et superadmin), sans filtre d'agencia.
 * Le Flask charge l'incident par id puis applique seulement cette fonction
 * (`supprimer_incident`). Un admin d'une autre agencia peut donc supprimer
 * s'il connaît l'id. La réécriture reprend ce comportement.
 */
export function canDeleteIncident(actor: Actor, incident: Pick<IncidentAccess, "creatorId">): boolean {
  return isAdmin(actor.role) || incident.creatorId === actor.id;
}

/** Clients partagés : tout utilisateur connecté consulte n'importe quel client. */
export function canAccessClient(actor: Actor, client: unknown): boolean {
  return actor.authenticated && client != null;
}

/** Un mouvement reste dans la ciudad de l'utilisateur, sauf superadmin. */
export function clientInMovementCiudad(actor: Actor, client: { idCiudad: number | null } | null): boolean {
  if (client == null) {
    return false;
  }
  if (seesAllMovements(actor)) {
    return true;
  }
  return client.idCiudad === actor.idCiudad;
}

export interface SalidaAccess {
  tecnicoAgenciaId: number;
  tecnicoCiudadId: number;
  clientCiudadId: number | null;
}

/**
 * Scope salidas : agencia du técnico, et ciudad du client.
 * `uso_interno` (client null) : ciudad du técnico.
 * `null` sur un axe = pas de filtre (superadmin).
 */
export function salidaInScope(
  scope: { agenciaId: number | null; ciudadId: number | null },
  salida: SalidaAccess,
): boolean {
  if (scope.agenciaId != null && salida.tecnicoAgenciaId !== scope.agenciaId) {
    return false;
  }
  if (scope.ciudadId == null) {
    return true;
  }
  if (salida.clientCiudadId != null) {
    return salida.clientCiudadId === scope.ciudadId;
  }
  return salida.tecnicoCiudadId === scope.ciudadId;
}

export interface InstalacionAccess {
  tecnicoAgenciaId: number;
  clientCiudadId: number | null;
}

/** Superadmin : tout. Sinon agencia du técnico et ciudad du client. */
export function instalacionInScope(actor: Actor, instalacion: InstalacionAccess): boolean {
  if (seesAllMovements(actor)) {
    return true;
  }
  return instalacion.tecnicoAgenciaId === actor.idAgencia && instalacion.clientCiudadId === actor.idCiudad;
}

export interface ApreciacionAccess {
  idCiudad: number | null;
  idAgencia: number | null;
}

/**
 * Admin et usuario : leur paire. Superadmin : tout, puis filtres optionnels.
 * Une note sans ciudad ou sans agencia n'est visible que du superadmin.
 */
export function apreciacionVisible(
  actor: Actor,
  row: ApreciacionAccess,
  filter?: { ciudadId?: number | null; agenciaId?: number | null },
): boolean {
  if (!actor.authenticated) {
    return false;
  }
  if (!seesAllMovements(actor)) {
    return row.idCiudad === actor.idCiudad && row.idAgencia === actor.idAgencia;
  }
  if (filter?.ciudadId && row.idCiudad !== filter.ciudadId) {
    return false;
  }
  if (filter?.agenciaId && row.idAgencia !== filter.agenciaId) {
    return false;
  }
  return true;
}

/**
 * Admin : sa paire. Superadmin : la paire filtrée si l'agencia appartient
 * à la ciudad choisie, sinon sa paire.
 */
export function apreciacionWriteScope(
  actor: Actor,
  selected?: { ciudadId?: number | null; agenciaId?: number | null; agenciaCiudadId?: number | null },
): { idCiudad: number; idAgencia: number } {
  if (!seesAllMovements(actor)) {
    return { idCiudad: actor.idCiudad, idAgencia: actor.idAgencia };
  }
  if (
    selected?.ciudadId &&
    selected.agenciaId &&
    selected.agenciaCiudadId === selected.ciudadId
  ) {
    return { idCiudad: selected.ciudadId, idAgencia: selected.agenciaId };
  }
  return { idCiudad: actor.idCiudad, idAgencia: actor.idAgencia };
}

/**
 * Informes : superadmin voit tout. Les autres voient les `parametres`
 * qui contiennent `"agence_id": <leur agencia>` (espace après les deux-points).
 */
export function etatVisible(actor: Actor, parametres: string | null | undefined): boolean {
  if (!actor.authenticated) {
    return false;
  }
  if (seesAllMovements(actor)) {
    return true;
  }
  const needle = `"agence_id": ${actor.idAgencia}`;
  return (parametres ?? "").includes(needle);
}
