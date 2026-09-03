import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKUP_COLLECTIONS,
  BACKUP_SCHEMA_VERSION,
  backupCollectionChecksum,
  backupDigest,
  stableStringify,
  validateBusinessBackup,
} from "../server/lib/backup.js";

const validBackup = () => {
  const data = Object.fromEntries(
    BACKUP_COLLECTIONS.map(([name]) => [name, []]),
  );
  data.branches = [
    {
      _id: "68b500000000000000000001",
      name: "Nairobi Office",
      code: "NBO",
      defaultCurrency: "KES",
      allowedCurrencies: ["KES", "USD"],
    },
  ];
  const collections = Object.fromEntries(
    BACKUP_COLLECTIONS.map(([name]) => [
      name,
      {
        count: data[name].length,
        checksum: backupCollectionChecksum(data[name]),
      },
    ]),
  );
  return {
    manifest: {
      format: "macruf-business-backup",
      schemaVersion: BACKUP_SCHEMA_VERSION,
      createdAt: "2026-09-01T00:00:00.000Z",
      agency: { name: "Macruf Travel and Cargo Agency" },
      collections,
      excludes: ["users", "sessions", "passwords", "tokens", "secrets"],
    },
    data,
  };
};

test("stable backup encoding does not depend on object key order", () => {
  assert.equal(
    stableStringify({ b: 2, a: 1 }),
    stableStringify({ a: 1, b: 2 }),
  );
});

test("versioned business backup validates all required collections", () => {
  const backup = validBackup();
  const result = validateBusinessBackup(backup);
  assert.equal(result.valid, true);
  assert.equal(result.schemaVersion, BACKUP_SCHEMA_VERSION);
  assert.equal(result.counts.branches, 1);
  assert.equal(result.digest, backupDigest(backup));
});

test("backup validation rejects a missing business collection", () => {
  const backup = validBackup();
  delete backup.data.payments;
  assert.throws(() => validateBusinessBackup(backup), /payments is missing/i);
});

test("backup validation rejects data changed after export", () => {
  const backup = validBackup();
  backup.data.branches[0].name = "Tampered Branch";
  assert.throws(() => validateBusinessBackup(backup), /checksum.*branches/i);
});

test("backup deliberately excludes credentials and sessions", () => {
  const backup = validBackup();
  assert.equal("users" in backup.data, false);
  assert.equal("sessions" in backup.data, false);
  assert.ok(backup.manifest.excludes.includes("secrets"));
});
