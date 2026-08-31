import assert from "node:assert/strict";
import test from "node:test";

import { normalizePhoneDetails } from "../server/lib/phone.js";

test("Somalia local and international forms normalize to one canonical phone", () => {
  const context = { country: "SO" };
  assert.equal(normalizePhoneDetails("0612345678", context).normalizedPhone, "+252612345678");
  assert.equal(normalizePhoneDetails("612345678", context).normalizedPhone, "+252612345678");
  assert.equal(normalizePhoneDetails("+252612345678").normalizedPhone, "+252612345678");
  assert.equal(normalizePhoneDetails("00252612345678").normalizedPhone, "+252612345678");
});

test("Kenya local and international forms normalize to one canonical phone", () => {
  const context = { country: "KE" };
  assert.equal(normalizePhoneDetails("0712345678", context).normalizedPhone, "+254712345678");
  assert.equal(normalizePhoneDetails("712345678", context).normalizedPhone, "+254712345678");
  assert.equal(normalizePhoneDetails("+254712345678").normalizedPhone, "+254712345678");
  assert.equal(normalizePhoneDetails("00254712345678").normalizedPhone, "+254712345678");
});

test("local-looking phone without country context is unresolved", () => {
  const result = normalizePhoneDetails("0712345678");
  assert.equal(result.isValid, false);
  assert.equal(result.normalizedPhone, "");
});

test("invalid phone stays unresolved", () => {
  const result = normalizePhoneDetails("12345", { country: "SO" });
  assert.equal(result.isValid, false);
  assert.equal(result.normalizedPhone, "");
});
