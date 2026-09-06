import Ticket from "../models/Ticket.js";
import Cargo from "../models/Cargo.js";
import Visa from "../models/Visa.js";
import Expense from "../models/Expense.js";
import Supplier from "../models/Supplier.js";
import Client from "../models/Client.js";
import DailyClose from "../models/DailyClose.js";
import Rate from "../models/Rate.js";
import StartingBalance from "../models/StartingBalance.js";
import Activity from "../models/Activity.js";
import AgencySettings from "../models/AgencySettings.js";
import Branch from "../models/Branch.js";
import BranchPaymentMethod from "../models/BranchPaymentMethod.js";
import Payment from "../models/Payment.js";
import PaymentMethod from "../models/PaymentMethod.js";
import SupplierPayment from "../models/SupplierPayment.js";
import { getUserBranchScope, plainBranch } from "./branches.js";
import { normalizeServiceStatus } from "./serviceWorkflow.js";
import {
  cargoCustomerCharge,
  deriveCustomerFinanceSummary,
} from "./finance.js";

export const OFFICE_SCOPED_MODELS = {
  tickets: Ticket,
  visas: Visa,
  expenses: Expense,
  closes: DailyClose,
};

export const SHARED_MODELS = {
  cargo: Cargo,
  suppliers: Supplier,
  rates: Rate,
  startingBalances: StartingBalance,
};

export const ALL_ENTITY_MODELS = {
  ...OFFICE_SCOPED_MODELS,
  ...SHARED_MODELS,
  clients: Client,
  activities: Activity,
};

export const officeForRole = (role) =>
  role === "officer_nairobi"
    ? "Nairobi"
    : role === "officer_mogadishu"
      ? "Mogadishu"
      : null;

export const toPlain = (doc) => {
  const object = doc.toObject ? doc.toObject() : doc;
  const rest = { ...object };
  delete rest._id;
  delete rest.__v;
  return rest;
};

const moneyRound = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const defaultAgencyData = {
  agencyName: "SomWay Travel & Logistics",
  users: [],
  tickets: [],
  cargo: [],
  visas: [],
  expenses: [],
  suppliers: [],
  clients: [],
  closes: [],
  rates: [],
  startingBalances: [],
  paymentMethods: [],
  branchPaymentMethods: [],
  payments: [],
  supplierPayments: [],
  activities: [],
  branches: [],
};

export const readAgencyData = async () => {
  const [
    agencyName,
    tickets,
    cargo,
    visas,
    expenses,
    suppliers,
    clients,
    closes,
    rates,
    startingBalances,
    activities,
    branches,
    paymentMethods,
    branchPaymentMethods,
    payments,
    supplierPayments,
  ] = await Promise.all([
    AgencySettings.findOne({ key: "singleton" }).then(
      (row) => row?.agencyName || defaultAgencyData.agencyName,
    ),
    Ticket.find({ recordStatus: { $ne: "archived" } }),
    Cargo.find({}),
    Visa.find({ recordStatus: { $ne: "archived" } }),
    Expense.find({}),
    Supplier.find({}),
    Client.find({ isActive: { $ne: false } }),
    DailyClose.find({}),
    Rate.find({}),
    StartingBalance.find({}),
    Activity.find({}).sort({ at: -1 }).limit(500),
    Branch.find({}).sort({ name: 1 }),
    PaymentMethod.find({}).sort({ name: 1 }),
    BranchPaymentMethod.find({}),
    Payment.find({}).sort({ paymentDate: -1, createdAt: -1 }),
    SupplierPayment.find({}).sort({ paymentDate: -1, createdAt: -1 }),
  ]);

  const paymentMethodIdByMongoId = new Map(
    paymentMethods.map((method) => [method._id.toString(), method.id]),
  );
  const paymentsByTransaction = new Map();
  for (const payment of payments) {
    const key = `${payment.transactionType}:${payment.transactionId}`;
    const group = paymentsByTransaction.get(key) || [];
    group.push(payment);
    paymentsByTransaction.set(key, group);
  }
  const withCustomerFinance = (transactionType, item) => {
    const plain = toPlain(item);
    const total =
      transactionType === "cargo"
        ? cargoCustomerCharge(plain)
        : moneyRound(plain.amount || 0);
    const transactionPayments =
      paymentsByTransaction.get(`${transactionType}:${plain.id}`) || [];
    const summary = deriveCustomerFinanceSummary({
      totalCharge: total,
      payments: transactionPayments,
    });
    const latestPaymentDate = transactionPayments
      .filter((payment) => payment.status !== "void")
      .reduce(
        (latest, payment) =>
          String(payment.paymentDate || "") > latest
            ? String(payment.paymentDate || "")
            : latest,
        "",
      );
    return {
      ...plain,
      ...(transactionType === "ticket"
        ? { status: normalizeServiceStatus("ticket", plain.status) }
        : transactionType === "visa"
          ? { status: normalizeServiceStatus("visa", plain.status) }
          : {}),
      ...summary,
      amountPaid: summary.totalPaid,
      balance: summary.balanceDue,
      paid: summary.paymentStatus === "paid",
      paymentDate: latestPaymentDate || plain.paymentDate || "",
    };
  };

  return {
    agencyName,
    tickets: tickets.map((row) => withCustomerFinance("ticket", row)),
    cargo: cargo.map((row) => withCustomerFinance("cargo", row)),
    visas: visas.map((row) => withCustomerFinance("visa", row)),
    expenses: expenses.map(toPlain),
    suppliers: suppliers.map(toPlain),
    clients: clients.map(toPlain),
    closes: closes.map(toPlain),
    rates: rates.map(toPlain),
    startingBalances: startingBalances.map(toPlain),
    activities: activities.map(toPlain),
    branches: branches.map(plainBranch),
    paymentMethods: paymentMethods.map(toPlain),
    branchPaymentMethods: branchPaymentMethods.map((row) => {
      const plain = toPlain(row);
      return {
        ...plain,
        branchId: row.branchId?.toString?.() || String(plain.branchId || ""),
        paymentMethodId:
          paymentMethodIdByMongoId.get(row.paymentMethodId?.toString?.()) ||
          String(plain.paymentMethodId || ""),
      };
    }),
    payments: payments.map(toPlain),
    supplierPayments: supplierPayments.map(toPlain),
  };
};

const hideCost = (items) => (items || []).map((item) => ({ ...item, cost: 0 }));

const sameBranch = (item, field, branchId) =>
  String(item?.[field] || "") === branchId;

export const visibleData = (source, userOrRole, safeUsers) => {
  const data = { ...defaultAgencyData, ...source, users: safeUsers };
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  const scope =
    typeof userOrRole === "string"
      ? {
          kind: officeForRole(role)
            ? "legacyOffice"
            : role === "consultant"
              ? "readOnly"
              : "all",
        }
      : getUserBranchScope(userOrRole);
  if (scope.kind === "readOnly") return data;
  if (scope.kind === "branch") {
    const branchId = scope.branchId;
    return {
      ...data,
      branches: (data.branches || []).filter(
        (branch) => branch.id === branchId,
      ),
      tickets: hideCost(
        (data.tickets || []).filter((item) =>
          sameBranch(item, "branchId", branchId),
        ),
      ),
      cargo: hideCost(
        (data.cargo || []).filter(
          (item) =>
            sameBranch(item, "originBranchId", branchId) ||
            sameBranch(item, "destinationBranchId", branchId) ||
            sameBranch(item, "paidByBranchId", branchId),
        ),
      ),
      visas: hideCost(
        (data.visas || []).filter((item) =>
          sameBranch(item, "branchId", branchId),
        ),
      ),
      expenses: (data.expenses || []).filter((item) =>
        sameBranch(item, "branchId", branchId),
      ),
      closes: (data.closes || []).filter((item) =>
        sameBranch(item, "branchId", branchId),
      ),
      suppliers: [],
      rates: [],
      startingBalances: [],
      paymentMethods: data.paymentMethods || [],
      branchPaymentMethods: (data.branchPaymentMethods || []).filter((item) =>
        sameBranch(item, "branchId", branchId),
      ),
      payments: (data.payments || []).filter((item) =>
        sameBranch(item, "branchId", branchId),
      ),
      supplierPayments: [],
      activities: [],
    };
  }
  const office = officeForRole(role);
  if (!office) return data;
  return {
    ...data,
    tickets: hideCost(
      (data.tickets || []).filter((item) => item.office === office),
    ),
    cargo: hideCost(data.cargo || []),
    visas: hideCost(
      (data.visas || []).filter((item) => item.office === office),
    ),
    expenses: (data.expenses || []).filter((item) => item.office === office),
    closes: (data.closes || []).filter((item) => item.office === office),
    suppliers: [],
    rates: [],
    startingBalances: [],
    activities: [],
  };
};
