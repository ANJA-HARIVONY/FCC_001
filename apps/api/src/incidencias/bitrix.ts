/** Lecture Bitrix24 (cache + tasks.task.get). Aucune écriture vers l'API Bitrix. */

import { redactSecrets } from "../logging/redact.ts";

export const BITRIX_STATUS_LABELS: Record<string, readonly [string, string]> = {
  "2": ["En espera de ejecución", "⏰"],
  "3": ["En curso", "🔄"],
  "4": ["En espera de control", "👀"],
  "5": ["Terminada", "✅"],
  "6": ["Aplazada", "⏸️"],
};

export const BITRIX_TASK_STATUS_UNFETCHED = "_none";

const BITRIX_STATUS_ICONS: Record<string, string> = {
  "2": "fa-hourglass-start",
  "3": "fa-spinner",
  "4": "fa-user-check",
  "5": "fa-check-circle",
  "6": "fa-pause-circle",
};
const BITRIX_PRIORITY_LABELS: Record<string, readonly [string, string]> = {
  "0": ["Baja", "fa-angle-down"],
  "1": ["Media", "fa-minus"],
  "2": ["Alta", "fa-angle-double-up"],
};
const BITRIX_OVERDUE_STATUSES = new Set(["2", "3", "4"]);
const BITRIX_MOVED_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface BitrixExtrasInput {
  bitrix_task_status: string | null;
  bitrix_priority: string | null;
  bitrix_deadline: Date | null;
  bitrix_created_at: Date | null;
  bitrix_closed_at: Date | null;
  bitrix_changed_at: Date | null;
  bitrix_moved_at: Date | null;
}

export interface BitrixExtras {
  status_icon: string;
  show_plazo: boolean;
  deadline_label: string;
  is_overdue: boolean;
  plazo_label: string;
  priority_label: string;
  priority_icon: string;
  is_closed: boolean;
  closed_label: string;
  created_label: string;
  changed_label: string;
  moved_recently: boolean;
  moved_label: string;
}
const BITRIX_TERMINAL_STATUS = "5";
const DEFAULT_TTL_SECONDS = 600;

export const BITRIX_ERROR_DNS =
  "No se puede contactar con Bitrix24: el servidor no resuelve el nombre de dominio. " +
  "Compruebe la conexión a Internet del servidor y la variable BITRIX24_API en .env.";
export const BITRIX_ERROR_NETWORK =
  "No se puede contactar con Bitrix24 desde el servidor. " +
  "Compruebe la conexión de red y la URL del webhook en BITRIX24_API.";
export const BITRIX_ERROR_TIMEOUT = "Tiempo de espera agotado al contactar con Bitrix24. Inténtelo de nuevo.";
export const BITRIX_ERROR_DISABLED =
  "Consulta de estado Bitrix desactivada en este servidor " +
  "(sin acceso a Internet hacia Bitrix24). Use el enlace para abrir la tarea.";

export interface BitrixCacheRow {
  status: string;
  ref_bitrix: string | null;
  bitrix_fetch_locked: boolean;
  bitrix_fetched_at: Date | null;
  bitrix_task_status: string | null;
  bitrix_changed_at?: Date | null;
}

export interface BitrixTaskInfo {
  task_status: string;
  status_label: string;
  status_emoji: string;
  responsible_name: string;
  title: string;
  priority: string;
  deadline: Date | null;
  created_date: Date | null;
  closed_date: Date | null;
  changed_date: Date | null;
}

export function bitrixStatusChoices(): { code: string; emoji: string; label: string }[] {
  return Object.entries(BITRIX_STATUS_LABELS).map(([code, meta]) => ({
    code,
    label: meta[0],
    emoji: meta[1],
  }));
}

export function bitrixApiEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = (env.BITRIX24_ENABLED ?? "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no" || flag === "off") {
    return false;
  }
  return Boolean((env.BITRIX24_API ?? "").trim());
}

export function bitrixCacheTtlSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const raw = (env.BITRIX_CACHE_TTL ?? "").trim();
  if (!raw) {
    return DEFAULT_TTL_SECONDS;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_TTL_SECONDS;
  }
  return Math.max(60, parsed);
}

export function normalizeBitrixStatusFilter(statusFilter: string, raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (statusFilter !== "Bitrix") {
    return "";
  }
  if (value === BITRIX_TASK_STATUS_UNFETCHED) {
    return value;
  }
  if (value in BITRIX_STATUS_LABELS) {
    return value;
  }
  return "";
}

export function shouldFetchBitrix(
  row: BitrixCacheRow,
  options: { force?: boolean; now?: Date; apiEnabled?: boolean; ttlSeconds?: number } = {},
): boolean {
  const apiEnabled = options.apiEnabled ?? bitrixApiEnabled();
  if (!apiEnabled) {
    return false;
  }
  if (row.status !== "Bitrix" || !row.ref_bitrix?.trim()) {
    return false;
  }
  if (options.force) {
    return true;
  }
  if (row.bitrix_fetch_locked) {
    return false;
  }
  if (!row.bitrix_fetched_at || !row.bitrix_task_status) {
    return true;
  }
  const now = options.now ?? new Date();
  const age = (now.getTime() - row.bitrix_fetched_at.getTime()) / 1000;
  return age > (options.ttlSeconds ?? bitrixCacheTtlSeconds());
}

export function formatBitrixDate(value: Date | null): string {
  if (!value) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function formatRetraso(minutes: number): string {
  const total = Math.trunc(minutes);
  if (total < 60) {
    return `${total} min`;
  }
  const hours = Math.trunc(total / 60);
  const mins = total % 60;
  if (mins === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${mins} min`;
}

export function buildBitrixExtras(row: BitrixExtrasInput, now = new Date()): BitrixExtras | null {
  const taskStatus = row.bitrix_task_status || "";
  if (!taskStatus) {
    return null;
  }
  const priority = BITRIX_PRIORITY_LABELS[row.bitrix_priority || ""];
  const deadline = row.bitrix_deadline;
  const showPlazo = BITRIX_OVERDUE_STATUSES.has(taskStatus);
  let isOverdue = false;
  let plazoLabel = "";
  if (showPlazo && deadline) {
    const deltaMin = Math.trunc((now.getTime() - deadline.getTime()) / 60000);
    isOverdue = deltaMin > 0;
    plazoLabel = formatRetraso(Math.abs(deltaMin));
  }
  const movedAt = row.bitrix_moved_at;
  return {
    status_icon: BITRIX_STATUS_ICONS[taskStatus] ?? "fa-tasks",
    show_plazo: showPlazo,
    deadline_label: formatBitrixDate(deadline),
    is_overdue: isOverdue,
    plazo_label: plazoLabel,
    priority_label: priority?.[0] ?? "",
    priority_icon: priority?.[1] ?? "fa-flag",
    is_closed: taskStatus === "5",
    closed_label: formatBitrixDate(row.bitrix_closed_at),
    created_label: formatBitrixDate(row.bitrix_created_at),
    changed_label: formatBitrixDate(row.bitrix_changed_at),
    moved_recently: Boolean(movedAt && now.getTime() - movedAt.getTime() < BITRIX_MOVED_WINDOW_MS),
    moved_label: formatBitrixDate(movedAt),
  };
}

export function parseBitrixDatetime(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const iso = new Date(raw.replace("Z", "+00:00"));
  if (!Number.isNaN(iso.getTime()) && /[T ]\d{2}:/.test(raw)) {
    return new Date(iso.getTime());
  }
  const display = raw.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!display) {
    return Number.isNaN(iso.getTime()) ? null : iso;
  }
  const [, dd, mm, yyyy, hh, min, ss] = display;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
}

export function applyBitrixCache(
  previousChangedAt: Date | null,
  info: BitrixTaskInfo,
  now = new Date(),
): {
  bitrix_task_status: string | null;
  bitrix_status_label: string | null;
  bitrix_status_emoji: string | null;
  bitrix_responsible: string | null;
  bitrix_fetched_at: Date;
  bitrix_fetch_locked: boolean;
  bitrix_deadline: Date | null;
  bitrix_created_at: Date | null;
  bitrix_closed_at: Date | null;
  bitrix_changed_at: Date | null;
  bitrix_priority: string | null;
  bitrix_moved_at?: Date;
} {
  const taskStatus = String(info.task_status || "");
  const changed = info.changed_date;
  const data = {
    bitrix_task_status: taskStatus || null,
    bitrix_status_label: info.status_label || null,
    bitrix_status_emoji: info.status_emoji || null,
    bitrix_responsible: info.responsible_name || null,
    bitrix_fetched_at: now,
    bitrix_fetch_locked: taskStatus === BITRIX_TERMINAL_STATUS,
    bitrix_deadline: info.deadline,
    bitrix_created_at: info.created_date,
    bitrix_closed_at: info.closed_date,
    bitrix_changed_at: changed,
    bitrix_priority: info.priority ? String(info.priority) : null,
  };
  if (changed && previousChangedAt && changed.getTime() > previousChangedAt.getTime()) {
    return { ...data, bitrix_moved_at: now };
  }
  return data;
}

export async function fetchBitrixTask(apiBaseUrl: string, taskId: string): Promise<BitrixTaskInfo | { error: string }> {
  const base = (apiBaseUrl || "").trim();
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    return {
      error: "URL BITRIX24_API inválida en .env (ejemplo: https://su-dominio.bitrix24.es/rest/1/xxxxx/)",
    };
  }
  if (!parsed.protocol || !parsed.host) {
    return {
      error: "URL BITRIX24_API inválida en .env (ejemplo: https://su-dominio.bitrix24.es/rest/1/xxxxx/)",
    };
  }
  const url = `${base.replace(/\/$/, "")}/tasks.task.get`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        taskId: Number(taskId),
        select: [
          "ID",
          "TITLE",
          "STATUS",
          "REAL_STATUS",
          "RESPONSIBLE_ID",
          "RESPONSIBLE",
          "DEADLINE",
          "CREATED_DATE",
          "CLOSED_DATE",
          "CHANGED_DATE",
          "PRIORITY",
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      data = {};
    }
    if (!response.ok) {
      return { error: httpErrorMessage(response.status, data) };
    }
    if (typeof data.error === "string" || data.error) {
      const description = data.error_description;
      const code = data.error;
      return {
        error: typeof description === "string" ? description : typeof code === "string" ? code : "Error desconocido",
      };
    }
    const result = (data.result ?? {}) as Record<string, unknown>;
    const task = (result.task ?? {}) as Record<string, unknown>;
    if (!task || Object.keys(task).length === 0) {
      return { error: "Tarea no encontrada o acceso denegado" };
    }
    const status = String(task.status ?? task.realStatus ?? task.STATUS ?? "");
    const known = BITRIX_STATUS_LABELS[status];
    const responsible = task.responsible;
    const responsibleId = task.responsibleId ?? task.RESPONSIBLE_ID ?? "";
    let responsibleName = "";
    if (responsible && typeof responsible === "object" && "name" in responsible) {
      responsibleName = String((responsible as { name?: unknown }).name ?? "");
    } else if (responsible) {
      responsibleName = String(responsible);
    }
    if (!responsibleName && responsibleId) {
      responsibleName = `ID: ${responsibleId}`;
    }
    return {
      task_status: status,
      status_label: known ? known[0] : `Estado ${status}`,
      status_emoji: known ? known[1] : "📋",
      responsible_name: responsibleName || "(no definido)",
      title: String(task.title ?? task.TITLE ?? ""),
      priority: String(task.priority ?? task.PRIORITY ?? ""),
      deadline: parseBitrixDatetime(task.deadline ?? task.DEADLINE),
      created_date: parseBitrixDatetime(task.createdDate ?? task.CREATED_DATE),
      closed_date: parseBitrixDatetime(task.closedDate ?? task.CLOSED_DATE),
      changed_date: parseBitrixDatetime(task.changedDate ?? task.CHANGED_DATE),
    };
  } catch (err) {
    return { error: connectionError(err) };
  }
}

function httpErrorMessage(status: number, data: Record<string, unknown>): string {
  const description = data.error_description;
  const code = data.error;
  let message =
    typeof description === "string" ? description : typeof code === "string" ? code : "Error desconocido";
  if (status === 401) {
    message +=
      " — Verifique le webhook Bitrix24: Applications > Developer resources > Incoming webhook. Cochez la permission 'tasks'.";
  }
  return message;
}

function connectionError(err: unknown): string {
  const cause =
    err instanceof Error && "cause" in err ? (err as Error & { cause?: { code?: string } }).cause : undefined;
  const code = cause?.code ?? "";
  const name = err instanceof Error ? err.name : "";
  const msg = (err instanceof Error ? err.message : "").toLowerCase();
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || msg.includes("getaddrinfo") || msg.includes("name resolution")) {
    return BITRIX_ERROR_DNS;
  }
  if (name === "TimeoutError" || name === "AbortError" || code === "ETIMEDOUT" || msg.includes("timeout") || msg.includes("timed out")) {
    return BITRIX_ERROR_TIMEOUT;
  }
  if (code === "ECONNREFUSED" || msg.includes("connection refused") || msg.includes("network is unreachable")) {
    return BITRIX_ERROR_NETWORK;
  }
  if (msg.includes("http") || msg.includes("fetch")) {
    return BITRIX_ERROR_NETWORK;
  }
  const raw = err instanceof Error && err.message ? err.message : BITRIX_ERROR_NETWORK;
  return redactSecrets(raw);
}
