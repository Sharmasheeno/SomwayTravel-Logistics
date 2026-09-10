export const SESSION_COOKIE = "macruf_session";

// The cookie is marked Secure only when the site is actually served over
// HTTPS. A Secure cookie sent from an http:// origin is discarded by the
// browser outright, which would silently break sign-in on a plain-HTTP
// deployment. Set COOKIE_SECURE=true once TLS is in front of the app.
const secureFlag = () =>
  String(process.env.COOKIE_SECURE || "").toLowerCase() === "true"
    ? "; Secure"
    : "";

// SameSite policy for the session cookie. Defaults to "Lax", which is correct
// when the site and API share one origin. When the frontend and API are hosted
// on different origins (e.g. two Render services), the browser will only store
// and send the cookie on those cross-site requests if it is "None"; and a
// SameSite=None cookie MUST also be Secure, so we force that flag on.
const sameSiteAttributes = () => {
  const value = String(process.env.COOKIE_SAMESITE || "Lax").trim().toLowerCase();
  if (value === "none") return "; SameSite=None; Secure";
  if (value === "strict") return `; SameSite=Strict${secureFlag()}`;
  return `; SameSite=Lax${secureFlag()}`;
};

export const readCookie = (req, name) => {
  const header = req.headers.cookie || "";
  const part = header
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
};

// No Max-Age: this is a browser-session cookie, so closing the browser ends
// the sign-in and returning to the site requires logging in again.
export const setSessionCookie = (res, token) => {
  res.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly${sameSiteAttributes()}`
  );
};

export const clearSessionCookie = (res) => {
  res.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly${sameSiteAttributes()}; Max-Age=0`
  );
};

