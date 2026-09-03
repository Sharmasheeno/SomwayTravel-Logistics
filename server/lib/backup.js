import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import Activity from "../models/Activity.js";
import AgencySettings from "../models/AgencySettings.js";
import Branch from "../models/Branch.js";
import BranchPaymentMethod from "../models/BranchPaymentMethod.js";
import Cargo from "../models/Cargo.js";
import Client from "../models/Client.js";
import DailyClose from "../models/DailyClose.js";
import DailySummary from "../models/DailySummary.js";
import Expense from "../models/Expense.js";
import Payment from "../models/Payment.js";
import PaymentMethod from "../models/PaymentMethod.js";
import Rate from "../models/Rate.js";
import StartingBalance from "../models/StartingBalance.js";
import Supplier from "../models/Supplier.js";
import SupplierPayment from "../models/SupplierPayment.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";

export const BACKUP_SCHEMA_VERSION = 3;

export const BACKUP_COLLECTIONS = [
  ["agencySettings", AgencySettings],
  ["branches", Branch],
  ["paymentMethods", PaymentMethod],
  ["branchPaymentMethods", BranchPaymentMethod],
  ["clients", Client],
  ["tickets", Ticket],
  ["cargo", Cargo],
  ["visas", Visa],
  ["expenses", Expense],
  ["payments", Payment],
  ["suppliers", Supplier],
  ["supplierPayments", SupplierPayment],
  ["dailyCloses", DailyClose],
  ["dailySummaries", DailySummary],
  ["rates", Rate],
  ["startingBalances", StartingBalance],
  ["activities", Activity],
];

export const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(stableStringify(value)).digest("hex");

export const backupCollectionChecksum = (rows) => sha256(rows);

const plain = (value) => JSON.parse(JSON.stringify(value));

export const backupDigest = (backup) =>
  sha256({ manifest: backup.manifest, data: backup.data });

export const createBusinessBackup = async () => {
  const data = {};
  const collections = {};
  for (const [name, Model] of BACKUP_COLLECTIONS) {
    const rows = plain(await Model.find({}).lean());
    rows.sort((a, b) =>
      String(a.id || a.key || a._id).localeCompare(
        String(b.id || b.key || b._id),
      ),
    );
    data[name] = rows;
    collections[name] = { count: rows.length, checksum: sha256(rows) };
  }
  const settings = data.agencySettings[0];
  return {
    manifest: {
      format: "macruf-business-backup",
      schemaVersion: BACKUP_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      agency: {
        name: settings?.agencyName || "Macruf Travel and Cargo Agency",
      },
      collections,
      excludes: ["users", "sessions", "passwords", "tokens", "secrets"],
    },
    data,
  };
};

export const validateBusinessBackup = (backup) => {
  if (!backup || typeof backup !== "object") {
    throw Object.assign(new Error("Backup document is required."), {
      status: 400,
    });
  }
  if (
    backup.manifest?.format !== "macruf-business-backup" ||
    backup.manifest?.schemaVersion !== BACKUP_SCHEMA_VERSION
  ) {
    throw Object.assign(
      new Error(
        `Backup schema ${BACKUP_SCHEMA_VERSION} is required for restore.`,
      ),
      { status: 400 },
    );
  }
  const counts = {};
  for (const [name] of BACKUP_COLLECTIONS) {
    const rows = backup.data?.[name];
    if (!Array.isArray(rows)) {
      throw Object.assign(
        new Error(`Backup collection ${name} is missing or invalid.`),
        { status: 400 },
      );
    }
    const expected = backup.manifest.collections?.[name];
    if (!expected || expected.count !== rows.length) {
      throw Object.assign(new Error(`Backup count check failed for ${name}.`), {
        status: 400,
      });
    }
    if (expected.checksum !== sha256(rows)) {
      throw Object.assign(
        new Error(`Backup checksum check failed for ${name}.`),
        { status: 400 },
      );
    }
    counts[name] = rows.length;
  }
  return {
    valid: true,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: backup.manifest.createdAt,
    counts,
    digest: backupDigest(backup),
  };
};

const backupDirectory = () =>
  path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), "backups"));

export const writeBackupFile = async (backup, prefix = "macruf-backup") => {
  const directory = backupDirectory();
  await fs.mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(directory, `${prefix}-${stamp}.json`);
  await fs.writeFile(filePath, `${JSON.stringify(backup, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return filePath;
};

const restoreQuery = (row) => {
  if (row._id) return { _id: row._id };
  if (row.id) return { id: row.id };
  if (row.key) return { key: row.key };
  throw Object.assign(new Error("Backup row has no stable identity."), {
    status: 400,
  });
};

export const restoreBusinessBackup = async ({
  backup,
  validationDigest,
  confirmation,
}) => {
  const summary = validateBusinessBackup(backup);
  if (validationDigest !== summary.digest) {
    throw Object.assign(
      new Error("Backup changed after validation. Run the dry-run again."),
      { status: 409 },
    );
  }
  const expectedConfirmation = `RESTORE ${summary.digest.slice(0, 12)}`;
  if (confirmation !== expectedConfirmation) {
    throw Object.assign(
      new Error(`Type ${expectedConfirmation} to confirm this merge restore.`),
      { status: 400 },
    );
  }

  const rollback = await createBusinessBackup();
  const rollbackPath = await writeBackupFile(rollback, "pre-restore-rollback");
  const restored = {};
  for (const [name, Model] of BACKUP_COLLECTIONS) {
    const rows = backup.data[name];
    if (!rows.length) {
      restored[name] = 0;
      continue;
    }
    const operations = rows.map((source) => {
      const row = { ...source };
      delete row.__v;
      const query = restoreQuery(row);
      delete row._id;
      return {
        updateOne: {
          filter: query,
          update: { $set: row },
          upsert: true,
        },
      };
    });
    await Model.bulkWrite(operations, { ordered: true });
    restored[name] = rows.length;
  }
  return { summary, restored, rollbackPath, mode: "merge" };
};
