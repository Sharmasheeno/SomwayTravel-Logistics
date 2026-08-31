import assert from "node:assert/strict";
import test from "node:test";

import { redactMongoUri } from "../server/config/db.js";
import { createFixedWindowRateLimiter } from "../server/lib/rateLimit.js";
import { publicCargoPayload, publicVisaPayload } from "../server/lib/publicTracking.js";

test("Mongo URI redaction hides credentials", () => {
  const redacted = redactMongoUri("mongodb+srv://user:secret@example.mongodb.net/macruf");
  assert.equal(redacted.includes("secret"), false);
  assert.equal(redacted.includes("user"), false);
  assert.match(redacted, /mongodb\+srv:\/\/\*\*\*\*:\*\*\*\*@/);
});

test("public tracking rate limiter blocks excess requests", () => {
  const limit = createFixedWindowRateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(limit("ip-a", 100).allowed, true);
  assert.equal(limit("ip-a", 200).allowed, true);
  assert.equal(limit("ip-a", 300).allowed, false);
  assert.equal(limit("ip-a", 1200).allowed, true);
});

test("public cargo payload excludes private fields", () => {
  const payload = publicCargoPayload({
    tracking: "NBO-11111",
    origin: "Nairobi",
    destination: "Mogadishu",
    status: "arrived",
    dateIn: "2026-08-30",
    updatedAt: "2026-08-31T10:00:00.000Z",
    statusHistory: [{ toStatus: "received", at: "2026-08-30T10:00:00.000Z", note: "private staff note" }, { toStatus: "arrived", at: "2026-08-31T10:00:00.000Z" }],
    cost: 500,
    senderPhone: "+254700000000",
    notes: "private",
  });
  assert.deepEqual(Object.keys(payload).sort(), ["date", "destination", "kind", "lastUpdated", "origin", "reference", "status", "statusKey", "timeline"]);
  assert.equal(payload.status, "Arrived");
  assert.deepEqual(payload.timeline, [
    { status: "received", label: "Received", at: "2026-08-30T10:00:00.000Z" },
    { status: "arrived", label: "Arrived", at: "2026-08-31T10:00:00.000Z" },
  ]);
});

test("public visa payload excludes private fields", () => {
  const payload = publicVisaPayload({
    ref: "VIS-N-11111",
    destination: "UAE",
    visaType: "Tourist",
    status: "Submitted",
    appDate: "2026-08-30",
    office: "Nairobi",
    phone: "+254700000000",
    email: "client@example.com",
    cost: 100,
  });
  assert.deepEqual(Object.keys(payload).sort(), ["date", "destination", "kind", "office", "reference", "status", "visaType"]);
});
