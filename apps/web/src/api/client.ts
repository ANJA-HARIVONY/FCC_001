export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type ApiOptions = RequestInit & {
  onUnauthorized?: () => void;
};

/** Client unique : cookie de session, jeton CSRF, erreur espagnole telle quelle. */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { onUnauthorized, headers, ...init } = options;
  const method = (init.method ?? "GET").toUpperCase();
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (method !== "GET" && method !== "HEAD") {
    const token = await csrfToken();
    requestHeaders.set("X-CSRFToken", token);
    if (init.body && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }
  }
  const response = await fetch(path, { ...init, method, headers: requestHeaders, credentials: "include" });
  if (response.status === 401 && onUnauthorized && !path.startsWith("/api/auth/login")) {
    onUnauthorized();
  }
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new ApiError(typeof payload.error === "string" ? payload.error : "Error", response.status);
  }
  return payload as T;
}

let cachedCsrf: string | null = null;

export function resetCsrfCache(): void {
  cachedCsrf = null;
}

async function csrfToken(): Promise<string> {
  if (cachedCsrf) {
    return cachedCsrf;
  }
  const response = await fetch("/api/auth/csrf", { credentials: "include" });
  const payload = (await response.json()) as { token?: string };
  if (!response.ok || !payload.token) {
    throw new ApiError("CSRF token missing or invalid", response.status);
  }
  cachedCsrf = payload.token;
  return payload.token;
}
