import assert from "node:assert/strict";
import test from "node:test";

import {
  countEntities,
  describeSafetyViolations,
  evaluateWriteSafety,
  validateAgencySnapshotShape,
} from "../server/lib/dataSafety.js";

const rows = (count) => Array.from({ length: count }, (_, index) => ({ id: `row-${index}` }));

test("countEntities treats missing collections as empty", () => {
  assert.deepEqual(countEntities({ tickets: rows(2), cargo: rows(1) }), {
    tickets: 2,
    cargo: 1,
    visas: 0,
    expenses: 0,
    suppliers: 0,
    clients: 0,
    closes: 0,
    rates: 0,
    startingBalances: 0,
    activities: 0,
  });
});

test("evaluateWriteSafety allows ordinary incremental deletes", () => {
  const result = evaluateWriteSafety({ tickets: rows(6) }, { tickets: rows(5) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test("validateAgencySnapshotShape rejects missing collections", () => {
  const result = validateAgencySnapshotShape({ tickets: [] });
  assert.equal(result.ok, false);
  assert.ok(result.missingCollections.includes("cargo"));
  assert.ok(result.missingCollections.includes("activities"));
});

test("validateAgencySnapshotShape accepts complete snapshots", () => {
  const result = validateAgencySnapshotShape({
    tickets: [],
    cargo: [],
    visas: [],
    expenses: [],
    suppliers: [],
    clients: [],
    closes: [],
    rates: [],
    startingBalances: [],
    activities: [],
  });
  assert.equal(result.ok, true);
});

test("evaluateWriteSafety blocks wiping populated protected collections", () => {
  const result = evaluateWriteSafety({ tickets: rows(5), cargo: rows(4) }, { tickets: [], cargo: [] });
  assert.equal(result.ok, false);
  assert.deepEqual(result.violations, [{ collection: "tickets", currentCount: 5, incomingCount: 0 }]);
});

test("evaluateWriteSafety blocks large proportional drops", () => {
  const result = evaluateWriteSafety({ clients: rows(30) }, { clients: rows(14) });
  assert.equal(result.ok, false);
  assert.deepEqual(result.violations, [{ collection: "clients", currentCount: 30, incomingCount: 14 }]);
});

test("evaluateWriteSafety can be explicitly bypassed for controlled maintenance", () => {
  const result = evaluateWriteSafety({ tickets: rows(20) }, { tickets: [] }, { allowLargeDeletes: true });
  assert.equal(result.ok, true);
});

test("describeSafetyViolations produces operator-safe details", () => {
  assert.equal(
    describeSafetyViolations([{ collection: "tickets", currentCount: 5, incomingCount: 0 }]),
    "tickets: 5 existing -> 0 incoming",
  );
});
