import AgencySettings from "../models/AgencySettings.js";
import { randomToken } from "../utils/tokens.js";

const reserved = new Set(["admin", "api", "portal", "assets", "public", "login", "logout", "settings", "_next", "favicon", "robots", "sitemap"]);
export function validateOperatorRoute(value) {
  if (value === "/") return value;
  if (typeof value !== "string" || !/^\/[a-z][a-z0-9-]{0,127}$/.test(value) || reserved.has(value.slice(1))) {
    throw Object.assign(new Error("Use a short path such as /staff: lowercase letters, numbers or hyphens, starting with a letter (maximum 128 characters). System routes such as /admin are reserved."), { status: 400 });
  }
  return value;
}
export const generateOperatorRoute = () => `/staff-portal-${randomToken(12)}`;

export function parseOperatorAddress(value) {
  const address = String(value || "").trim();
  if (address.startsWith("/")) return { operatorAccessRoute: validateOperatorRoute(address) };
  let url;
  try { url = new URL(address.includes("://") ? address : `https://${address}`); } catch { /* Validated below. */ }
  if (!url || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || !url.hostname.includes(".")) {
    throw Object.assign(new Error("Enter a valid domain or http(s) URL without a username, password, query or fragment."), { status: 400 });
  }
  return { publicBaseUrl: url.origin, operatorAccessRoute: validateOperatorRoute(url.pathname) };
}

// Persist the default once; never cache it so rotations take effect immediately.
export async function operatorSettings() {
  let settings = await AgencySettings.findOne({ key: "singleton" }).lean();
  if (!settings?.operatorAccessRoute) {
    await AgencySettings.updateOne(
      { key: "singleton" },
      { $setOnInsert: { key: "singleton" } },
      { upsert: true },
    );
    await AgencySettings.updateOne(
      { key: "singleton", $or: [{ operatorAccessRoute: { $exists: false } }, { operatorAccessRoute: "" }] },
      { $set: { operatorAccessRoute: generateOperatorRoute() } },
    );
    settings = await AgencySettings.findOne({ key: "singleton" }).lean();
  }
  return settings;
}

export function operatorAccessPayload(req, settings) {
  const base = settings.publicBaseUrl || process.env.PUBLIC_APP_URL || process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return { route: settings.operatorAccessRoute, url: `${new URL(base).origin}${settings.operatorAccessRoute}` };
}

export function canLoginAt(role, path, activeRoute) {
  return role === "owner" ? path === "/admin" : path === activeRoute;
}
