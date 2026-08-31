export const SESSION_COOKIE = "macruf_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export const readCookie = (req, name) => {
  const header = req.headers.cookie || "";
  const part = header
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
};

export const setSessionCookie = (res, token, maxAge = SESSION_MAX_AGE) => {
  res.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
  );
};

export const clearSessionCookie = (res) => {
  res.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
};
