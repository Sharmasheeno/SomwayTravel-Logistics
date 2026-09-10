import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import AgencySettings from "../server/models/AgencySettings.js";
import User from "../server/models/User.js";
import Session from "../server/models/Session.js";
import Activity from "../server/models/Activity.js";
import operatorRoutes from "../server/routes/operatorAccess.js";
import authRoutes from "../server/routes/auth.js";
import adminRoutes from "../server/routes/admin.js";
import { validateOperatorRoute, generateOperatorRoute, operatorSettings, parseOperatorAddress } from "../server/lib/operatorAccess.js";

test("operator paths reject reserved routes, traversal, URLs and ambiguous encodings", () => {
  for (const route of ["/admin", "/api", "/portal", "//evil", "https://evil.test", "/a/b", "/../admin", "/%61dmin", "/Admin", "/staff?x=1", "/staff#x", "/staff/", " /staff", "/assets", "/_next"]) {
    assert.throws(() => validateOperatorRoute(route), { status: 400 });
  }
  assert.equal(validateOperatorRoute("/operator-access"), "/operator-access");
  assert.equal(validateOperatorRoute("/staff-portal-8472"), "/staff-portal-8472");
  assert.notEqual(generateOperatorRoute(), generateOperatorRoute());
  assert.doesNotThrow(() => validateOperatorRoute(generateOperatorRoute()));
});

test("one address field accepts domains, full URLs and short paths", () => {
  assert.deepEqual(parseOperatorAddress("staff.example.com"), { publicBaseUrl: "https://staff.example.com", operatorAccessRoute: "/" });
  assert.deepEqual(parseOperatorAddress("http://169.58.173.197:8080/staff"), { publicBaseUrl: "http://169.58.173.197:8080", operatorAccessRoute: "/staff" });
  assert.deepEqual(parseOperatorAddress("/s"), { operatorAccessRoute: "/s" });
  for (const value of ["", "javascript:alert(1)", "https://a:b@example.com", "https://example.com/admin", "https://example.com/?x=1", "https://example.com/#x"]) assert.throws(() => parseOperatorAddress(value));
});

test("Owner rotation, operator read-only access, old link rejection and reset URLs", async () => {
  const originals = [];
  const mock = (model, key, value) => { originals.push(() => { model[key] = value.original; }); model[key] = value.fn; };
  const replace = (model, key, fn) => mock(model, key, { original: model[key], fn });
  let settings = { key: "singleton", publicBaseUrl: "http://169.58.173.197:8080" };
  let createdSessions = 0, deletedSessions = 0;
  const makeUser = role => ({ id: role, _id: role, name: role, role, active: true,
    email: `${role}@example.test`, async comparePassword(p) { return p === "valid-password"; },
    async save() {}, toSafeObject() { return { id: this.id, role: this.role, username: this.email }; } });
  const owner = makeUser("owner"), operator = makeUser("operator"), consultant = makeUser("consultant");
  let signedIn = owner;
  replace(AgencySettings, "findOne", () => ({ lean: async () => ({ ...settings }) }));
  replace(AgencySettings, "updateOne", async (_query, update) => { if (update.$set && !settings.operatorAccessRoute) Object.assign(settings, update.$set); });
  replace(AgencySettings, "findOneAndUpdate", (_query, update) => ({ lean: async () => { Object.assign(settings, update.$set); return { ...settings }; } }));
  replace(Session, "findOne", async () => ({ userId: "session-user" }));
  replace(Session, "create", async () => { createdSessions++; });
  replace(Session, "deleteMany", async () => { deletedSessions++; });
  replace(User, "findById", async id => id === "consultant" ? consultant : signedIn);
  replace(User, "findOne", async query => query.email === owner.email ? owner : operator);
  replace(User, "find", async () => [owner, operator]);
  replace(Activity, "create", async () => {});
  const app = express(); app.use(express.json());
  app.use("/api/operator-access", operatorRoutes); app.use("/api/auth", authRoutes); app.use("/api/admin", adminRoutes);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  const server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve));
  const request = async (path, method = "GET", body, cookie = true) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: "macruf_session=test" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json(), headers: response.headers };
  };
  try {
    const initial = await operatorSettings();
    assert.equal((await operatorSettings()).operatorAccessRoute, initial.operatorAccessRoute);
    assert.equal((await request("/api/operator-access", "GET", undefined, false)).status, 401);
    const changed = await request("/api/operator-access", "PATCH", { route: "/operator-access" });
    assert.equal(changed.status, 200); assert.equal(changed.data.url, "http://169.58.173.197:8080/operator-access");
    assert.equal(changed.headers.get("cache-control"), "no-store");
    signedIn = operator;
    assert.equal((await request("/api/operator-access")).data.route, "/operator-access");
    assert.equal((await request("/api/operator-access", "PATCH", { route: "/hijacked" })).status, 403);
    assert.equal((await request("/api/operator-access", "PATCH", { regenerate: true })).status, 403);
    const login = (path, username = operator.email, extra = {}) => request("/api/auth/login", "POST", { username, password: "valid-password", accessPath: path, ...extra }, false);
    assert.equal((await login("/admin")).status, 403);
    assert.equal((await login("/portal/old-token", operator.email, { linkToken: "old-token" })).status, 403);
    assert.equal((await login("/operator-access")).status, 200);
    signedIn = owner;
    const regenerated = await request("/api/operator-access", "PATCH", { regenerate: true });
    assert.equal(regenerated.status, 200); assert.notEqual(regenerated.data.route, "/operator-access");
    assert.equal(deletedSessions, 0, "route changes preserve existing sessions");
    assert.equal((await request("/api/operator-access/validate?path=/operator-access")).status, 404);
    assert.equal((await request(`/api/operator-access/validate?path=${regenerated.data.route}`)).status, 200);
    assert.equal((await login("/operator-access")).status, 403);
    assert.equal((await login(regenerated.data.route)).status, 200);
    assert.equal((await login("/admin", owner.email)).status, 200);
    assert.equal(createdSessions, 3, "rejected routes never create sessions");
    const users = await request("/api/admin/users");
    assert.equal(users.data.users[1].loginUrl, regenerated.data.url);
    assert.equal(users.data.users[0].loginUrl, "http://169.58.173.197:8080/admin");
    const reset = await request("/api/admin/users", "PATCH", { id: "consultant", resetPassword: true });
    assert.equal(reset.status, 200); assert.ok(reset.data.temporaryPassword);
    assert.equal(reset.data.user.loginUrl, regenerated.data.url);
    assert.equal(deletedSessions, 1, "password reset still revokes the target sessions");
    assert.equal((await request("/api/operator-access", "PATCH", { route: "/admin" })).status, 400);
    assert.equal(settings.operatorAccessRoute, regenerated.data.route);
    const domain = await request("/api/operator-access", "PATCH", { address: "staff.example.com" });
    assert.equal(domain.status, 200);
    assert.equal(domain.data.url, "https://staff.example.com/");
    assert.equal((await request("/api/operator-access/validate?path=/")).status, 200);
    // Use a separate username to avoid the intentional sign-in rate limit.
    assert.equal((await login("/", "staff@example.test")).status, 200);
    assert.equal((await request(`/api/operator-access/validate?path=${regenerated.data.route}`)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    originals.reverse().forEach(restore => restore());
  }
});
