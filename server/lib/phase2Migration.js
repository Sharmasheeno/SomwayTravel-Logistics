import Branch from "../models/Branch.js";
import Cargo from "../models/Cargo.js";
import Client from "../models/Client.js";
import DailyClose from "../models/DailyClose.js";
import Expense from "../models/Expense.js";
import Rate from "../models/Rate.js";
import StartingBalance from "../models/StartingBalance.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Visa from "../models/Visa.js";
import { findBranchByOffice, seedCoreBranches } from "./branches.js";

const stats = () => ({ scanned: 0, changed: 0, skipped: 0, unresolved: [] });

const backfillOfficeEntity = async (Model, officeField, branchField) => {
  const result = stats();
  const rows = await Model.find({});
  for (const row of rows) {
    result.scanned += 1;
    if (row[branchField]) {
      result.skipped += 1;
      continue;
    }
    const branch = await findBranchByOffice(row[officeField]);
    if (!branch) {
      result.unresolved.push(`${Model.modelName}:${row.id || row._id}`);
      continue;
    }
    row[branchField] = branch._id;
    await row.save();
    result.changed += 1;
  }
  return result;
};

const backfillCargo = async () => {
  const result = stats();
  const rows = await Cargo.find({});
  for (const row of rows) {
    result.scanned += 1;
    const origin = row.originBranchId ? null : await findBranchByOffice(row.origin);
    const destination = row.destinationBranchId ? null : await findBranchByOffice(row.destination);
    const paidBy = row.paidByBranchId ? null : await findBranchByOffice(row.paidByOffice);
    if ((!row.originBranchId && !origin) || (!row.destinationBranchId && !destination) || (!row.paidByBranchId && !paidBy)) {
      result.unresolved.push(`Cargo:${row.id || row._id}`);
      continue;
    }
    let changed = false;
    if (!row.originBranchId && origin) {
      row.originBranchId = origin._id;
      changed = true;
    }
    if (!row.destinationBranchId && destination) {
      row.destinationBranchId = destination._id;
      changed = true;
    }
    if (!row.paidByBranchId && paidBy) {
      row.paidByBranchId = paidBy._id;
      changed = true;
    }
    if (changed) {
      await row.save();
      result.changed += 1;
    } else {
      result.skipped += 1;
    }
  }
  return result;
};

const backfillUsers = async () => {
  const result = stats();
  const nairobi = await Branch.findOne({ code: "NBO" });
  const mogadishu = await Branch.findOne({ code: "MOG" });
  const rows = await User.find({});
  for (const row of rows) {
    result.scanned += 1;
    if (row.role === "officer_nairobi") {
      row.role = "operator";
      row.assignedBranchId = nairobi?._id || null;
      await row.save();
      result.changed += 1;
      continue;
    }
    if (row.role === "officer_mogadishu") {
      row.role = "operator";
      row.assignedBranchId = mogadishu?._id || null;
      await row.save();
      result.changed += 1;
      continue;
    }
    if (row.role === "operator" && !row.assignedBranchId) {
      result.unresolved.push(`User:${row.email}`);
      continue;
    }
    result.skipped += 1;
  }
  return result;
};

export const runPhase2Migration = async () => {
  const branches = await seedCoreBranches();
  return {
    branches,
    users: await backfillUsers(),
    tickets: await backfillOfficeEntity(Ticket, "office", "branchId"),
    visas: await backfillOfficeEntity(Visa, "office", "branchId"),
    expenses: await backfillOfficeEntity(Expense, "office", "branchId"),
    clients: await backfillOfficeEntity(Client, "homeOffice", "homeBranchId"),
    closes: await backfillOfficeEntity(DailyClose, "office", "branchId"),
    ratesOrigin: await backfillOfficeEntity(Rate, "origin", "originBranchId"),
    ratesDestination: await backfillOfficeEntity(Rate, "destination", "destinationBranchId"),
    startingBalances: await backfillOfficeEntity(StartingBalance, "office", "branchId"),
    cargo: await backfillCargo(),
  };
};
