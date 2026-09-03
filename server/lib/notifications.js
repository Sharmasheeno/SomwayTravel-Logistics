import Cargo from "../models/Cargo.js";
import Payment from "../models/Payment.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import { getUserBranchScope } from "./branches.js";
import { cargoStatusLabel, normalizeCargoStatus } from "./cargoWorkflow.js";
import { cargoCustomerCharge, deriveCustomerFinanceSummary } from "./finance.js";

// A record sitting untouched for this long is worth surfacing. Kept modest so
// the bell stays useful rather than becoming a list nobody reads.
const STALE_DAYS = 3;
const OVERDUE_DAYS = 7;
const MAX_ITEMS = 40;

const dateOnly = (value) => String(value || "").slice(0, 10);
const money = (amount, currency) =>
  `${currency} ${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const daysSince = (dateString, now) => {
  const date = dateOnly(dateString);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 0;
  const then = Date.parse(`${date}T00:00:00.000Z`);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / 86400000));
};

// Severity drives both ordering and the dot colour in the panel.
const RANK = { high: 0, medium: 1, low: 2 };

export const buildNotifications = async ({ user, now = new Date() }) => {
  const scope = getUserBranchScope(user);
  if (scope.kind === "none") return { generatedAt: now.toISOString(), items: [] };

  const inScope = (...branchIds) =>
    scope.kind !== "branch" ||
    branchIds.some((branchId) => String(branchId || "") === scope.branchId);

  const [tickets, visas, cargo, payments] = await Promise.all([
    Ticket.find({ recordStatus: { $ne: "archived" } }).lean(),
    Visa.find({ recordStatus: { $ne: "archived" } }).lean(),
    Cargo.find({}).lean(),
    Payment.find({ status: { $ne: "void" } }).lean(),
  ]);

  const paymentsByTransaction = new Map();
  for (const payment of payments) {
    const key = `${payment.transactionType}:${payment.transactionId}`;
    if (!paymentsByTransaction.has(key)) paymentsByTransaction.set(key, []);
    paymentsByTransaction.get(key).push(payment);
  }

  const items = [];
  const asOf = dateOnly(now.toISOString());

  const addOutstanding = ({ type, page, record, charge, reference, who, date }) => {
    if (!(charge > 0)) return;
    const { accountsReceivable } = deriveCustomerFinanceSummary({
      totalCharge: charge,
      payments: paymentsByTransaction.get(`${type}:${record.id}`) || [],
      asOf,
    });
    if (!(accountsReceivable > 0)) return;
    const age = daysSince(date, now);
    items.push({
      id: `outstanding:${type}:${record.id}`,
      kind: "outstanding",
      severity: age >= OVERDUE_DAYS ? "high" : "medium",
      title: age >= OVERDUE_DAYS ? "Payment overdue" : "Awaiting payment",
      reference,
      detail: `${who} · ${money(accountsReceivable, record.currency)} outstanding${
        age ? ` · ${age} day${age === 1 ? "" : "s"} old` : ""
      }`,
      page,
      recordId: record.id,
      at: dateOnly(date),
      ageDays: age,
    });
  };

  for (const ticket of tickets) {
    if (!inScope(ticket.branchId)) continue;
    if (ticket.type === "Refund") continue;
    addOutstanding({
      type: "ticket",
      page: "tickets",
      record: ticket,
      charge: Number(ticket.amount) || 0,
      reference: ticket.ref,
      who: ticket.passenger || "Passenger",
      date: ticket.saleDate,
    });
  }

  for (const visa of visas) {
    if (!inScope(visa.branchId)) continue;
    if (visa.type !== "Refund") {
      addOutstanding({
        type: "visa",
        page: "visas",
        record: visa,
        charge: Number(visa.amount) || 0,
        reference: visa.ref,
        who: visa.applicant || "Applicant",
        date: visa.appDate,
      });
    }
    const age = daysSince(visa.appDate, now);
    if (visa.status === "submitted" && age >= STALE_DAYS) {
      items.push({
        id: `visa-pending:${visa.id}`,
        kind: "visa",
        severity: "low",
        title: "Visa still submitted",
        reference: visa.ref,
        detail: `${visa.applicant || "Applicant"} · ${
          visa.destination || "Destination"
        } · no decision in ${age} days`,
        page: "visas",
        recordId: visa.id,
        at: dateOnly(visa.appDate),
        ageDays: age,
      });
    }
  }

  for (const shipment of cargo) {
    if (!inScope(shipment.originBranchId, shipment.destinationBranchId, shipment.paidByBranchId))
      continue;
    const status = normalizeCargoStatus(shipment.status);
    if (status === "cancelled") continue;

    addOutstanding({
      type: "cargo",
      page: "cargo",
      record: shipment,
      charge: cargoCustomerCharge(shipment),
      reference: shipment.tracking,
      who: shipment.sender || "Sender",
      date: shipment.dateIn,
    });

    const age = daysSince(shipment.dateIn, now);
    if (status !== "delivered" && age >= STALE_DAYS) {
      items.push({
        id: `cargo-stale:${shipment.id}`,
        kind: "cargo",
        severity: status === "claim" ? "high" : "medium",
        title:
          status === "claim" ? "Cargo claim open" : `Cargo still ${cargoStatusLabel(status).toLowerCase()}`,
        reference: shipment.tracking,
        detail: `${shipment.origin} to ${shipment.destination} · ${age} days since intake`,
        page: "cargo",
        recordId: shipment.id,
        at: dateOnly(shipment.dateIn),
        ageDays: age,
      });
    }
  }

  items.sort(
    (a, b) => RANK[a.severity] - RANK[b.severity] || b.ageDays - a.ageDays,
  );

  return {
    generatedAt: now.toISOString(),
    total: items.length,
    items: items.slice(0, MAX_ITEMS),
  };
};

export default buildNotifications;
