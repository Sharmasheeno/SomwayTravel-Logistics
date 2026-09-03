import assert from "node:assert/strict";
import test from "node:test";

import Branch from "../server/models/Branch.js";
import { seedCoreBranches } from "../server/lib/branches.js";
import { branchPayload } from "../server/routes/branches.js";

const document = (record) => ({
  ...record,
  toObject() { return { ...this }; },
  async save() { return this; },
});

test("contact-only branch edits preserve allowed currencies across startup seeding", async () => {
  const originalFindOne = Branch.findOne;
  const originalCreate = Branch.create;
  const rows = [
    document({ _id: "nbo", name: "Nairobi Office", code: "NBO", city: "Nairobi", country: "Kenya", defaultCurrency: "KES", allowedCurrencies: ["KES", "USD"], phone: "", email: "", address: "", isActive: true }),
    document({ _id: "mog", name: "Mogadishu Office", code: "MOG", city: "Mogadishu", country: "Somalia", defaultCurrency: "USD", allowedCurrencies: ["USD"], phone: "", email: "", address: "", isActive: true }),
  ];
  Branch.findOne = async ({ code }) => rows.find((row) => row.code === code) || null;
  Branch.create = async (record) => rows.push(document(record));
  try {
    const nbo = rows[0];
    Object.assign(nbo, branchPayload({ phone: "+254700000000", address: "Updated address" }, nbo));
    assert.deepEqual(nbo.allowedCurrencies, ["KES", "USD"]);
    await seedCoreBranches();
    await seedCoreBranches();
    assert.deepEqual(rows.find((row) => row.code === "NBO").allowedCurrencies, ["KES", "USD"]);
    assert.deepEqual(rows.find((row) => row.code === "MOG").allowedCurrencies, ["USD"]);
  } finally {
    Branch.findOne = originalFindOne;
    Branch.create = originalCreate;
  }
});

test("startup seed preserves owner deactivation and currency choices", async () => {
  const originalFindOne = Branch.findOne;
  const originalCreate = Branch.create;
  const nbo = document({ _id: "nbo", name: "Nairobi Office", code: "NBO", city: "Nairobi", country: "Kenya", defaultCurrency: "KES", allowedCurrencies: ["KES"], isActive: false });
  const mog = document({ _id: "mog", name: "Mogadishu Office", code: "MOG", city: "Mogadishu", country: "Somalia", defaultCurrency: "USD", allowedCurrencies: ["USD"], isActive: true });
  Branch.findOne = async ({ code }) => code === "NBO" ? nbo : code === "MOG" ? mog : null;
  Branch.create = async () => { throw new Error("unexpected create"); };
  try {
    await seedCoreBranches();
    assert.equal(nbo.isActive, false);
    assert.deepEqual(nbo.allowedCurrencies, ["KES"]);
  } finally {
    Branch.findOne = originalFindOne;
    Branch.create = originalCreate;
  }
});
