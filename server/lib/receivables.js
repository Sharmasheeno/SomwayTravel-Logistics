import Branch from "../models/Branch.js";
import Cargo from "../models/Cargo.js";
import Client from "../models/Client.js";
import Payment from "../models/Payment.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import { getUserBranchScope } from "./branches.js";
import {
  cargoCustomerCharge,
  deriveCustomerFinanceSummary,
} from "./finance.js";

const moneyRound = (value) => Math.round((Number(value) || 0) * 100) / 100;
const id = (value) => value?.toString?.() || String(value || "");

const dateOnly = (value) => String(value || "").slice(0, 10);

export const agingBucket = (days) =>
  days <= 0
    ? "current"
    : days <= 30
      ? "1-30"
      : days <= 60
        ? "31-60"
        : days <= 90
          ? "61-90"
          : "90+";

const daysBetween = (from, to) => {
  const start = Date.parse(`${dateOnly(from)}T00:00:00.000Z`);
  const end = Date.parse(`${dateOnly(to)}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
};

export const deriveReceivables = ({
  tickets,
  cargo,
  visas,
  payments,
  clients,
  branches,
  asOf,
}) => {
  const clientsById = new Map(
    clients.flatMap((client) =>
      [id(client._id), id(client.id)]
        .filter(Boolean)
        .map((clientId) => [clientId, client]),
    ),
  );
  const branchesById = new Map(
    branches.map((branch) => [id(branch._id || branch.id), branch]),
  );
  const paymentsByTransaction = new Map();
  for (const payment of payments) {
    const key = `${payment.transactionType}:${payment.transactionId}`;
    const group = paymentsByTransaction.get(key) || [];
    group.push(payment);
    paymentsByTransaction.set(key, group);
  }

  const rows = [];
  const add = ({
    service,
    record,
    branchId,
    clientId,
    customer,
    reference,
    transactionDate,
    totalCharge,
    payerResolved = true,
  }) => {
    if (record.type === "Refund") return;
    if (
      service === "Cargo" &&
      ["cancelled", "canceled"].includes(String(record.status || "").toLowerCase())
    )
      return;
    if (asOf && dateOnly(transactionDate) > dateOnly(asOf)) return;
    const transactionType = service.toLowerCase();
    const summary = deriveCustomerFinanceSummary({
      totalCharge,
      payments: paymentsByTransaction.get(`${transactionType}:${record.id}`),
      asOf,
    });
    const ageDays = daysBetween(transactionDate, asOf);
    const client = clientsById.get(id(clientId));
    const branch = branchesById.get(id(branchId));
    rows.push({
      id: `${transactionType}:${record.id}`,
      transactionType,
      transactionId: record.id,
      service,
      reference,
      branchId: id(branchId),
      branch: branch?.name || record.office || record.origin || "Unassigned",
      clientId: id(clientId),
      customer: client?.name || customer || "Unresolved payer",
      payerResolved: Boolean(clientId && payerResolved),
      transactionDate: dateOnly(transactionDate),
      ...summary,
      amountPaid: summary.totalPaid,
      currency: record.currency,
      ageDays,
      aging: agingBucket(ageDays),
    });
  };

  for (const record of tickets) {
    add({
      service: "Ticket",
      record,
      branchId: record.branchId,
      clientId: record.clientId,
      customer: record.passenger,
      reference: record.ref,
      transactionDate: record.saleDate,
      totalCharge: Number(record.amount) || 0,
    });
  }
  for (const record of visas) {
    add({
      service: "Visa",
      record,
      branchId: record.branchId,
      clientId: record.clientId,
      customer: record.applicant,
      reference: record.ref,
      transactionDate: record.appDate,
      totalCharge: Number(record.amount) || 0,
    });
  }
  for (const record of cargo) {
    const payerClientId = record.payerClientId;
    add({
      service: "Cargo",
      record,
      branchId: record.originBranchId,
      clientId: payerClientId,
      customer:
        record.paymentResponsibility === "receiver"
          ? record.receiver
          : record.paymentResponsibility === "sender"
            ? record.sender
            : "Unresolved payer",
      reference: record.tracking,
      transactionDate: record.dateIn,
      totalCharge: cargoCustomerCharge(record),
      payerResolved: Boolean(record.paymentResponsibility),
    });
  }
  return rows.sort(
    (a, b) =>
      b.ageDays - a.ageDays ||
      String(b.transactionDate).localeCompare(a.transactionDate),
  );
};

export const listReceivables = async ({ user, filters = {} }) => {
  const [tickets, cargo, visas, payments, clients, branches] =
    await Promise.all([
      Ticket.find({ recordStatus: { $ne: "archived" } }).lean(),
      Cargo.find({}).lean(),
      Visa.find({ recordStatus: { $ne: "archived" } }).lean(),
      Payment.find({ status: { $ne: "void" } }).lean(),
      Client.find({}).lean(),
      Branch.find({}).lean(),
    ]);
  const asOf = dateOnly(filters.asOf || new Date().toISOString());
  const scope = getUserBranchScope(user);
  const requestedBranch = String(filters.branchId || "");
  const branchId =
    scope.kind === "branch" ? scope.branchId : requestedBranch || "";
  const service = String(filters.service || "").toLowerCase();
  const currency = String(filters.currency || "").toUpperCase();
  const status = String(filters.status || "outstanding").toLowerCase();
  const aging = String(filters.aging || "").toLowerCase();
  const customer = String(filters.customer || "")
    .trim()
    .toLowerCase();
  const from = dateOnly(filters.from || "");
  const to = dateOnly(filters.to || "");
  return filterReceivables(
    deriveReceivables({
    tickets,
    cargo,
    visas,
    payments,
    clients,
    branches,
      asOf,
    }),
    {
      branchId,
      service,
      currency,
      status,
      aging,
      customer,
      from,
      to,
    },
  );
};

export const filterReceivables = (rows, filters = {}) => {
  const branchId = String(filters.branchId || "");
  const service = String(filters.service || "").toLowerCase();
  const currency = String(filters.currency || "").toUpperCase();
  const status = String(filters.status || "outstanding").toLowerCase();
  const aging = String(filters.aging || "").toLowerCase();
  const customer = String(filters.customer || "").trim().toLowerCase();
  const from = dateOnly(filters.from || "");
  const to = dateOnly(filters.to || "");
  return rows.filter(
    (row) =>
      (!branchId || row.branchId === branchId) &&
      (!service || row.transactionType === service) &&
      (!currency || row.currency === currency) &&
      (status === "all" ||
        (["open", "outstanding"].includes(status)
          ? row.paymentStatus !== "paid"
          : row.paymentStatus === status)) &&
      (!aging || row.aging === aging) &&
      (!customer || row.customer.toLowerCase().includes(customer)) &&
      (!from || row.transactionDate >= from) &&
      (!to || row.transactionDate <= to),
  );
};

export const summarizeReceivables = (rows) => {
  const summary = {};
  for (const row of rows) {
    const current = summary[row.currency] || {
      currency: row.currency,
      totalCharges: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      outstandingRecords: 0,
      records: 0,
    };
    current.totalCharges = moneyRound(current.totalCharges + row.totalCharge);
    current.totalPaid = moneyRound(current.totalPaid + row.totalPaid);
    current.totalOutstanding = moneyRound(
      current.totalOutstanding + row.accountsReceivable,
    );
    current.outstandingRecords += row.accountsReceivable > 0 ? 1 : 0;
    current.records += 1;
    summary[row.currency] = current;
  }
  return summary;
};

export const getAccountsReceivableSummary = async ({
  user,
  filters = {},
} = {}) => {
  const rows = await listReceivables({ user, filters });
  const summary = summarizeReceivables(rows);
  return {
    rows,
    summary,
    totals: Object.values(summary).map((row) => ({
      ...row,
      totalCharge: row.totalCharges,
      amountPaid: row.totalPaid,
      balanceDue: row.totalOutstanding,
    })),
  };
};
