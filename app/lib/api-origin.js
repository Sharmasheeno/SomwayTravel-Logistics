// A server loopback address must never become a remote visitor's API address.
export function resolveApiBase(value, browserHostname = "") {
  const raw = String(value || "").trim().replace(/\/$/, "");
  if (!raw) return "";
  const base = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const isLoopback = (host) => host === "localhost" || host === "[::1]" || /^127\./.test(host);
  if (browserHostname && !isLoopback(browserHostname) && isLoopback(new URL(base).hostname)) return "";
  return base;
}
