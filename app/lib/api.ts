import { ApiError, parseApiResponse } from "./api-core.js";

// When VITE_API_BASE_URL is set (e.g. a separate API origin in production) we
// call it directly. Left empty, calls stay same-origin ("/api/...") so the Vite
// dev/preview server can proxy them to the Express API running alongside it --
// the browser never needs to know a localhost port that isn't reachable from
// outside the sandbox.
//
// Some hosts (e.g. Render's fromService wiring) supply the base as a bare
// host without a scheme ("somway-api.onrender.com"). A bare host would be
// treated as a relative path by fetch(), so normalise it to an absolute https
// URL when a scheme is missing.
const rawApiBase = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
const apiBase = rawApiBase && !/^https?:\/\//i.test(rawApiBase) ? `https://${rawApiBase}` : rawApiBase;

const requestId = () => globalThis.crypto?.randomUUID?.() || `web-${Date.now().toString(36)}`;

export { ApiError };

export const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const url = raw.startsWith("/api/") ? `${apiBase}${raw}` : raw;
  const headers = new Headers(init.headers);
  if (!headers.has("X-Request-Id")) headers.set("X-Request-Id", requestId());
  return globalThis.fetch(url, { ...init, headers, credentials: raw.startsWith("/api/") ? "include" : init.credentials });
};

/** Fired when the server rejects a request because the session is no longer
 *  valid -- the account was deleted or suspended, or the session was ended
 *  elsewhere. The workspace listens for this and returns to the login screen.
 *  The sign-in probes are excluded: a 401 from those is the normal
 *  "not signed in yet" answer, not an expiry. */
export const SESSION_EXPIRED_EVENT = "somway:session-expired";
const SIGN_IN_PROBES = [
  "/api/auth/me",
  "/api/auth/status",
  "/api/auth/login",
  "/api/auth/link",
];

export const apiRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await apiFetch(path, init);
  if (
    response.status === 401 &&
    !SIGN_IN_PROBES.some((probe) => path.startsWith(probe))
  ) {
    globalThis.dispatchEvent?.(new Event(SESSION_EXPIRED_EVENT));
  }
  return (await parseApiResponse(response, {
    method: init.method || "GET",
    path,
  })) as T;
};

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { cache: "no-store" }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }),
};
