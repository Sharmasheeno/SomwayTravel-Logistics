import test from "node:test";
import assert from "node:assert/strict";
import { resolveApiBase } from "../app/lib/api-origin.js";

test("public visitors use the domain proxy instead of server loopback", () => {
  for (const base of ["http://127.0.0.1:5000", "http://localhost:5000", "http://[::1]:5000"]) {
    assert.equal(resolveApiBase(base, "somwaytravel.com"), "");
  }
});
test("same-origin deployments and valid separate API deployments are retained", () => {
  assert.equal(resolveApiBase("", "somwaytravel.com"), "");
  assert.equal(resolveApiBase("api.example.com/", "example.com"), "https://api.example.com");
  assert.equal(resolveApiBase("http://localhost:5000", "localhost"), "http://localhost:5000");
});
