import AgencySettings from "../models/AgencySettings.js";
import { randomToken } from "../utils/tokens.js";

const reserved = new Set(["admin", "api", "portal", "assets", "public", "login", "logout", "settings", "_next", "favicon", "robots", "sitemap"]);
export function validateOperatorRoute(value) {
  if (typeof value !== "string" || !/^\/[a-z][a-z0-9-]{2,63}$/.test(value) || reserved.has(value.slice(1))) {
    throw Object.assign(new Error("Use / followed by 3–64 lowercase letters, numbers or hyphens, starting with a letter. Choose a route other than a reserved system route."), { status: 400 });
  }
  return value;
}
export const generateOperatorRoute = () => `/staff-portal-${randomToken(12)}`;

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
