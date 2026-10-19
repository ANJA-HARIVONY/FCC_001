/** Littéraux métier copiés depuis core/app.py. Ne pas en ajouter. */

export const INCIDENT_STATUSES = ["Pendiente", "Solucionadas", "Bitrix"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export const INCIDENT_STATUS_DEFAULT: IncidentStatus = "Pendiente";

export const CLIENT_CATEGORIES = ["particular", "corporativo"] as const;
export type ClientCategory = (typeof CLIENT_CATEGORIES)[number];
export const CLIENT_CATEGORY_DEFAULT: ClientCategory = "particular";

export const ROLES = ["usuario", "admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_DEFAULT: Role = "usuario";

export const OPERATOR_CATEGORIES = ["atencion_cliente", "tecnico"] as const;
export type OperatorCategory = (typeof OPERATOR_CATEGORIES)[number];
export const OPERATOR_CATEGORY_DEFAULT: OperatorCategory = "atencion_cliente";

export const MATERIAL_TYPES = ["outillage", "material_cliente"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const SALIDA_STATES = ["registrada", "modificada"] as const;
export type SalidaState = (typeof SALIDA_STATES)[number];

export const SALIDA_TYPES = ["uso_interno", "incidencia", "instalacion"] as const;
export type SalidaType = (typeof SALIDA_TYPES)[number];
export const SALIDA_TYPE_DEFAULT: SalidaType = "uso_interno";

/** Types proposés par la modale « Nueva salida ». `instalacion` passe par Nueva instalación. */
export const SALIDA_TYPES_MODAL = ["uso_interno", "incidencia"] as const;

export const INSTALACION_STATES = ["en_curso", "terminada"] as const;
export type InstalacionState = (typeof INSTALACION_STATES)[number];
export const INSTALACION_STATE_DEFAULT: InstalacionState = "en_curso";

export const INSTALACION_TYPES = ["nueva", "traslado"] as const;
export type InstalacionType = (typeof INSTALACION_TYPES)[number];
export const INSTALACION_TYPE_DEFAULT: InstalacionType = "nueva";

export const TRASLADO_ACTIONS = ["reutilizado", "retirado"] as const;
export type TrasladoAction = (typeof TRASLADO_ACTIONS)[number];

export const LIST_PER_PAGE_CHOICES = [50, 100, 200, 500] as const;
export const DEFAULT_LIST_PER_PAGE = 50;

export const APRECIACION_TEXTO_MAX = 120;
export const COMMENT_MAX = 1000;
export const REF_BITRIX_MAX_DIGITS = 10;

export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_WARNING_MS = 2 * 60 * 1000;

function oneOf<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  if (typeof value === "string" && (values as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

export function normalizeIncidentStatus(value: unknown, fallback: IncidentStatus = INCIDENT_STATUS_DEFAULT): IncidentStatus {
  return oneOf(INCIDENT_STATUSES, value, fallback);
}

export function normalizeClientCategory(value: unknown, fallback: ClientCategory = CLIENT_CATEGORY_DEFAULT): ClientCategory {
  return oneOf(CLIENT_CATEGORIES, value, fallback);
}

export function normalizeRole(value: unknown, fallback: Role = ROLE_DEFAULT): Role {
  return oneOf(ROLES, value, fallback);
}

export function normalizeOperatorCategory(
  value: unknown,
  fallback: OperatorCategory = OPERATOR_CATEGORY_DEFAULT,
): OperatorCategory {
  return oneOf(OPERATOR_CATEGORIES, value, fallback);
}

/** `Bitrix` exige au plus 10 chiffres. Toute autre saisie efface la référence. */
export function normalizeRefBitrix(status: string, raw: unknown): string | null {
  if (status !== "Bitrix") {
    return null;
  }
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!/^\d{1,10}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}
