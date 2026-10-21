const MAX_AGE = 30 * 24 * 60 * 60;

export interface SavedFilters {
  enabled: boolean;
  filters: Record<string, string>;
}

function readCookie(name: string): string | null {
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const cookie of cookies) {
    const index = cookie.indexOf("=");
    const key = index >= 0 ? cookie.slice(0, index) : cookie;
    if (key === name) {
      return decodeURIComponent(index >= 0 ? cookie.slice(index + 1) : "");
    }
  }
  return null;
}

export function readSavedFilters(name: string, scope: string): SavedFilters | null {
  const raw = readCookie(name);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { scope?: string; enabled?: boolean; filters?: Record<string, string> };
    if (parsed.scope !== scope || !parsed.filters) {
      return null;
    }
    return { enabled: parsed.enabled !== false, filters: parsed.filters };
  } catch {
    return null;
  }
}

export function writeSavedFilters(name: string, scope: string, filters: Record<string, string>): void {
  const payload = JSON.stringify({ scope, enabled: true, filters });
  document.cookie = `${name}=${encodeURIComponent(payload)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearSavedFilters(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}
