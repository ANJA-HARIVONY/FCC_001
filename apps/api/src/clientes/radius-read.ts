/**
 * Lecture RADIUS (SysAPI get_userdata), même contrat que Flask :
 * cache ~300 s, jamais d'écriture RADIUS, jamais de journal de l'URL (mot de passe).
 */

import { pingIp } from "./ping.ts";

const DEFAULT_TTL = 300;
const DEFAULT_TIMEOUT = 8;

const USERDATA_FIELDS = [
  "code", "enableuser", "srvid", "usemacauth", "mac", "maccm", "groupid", "custattr",
  "owner", "staticipcm", "staticipcpe", "ipmodecm", "ipmodecpe", "poolidcm", "poolidcpe",
  "credits", "contractid", "contractvalid", "cnic", "firstname", "lastname", "company",
  "address", "city", "zip", "country", "state", "phone", "mobile", "email", "comment",
  "taxid", "gpslong", "gpslat", "lang", "alertemail", "alertsms", "warningsent",
  "verified", "verifyfails", "verifysentnum", "pswactsmsnum", "simuse", "dlbytes",
  "ulbytes", "totalbytes", "onlinetime", "expiry",
] as const;

const IPV4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const TOP_LEVEL_FIELDS = ["simuse", "dlbytes", "ulbytes", "totalbytes", "onlinetime", "expiry"] as const;

export interface RadiusInfo {
  status: string;
  message?: string;
  data?: Record<string, unknown>;
  from_cache: boolean;
  cache_age_seconds?: number;
  cache_age_minutes?: number;
  fetched_at?: string;
  criterio_label?: string;
  mode?: string;
  cached_for_username?: string;
}

export interface RadiusSnapshot {
  username_radius: string | null;
  radius_cache_json: string | null;
  radius_cache_at: Date | null;
  ip_router: string | null;
}

export interface RadiusLoad {
  info: RadiusInfo;
  persist: { json: string; ipRouter: string | null } | null;
}

type Env = Record<string, string | undefined>;

export function radiusEnabled(env: Env = process.env): boolean {
  const flag = (env.RADIUS_ENABLED ?? "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no" || flag === "off") {
    return false;
  }
  if (flag === "1" || flag === "true" || flag === "yes" || flag === "on") {
    return true;
  }
  return Boolean((env.RADIUS_API_USER ?? "").trim() && (env.RADIUS_API_PASS ?? "").trim());
}

function cacheTtl(env: Env): number {
  const raw = (env.RADIUS_CACHE_TTL_SECONDS ?? "").trim();
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed)) {
    return DEFAULT_TTL;
  }
  return Math.max(30, Math.trunc(parsed));
}

function timeoutSeconds(env: Env): number {
  const raw = (env.RADIUS_TIMEOUT_SECONDS ?? "").trim();
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed)) {
    return DEFAULT_TIMEOUT;
  }
  return Math.max(2, Math.trunc(parsed));
}

function stamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function safeIpv4(value: unknown): string | null {
  const ip = String(value ?? "").trim();
  return IPV4.test(ip) ? ip : null;
}

function parseExpiry(raw: unknown): Date | null {
  const text = String(raw ?? "").trim();
  if (!text) {
    return null;
  }
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function daysRemaining(raw: unknown, today = new Date()): number | null {
  const expiry = parseExpiry(raw);
  if (!expiry) {
    return null;
  }
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function accountStatus(enableuser: number, expiryRaw: unknown, today = new Date()) {
  const expiry = parseExpiry(expiryRaw);
  if (expiry) {
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const expiryDate = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    if (expiryDate < todayDate) {
      return { account_status: "expired", account_status_label: "Expired" };
    }
  }
  if (enableuser === 1) {
    return { account_status: "enabled", account_status_label: "Enabled / Activo" };
  }
  return { account_status: "disabled", account_status_label: "Disabled / Inactivo" };
}

function listToDict(items: unknown[]): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const limit = Math.min(items.length, USERDATA_FIELDS.length);
  for (let i = 0; i < limit; i += 1) {
    data[USERDATA_FIELDS[i]!] = items[i];
  }
  const sessions: Record<string, unknown>[] = [];
  for (const extra of items.slice(USERDATA_FIELDS.length)) {
    if (extra && typeof extra === "object" && !Array.isArray(extra)) {
      sessions.push(extra as Record<string, unknown>);
    } else if (Array.isArray(extra) && extra.length >= 2) {
      sessions.push({ nasipaddress: String(extra[0] ?? ""), cpeipaddress: String(extra[1] ?? "") });
    }
  }
  if (sessions.length) {
    data.sessions = sessions;
  }
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Même normalisation que Flask : erreur `[code, message]`, tableau positionnel,
 * ou succès DMA Softlab `{"0": code, "1": {champs}, "expiry": ...}`.
 */
export function coercePayload(parsed: unknown): Record<string, unknown> | null {
  if (isRecord(parsed)) {
    if ("0" in parsed && "1" in parsed && isRecord(parsed["1"])) {
      const merged: Record<string, unknown> = { ...parsed["1"], code: parsed["0"] };
      for (const key of TOP_LEVEL_FIELDS) {
        if (key in parsed && !(key in merged)) {
          merged[key] = parsed[key];
        }
      }
      const sessions: Record<string, unknown>[] = [];
      for (const [key, value] of Object.entries(parsed)) {
        if (key === "0" || key === "1" || !/^\d+$/.test(key) || !isRecord(value)) {
          continue;
        }
        if ("nasipaddress" in value || "cpeipaddress" in value) {
          sessions.push(value);
        }
      }
      if (sessions.length) {
        merged.sessions = sessions;
      }
      return merged;
    }
    return parsed;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return null;
  }
  if (parsed.length === 1 && isRecord(parsed[0])) {
    return coercePayload(parsed[0]);
  }
  if (parsed.length === 2 && !isRecord(parsed[0])) {
    return { code: parsed[0], str: parsed[1] };
  }
  if (!isRecord(parsed[0])) {
    return listToDict(parsed);
  }
  for (const item of parsed) {
    if (isRecord(item) && ("code" in item || "0" in item)) {
      return coercePayload(item);
    }
  }
  return isRecord(parsed[0]) ? coercePayload(parsed[0]) : null;
}

function extractJson(text: string): string {
  const raw = text.replace(/^\uFEFF/, "").trim();
  const start = raw.search(/[[{]/);
  return start >= 0 ? raw.slice(start) : "";
}

export function normalizeUserdata(payload: Record<string, unknown>, username: string, today = new Date()) {
  const sessions = Array.isArray(payload.sessions)
    ? payload.sessions.filter((row) => row && typeof row === "object") as Record<string, unknown>[]
    : [];
  const cpe =
    String(payload.cpeipaddress ?? "").trim() ||
    String(payload.staticipcpe ?? "").trim() ||
    String(sessions[0]?.cpeipaddress ?? "");
  const enableRaw = payload.enableuser ?? payload.enabled ?? "0";
  const enableuser = Number(enableRaw) === 1 || String(enableRaw) === "true" ? 1 : 0;
  const expiryRaw = String(payload.expiry ?? "");
  const expiryDate = parseExpiry(expiryRaw);
  const expiry = expiryDate
    ? `${String(expiryDate.getDate()).padStart(2, "0")}/${String(expiryDate.getMonth() + 1).padStart(2, "0")}/${expiryDate.getFullYear()}`
    : "";
  const status = accountStatus(enableuser, expiryRaw, today);
  const online = sessions.length > 0;
  return {
    username,
    firstname: String(payload.firstname ?? ""),
    enableuser,
    expiry,
    days_remaining: daysRemaining(expiry || expiryRaw, today),
    account_status: status.account_status,
    account_status_label: status.account_status_label,
    staticipcpe: String(payload.staticipcpe ?? ""),
    cpeipaddress: cpe,
    srvid: String(payload.srvid ?? ""),
    srvname: String(payload.srvname ?? ""),
    service_plan: "",
    sessions,
    online,
    connection_status: online ? "online" : "offline",
    connection_status_label: online ? "Online / En línea" : "Offline / Desconectado",
  };
}

function refreshDays(info: RadiusInfo, today = new Date()): RadiusInfo {
  if (info.status !== "ok" || !info.data) {
    return info;
  }
  const expiry = info.data.expiry;
  return {
    ...info,
    data: { ...info.data, days_remaining: daysRemaining(expiry, today) },
  };
}

function readCache(client: RadiusSnapshot, username: string, today = new Date()): RadiusInfo | null {
  if (!client.radius_cache_json || !client.radius_cache_at) {
    return null;
  }
  let payload: RadiusInfo;
  try {
    payload = JSON.parse(client.radius_cache_json) as RadiusInfo;
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const cachedFor =
    payload.cached_for_username ??
    (payload.data && typeof payload.data.username === "string" ? payload.data.username : "");
  if ((cachedFor || "") !== username) {
    return null;
  }
  const age = Math.max(0, Math.floor((Date.now() - client.radius_cache_at.getTime()) / 1000));
  return refreshDays(
    {
      ...payload,
      from_cache: true,
      cache_age_seconds: age,
      cache_age_minutes: Math.floor(age / 60),
    },
    today,
  );
}

function emptyName(): RadiusInfo {
  return {
    status: "empty_name",
    message: "Sin Username RADIUS. Edite el cliente y complete el campo «Username RADIUS» (login SysAPI).",
    criterio_label: "",
    mode: "username_radius",
    from_cache: false,
  };
}

async function sysapi(query: Record<string, string>, env: Env): Promise<unknown> {
  const base = (env.RADIUS_BASE_URL ?? "http://10.26.0.4/radiusmanager/api").replace(/\/$/, "");
  const user = (env.RADIUS_API_USER ?? "").trim();
  const pass = (env.RADIUS_API_PASS ?? "").trim();
  if (!user || !pass) {
    throw new Error("unconfigured");
  }
  const params = new URLSearchParams({ apiuser: user, apipass: pass, ...query });
  const response = await fetch(`${base}/sysapi.php?${params.toString()}`, {
    headers: { Accept: "application/json, text/plain, */*" },
    signal: AbortSignal.timeout(timeoutSeconds(env) * 1000),
  });
  if (!response.ok) {
    throw new Error("http");
  }
  const body = await response.text();
  const blob = extractJson(body);
  if (!blob) {
    throw new Error("invalid");
  }
  return JSON.parse(blob) as unknown;
}

async function serviceName(srvid: string, env: Env): Promise<string> {
  if (!srvid) {
    return "";
  }
  try {
    const parsed = await sysapi({ q: "get_srv", srvid }, env);
    if (Array.isArray(parsed) && Number(parsed[0]) === 0) {
      const plans = parsed[1];
      if (Array.isArray(plans)) {
        const match = plans.find((plan) => plan && typeof plan === "object" && String((plan as { srvid?: unknown }).srvid ?? "") === srvid);
        const plan = (match ?? plans[0]) as { srvname?: unknown; descr?: unknown } | undefined;
        return String(plan?.srvname ?? plan?.descr ?? "").trim();
      }
      if (plans && typeof plans === "object") {
        const plan = plans as { srvname?: unknown; descr?: unknown };
        return String(plan.srvname ?? plan.descr ?? "").trim();
      }
    }
    const data = coercePayload(parsed);
    return String(data?.srvname ?? data?.descr ?? "").trim();
  } catch {
    return "";
  }
}

async function resolveLive(username: string, env: Env, today: Date): Promise<RadiusInfo> {
  let parsed: unknown;
  try {
    parsed = await sysapi({ q: "get_userdata", username }, env);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return {
      status: "error",
      message: code === "unconfigured" ? "RADIUS no configurado." : "RADIUS no disponible temporalmente.",
      criterio_label: `Username RADIUS (${username})`,
      mode: "username_radius",
      from_cache: false,
      fetched_at: stamp(today),
    };
  }
  const data = coercePayload(parsed);
  if (!data) {
    return {
      status: "error",
      message: "Respuesta RADIUS inválida.",
      criterio_label: `Username RADIUS (${username})`,
      mode: "username_radius",
      from_cache: false,
      fetched_at: stamp(today),
    };
  }
  const code = Number(data.code ?? 1);
  if (code !== 0) {
    return {
      status: "not_found",
      message: String(data.str ?? "No se encontró cuenta en RADIUS"),
      criterio_label: `Username RADIUS (${username})`,
      mode: "username_radius",
      from_cache: false,
      fetched_at: stamp(today),
    };
  }
  const normalized = normalizeUserdata(data, username, today);
  const srvname = normalized.srvname || (await serviceName(normalized.srvid, env));
  return {
    status: "ok",
    message: "",
    criterio_label: `Username RADIUS (${username})`,
    mode: "username_radius",
    data: { ...normalized, srvname },
    from_cache: false,
    fetched_at: stamp(today),
    cached_for_username: username,
  };
}

/** État de connexion = ping CPE, comme Flask (`apply_cpe_ping_status`). */
async function withConnection(info: RadiusInfo): Promise<RadiusInfo> {
  if (info.status !== "ok" || !info.data) {
    return info;
  }
  const cpe = safeIpv4(info.data.cpeipaddress) ?? safeIpv4(info.data.staticipcpe);
  const data: Record<string, unknown> = { ...info.data };
  if (cpe && !String(data.cpeipaddress ?? "").trim()) {
    data.cpeipaddress = cpe;
  }
  const ping = cpe ? await pingIp(cpe, 4) : null;
  const online = Boolean(ping && ping.packets_received > 0);
  data.online = online;
  data.connection_status = online ? "online" : "offline";
  data.connection_status_label = online ? "Online / En línea" : "Offline / Desconectado";
  return { ...info, data };
}

export function syncedRouter(current: string | null, data: Record<string, unknown> | undefined): string | null {
  if (!data) {
    return current;
  }
  const cpe = safeIpv4(data.cpeipaddress) ?? safeIpv4(data.staticipcpe);
  if (!cpe) {
    return current;
  }
  return (current ?? "").trim() === cpe ? current : cpe;
}

export async function loadRadius(client: RadiusSnapshot, force: boolean, env: Env = process.env): Promise<RadiusLoad> {
  if (!radiusEnabled(env)) {
    return {
      info: { status: "disabled", message: "Integración RADIUS desactivada.", from_cache: false },
      persist: null,
    };
  }
  const username = (client.username_radius ?? "").trim();
  const today = new Date();
  if (!force && client.radius_cache_at && client.radius_cache_json) {
    const age = (Date.now() - client.radius_cache_at.getTime()) / 1000;
    if (age < cacheTtl(env)) {
      const cached = readCache(client, username, today);
      if (cached) {
        const ipRouter = cached.status === "ok" ? syncedRouter(client.ip_router, cached.data) : client.ip_router;
        return {
          info: await withConnection(cached),
          persist: ipRouter !== client.ip_router ? { json: client.radius_cache_json, ipRouter } : null,
        };
      }
    }
  }
  const info = username ? await resolveLive(username, env, today) : emptyName();
  const stored: RadiusInfo = {
    ...info,
    from_cache: false,
    cached_for_username: username,
  };
  const ipRouter = stored.status === "ok" ? syncedRouter(client.ip_router, stored.data) : client.ip_router;
  return {
    info: await withConnection({ ...stored, cache_age_seconds: 0, cache_age_minutes: 0 }),
    persist: { json: JSON.stringify(stored), ipRouter },
  };
}
