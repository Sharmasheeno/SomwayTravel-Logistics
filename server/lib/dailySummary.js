import Activity from "../models/Activity.js";
import AgencySettings from "../models/AgencySettings.js";
import Branch from "../models/Branch.js";
import BranchPaymentMethod from "../models/BranchPaymentMethod.js";
import Cargo from "../models/Cargo.js";
import DailySummary from "../models/DailySummary.js";
import Expense from "../models/Expense.js";
import Payment from "../models/Payment.js";
import PaymentMethod from "../models/PaymentMethod.js";
import StartingBalance from "../models/StartingBalance.js";
import Supplier from "../models/Supplier.js";
import SupplierPayment from "../models/SupplierPayment.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import { getUserBranchScope } from "./branches.js";
import { randomToken } from "../utils/tokens.js";
import {
  cargoCustomerCharge,
  deriveCustomerFinanceSummary,
} from "./finance.js";

export const DEFAULT_BUSINESS_TIME = {
  timezone: "Africa/Mogadishu",
  businessDayStart: "07:00",
  businessDayEnd: "18:00",
};

const id = (value) => value?.toString?.() || String(value || "");
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
const dateOnly = (value) => String(value || "").slice(0, 10);
const timeMinutes = (value) => {
  const [hours, minutes] = String(value || "")
    .split(":")
    .map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes)
    ? hours * 60 + minutes
    : 0;
};

export const zonedClock = (instant, timezone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
};

export const businessDayState = ({
  businessDate,
  now = new Date(),
  timezone = DEFAULT_BUSINESS_TIME.timezone,
  businessDayStart = DEFAULT_BUSINESS_TIME.businessDayStart,
  businessDayEnd = DEFAULT_BUSINESS_TIME.businessDayEnd,
}) => {
  const local = zonedClock(now, timezone);
  if (businessDate < local.date) return "closed";
  if (businessDate > local.date) return "scheduled";
  if (local.minutes < timeMinutes(businessDayStart)) return "scheduled";
  if (local.minutes >= timeMinutes(businessDayEnd)) return "closed";
  return "live";
};

const serviceRows = ({ tickets, visas, cargo }) => [
  ...tickets.map((record) => ({
    service: "Tickets",
    transactionType: "ticket",
    transactionId: record.id,
    branchId: id(record.branchId),
    date: dateOnly(record.saleDate),
    currency: record.currency,
    charge: (record.type === "Refund" ? -1 : 1) * (Number(record.amount) || 0),
    receivableCharge: record.type === "Refund" ? 0 : Number(record.amount) || 0,
    directCost: record.type === "Refund" ? 0 : Number(record.cost) || 0,
  })),
  ...visas.map((record) => ({
    service: "Visas",
    transactionType: "visa",
    transactionId: record.id,
    branchId: id(record.branchId),
    date: dateOnly(record.appDate),
    currency: record.currency,
    charge: (record.type === "Refund" ? -1 : 1) * (Number(record.amount) || 0),
    receivableCharge: record.type === "Refund" ? 0 : Number(record.amount) || 0,
    directCost: record.type === "Refund" ? 0 : Number(record.cost) || 0,
  })),
  ...cargo
    .filter(
      (record) => String(record.status || "").toLowerCase() !== "cancelled",
    )
    .map((record) => ({
      service: "Cargo",
      transactionType: "cargo",
      transactionId: record.id,
      branchId: id(record.originBranchId),
      date: dateOnly(record.dateIn),
      currency: record.currency,
      charge: cargoCustomerCharge(record),
      receivableCharge: cargoCustomerCharge(record),
      directCost: Number(record.cost) || 0,
    })),
];

export const buildDailySummaryRows = ({
  businessDate,
  settings = DEFAULT_BUSINESS_TIME,
  branches,
  paymentMethods,
  branchPaymentMethods,
  tickets,
  visas,
  cargo,
  payments,
  expenses,
  suppliers,
  supplierPayments,
  startingBalances,
  previousSummaries = [],
  now = new Date(),
}) => {
  const methodById = new Map();
  for (const method of paymentMethods) {
    for (const key of [id(method._id), id(method.id)].filter(Boolean))
      methodById.set(key, method);
  }
  const services = serviceRows({ tickets, visas, cargo });
  const validPayments = payments.filter(
    (payment) =>
      payment.status !== "void" &&
      dateOnly(payment.paymentDate) <= businessDate,
  );
  const paymentsByTransaction = new Map();
  for (const payment of validPayments) {
    const key = `${payment.transactionType}:${payment.transactionId}`;
    const group = paymentsByTransaction.get(key) || [];
    group.push(payment);
    paymentsByTransaction.set(key, group);
  }
  const activeBills = suppliers.filter(
    (bill) =>
      bill.recordStatus !== "cancelled" && dateOnly(bill.date) <= businessDate,
  );
  const billPaid = new Map();
  for (const payment of supplierPayments) {
    if (
      payment.status === "void" ||
      dateOnly(payment.paymentDate) > businessDate
    )
      continue;
    billPaid.set(
      payment.supplierBillId,
      round((billPaid.get(payment.supplierBillId) || 0) + payment.amount),
    );
  }
  const state = businessDayState({ businessDate, now, ...settings });

  return branches.flatMap((branch) => {
    const branchId = id(branch._id || branch.id);
    const currencies = branch.allowedCurrencies?.length
      ? branch.allowedCurrencies
      : [branch.defaultCurrency];
    return currencies.map((currency) => {
      const matchingServices = services.filter(
        (service) =>
          service.branchId === branchId && service.currency === currency,
      );
      const currentServices = matchingServices.filter(
        (service) => service.date === businessDate,
      );
      const revenueByService = ["Tickets", "Visas", "Cargo"].map(
        (serviceName) => {
          const rows = currentServices.filter(
            (service) => service.service === serviceName,
          );
          const allDue = matchingServices.filter(
            (service) =>
              service.service === serviceName &&
              service.date <= businessDate &&
              service.receivableCharge > 0,
          );
          const accountsReceivable = round(
            allDue.reduce((sum, service) => {
              const summary = deriveCustomerFinanceSummary({
                totalCharge: service.receivableCharge,
                payments:
                  paymentsByTransaction.get(
                    `${service.transactionType}:${service.transactionId}`,
                  ) || [],
                asOf: businessDate,
              });
              return sum + summary.accountsReceivable;
            }, 0),
          );
          const revenue = round(rows.reduce((sum, row) => sum + row.charge, 0));
          const directCost = round(
            rows.reduce((sum, row) => sum + row.directCost, 0),
          );
          return {
            service: serviceName,
            transactions: rows.length,
            revenue,
            directCost,
            profit: round(revenue - directCost),
            accountsReceivable,
          };
        },
      );
      const revenue = round(
        revenueByService.reduce((sum, row) => sum + row.revenue, 0),
      );
      const directCost = round(
        revenueByService.reduce((sum, row) => sum + row.directCost, 0),
      );
      const accountsReceivable = round(
        revenueByService.reduce((sum, row) => sum + row.accountsReceivable, 0),
      );
      const dayPayments = validPayments.filter(
        (payment) =>
          id(payment.branchId) === branchId &&
          payment.currency === currency &&
          dateOnly(payment.paymentDate) === businessDate,
      );
      const dayExpenses = expenses.filter(
        (expense) =>
          expense.recordStatus !== "void" &&
          id(expense.branchId) === branchId &&
          expense.currency === currency &&
          dateOnly(expense.date) === businessDate,
      );
      const daySupplierPayments = supplierPayments.filter(
        (payment) =>
          payment.status !== "void" &&
          id(payment.branchId) === branchId &&
          payment.currency === currency &&
          dateOnly(payment.paymentDate) === businessDate,
      );
      const methodLinks = branchPaymentMethods.filter(
        (link) =>
          id(link.branchId) === branchId &&
          link.isActive !== false &&
          (link.allowedCurrencies || []).includes(currency),
      );
      const previous = previousSummaries
        .filter(
          (summary) =>
            id(summary.branchId) === branchId &&
            summary.currency === currency &&
            summary.businessDate < businessDate,
        )
        .sort((a, b) => b.businessDate.localeCompare(a.businessDate))[0];
      const previousMethods = new Map(
        (previous?.paymentsByMethod || []).map((row) => [
          id(row.paymentMethodId),
          row,
        ]),
      );
      const paymentsByMethod = methodLinks.map((link) => {
        const methodId = id(link.paymentMethodId);
        const method = methodById.get(methodId);
        const received = round(
          dayPayments
            .filter(
              (payment) =>
                id(payment.paymentMethodId) === methodId &&
                payment.flow !== "outbound",
            )
            .reduce((sum, payment) => sum + payment.amount, 0),
        );
        const refunds = round(
          dayPayments
            .filter(
              (payment) =>
                id(payment.paymentMethodId) === methodId &&
                payment.flow === "outbound",
            )
            .reduce((sum, payment) => sum + payment.amount, 0),
        );
        const expenseAmount = round(
          dayExpenses
            .filter((expense) => id(expense.paymentMethodId) === methodId)
            .reduce((sum, expense) => sum + expense.amount, 0),
        );
        const supplierPaid = round(
          daySupplierPayments
            .filter((payment) => id(payment.paymentMethodId) === methodId)
            .reduce((sum, payment) => sum + payment.amount, 0),
        );
        const configured = startingBalances.find(
          (balance) =>
            id(balance.branchId) === branchId &&
            balance.currency === currency &&
            id(balance.paymentMethodId) === methodId,
        );
        // Rule 1: today opens on yesterday close for this method. Every
        // channel carries forward, not just the cash drawer - money sitting in
        // EVC Plus or the bank is still held overnight. Only on a branch first
        // day, with no prior summary, does the float configured in Advanced
        // Settings supply the opening figure.
        const opening = round(
          previousMethods.get(methodId)?.closing ?? configured?.amount ?? 0,
        );
        return {
          paymentMethodId: methodId,
          paymentMethod: method?.name || link.paymentMethod || "Payment method",
          countsAsPhysicalCash: Boolean(link.countsAsPhysicalCash),
          opening,
          received,
          refunds,
          expenses: expenseAmount,
          supplierPaid,
          closing: round(
            opening + received - refunds - expenseAmount - supplierPaid,
          ),
        };
      });
      const moneyReceived = round(
        dayPayments
          .filter((payment) => payment.flow !== "outbound")
          .reduce((sum, payment) => sum + payment.amount, 0),
      );
      const refunds = round(
        dayPayments
          .filter((payment) => payment.flow === "outbound")
          .reduce((sum, payment) => sum + payment.amount, 0),
      );
      const expenseTotal = round(
        dayExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      );
      const accountsPayable = round(
        activeBills
          .filter(
            (bill) =>
              id(bill.branchId) === branchId && bill.currency === currency,
          )
          .reduce(
            (sum, bill) =>
              sum + Math.max(0, bill.billed - (billPaid.get(bill.id) || 0)),
            0,
          ),
      );
      const expensesByCategory = Object.values(
        dayExpenses.reduce((result, expense) => {
          const category = expense.category || "Other";
          result[category] ||= { category, transactions: 0, amount: 0 };
          result[category].transactions += 1;
          result[category].amount = round(
            result[category].amount + expense.amount,
          );
          return result;
        }, {}),
      );
      // All three balances below count every payment channel — cash, mobile
      // money and bank alike. Counting physical cash only made the figures read
      // zero for a branch that holds its money in EVC Plus or the bank, and
      // ignored the opening floats configured in settings.

      // Money held at the start of the day: yesterday's closing, or the opening
      // float configured in Advanced Settings on the first day.
      const openingBalance = round(
        paymentsByMethod.reduce((sum, method) => sum + method.opening, 0),
      );

      // Money held at the close of the day. A receivable only lifts this once
      // the customer's money is actually collected, and a payable only reduces
      // it once the supplier is actually paid: while a bill is outstanding that
      // money is still sitting here. This becomes tomorrow's opening balance.
      const closedAmount = round(
        paymentsByMethod.reduce((sum, method) => sum + method.closing, 0),
      );

      // What the branch is projected to hold once the outstanding debts on both
      // sides settle. Kept separate from closedAmount so uncollected invoices
      // never inflate the money actually in hand.
      const expectedClosing = round(
        closedAmount + accountsReceivable - accountsPayable,
      );
      return {
        id: `summary_${branchId}_${businessDate}_${currency}`,
        branchId,
        branch: branch.name,
        businessDate,
        currency,
        timezone: settings.timezone,
        businessDayStart: settings.businessDayStart,
        businessDayEnd: settings.businessDayEnd,
        openingBalance,
        revenue,
        moneyReceived,
        closedAmount,
        refunds,
        expenses: expenseTotal,
        accountsPayable,
        accountsReceivable,
        directCost,
        profit: round(revenue - directCost),
        expectedClosing,
        revenueByService,
        paymentsByMethod,
        expensesByCategory,
        state,
        systemGenerated: true,
        calculatedAt: now.toISOString(),
      };
    });
  });
};

const loadSummarySource = async () => {
  const [
    settings,
    branches,
    paymentMethods,
    branchPaymentMethods,
    tickets,
    visas,
    cargo,
    payments,
    expenses,
    suppliers,
    supplierPayments,
    startingBalances,
    previousSummaries,
  ] = await Promise.all([
    AgencySettings.findOne({ key: "singleton" }).lean(),
    Branch.find({ isActive: { $ne: false } }).lean(),
    PaymentMethod.find({ isActive: { $ne: false } }).lean(),
    BranchPaymentMethod.find({ isActive: { $ne: false } }).lean(),
    Ticket.find({ recordStatus: { $ne: "archived" } }).lean(),
    Visa.find({ recordStatus: { $ne: "archived" } }).lean(),
    Cargo.find({}).lean(),
    Payment.find({ status: { $ne: "void" } }).lean(),
    Expense.find({ recordStatus: { $ne: "void" } }).lean(),
    Supplier.find({ recordStatus: { $ne: "cancelled" } }).lean(),
    SupplierPayment.find({ status: { $ne: "void" } }).lean(),
    StartingBalance.find({}).lean(),
    DailySummary.find({}).sort({ businessDate: -1 }).lean(),
  ]);
  return {
    settings: {
      timezone: settings?.timezone || DEFAULT_BUSINESS_TIME.timezone,
      businessDayStart:
        settings?.businessDayStart || DEFAULT_BUSINESS_TIME.businessDayStart,
      businessDayEnd:
        settings?.businessDayEnd || DEFAULT_BUSINESS_TIME.businessDayEnd,
    },
    branches,
    paymentMethods,
    branchPaymentMethods,
    tickets,
    visas,
    cargo,
    payments,
    expenses,
    suppliers,
    supplierPayments,
    startingBalances,
    previousSummaries,
  };
};

export const getDailySummary = async ({
  user,
  businessDate,
  branchId = "",
  currency = "",
  now = new Date(),
  recalculate = false,
}) => {
  const source = await loadSummarySource();
  const scope = getUserBranchScope(user);
  const effectiveBranchId =
    scope.kind === "branch" ? scope.branchId : String(branchId || "");
  const eligibleBranches = source.branches.filter(
    (branch) => !effectiveBranchId || id(branch._id) === effectiveBranchId,
  );
  let rows = buildDailySummaryRows({
    ...source,
    branches: eligibleBranches,
    businessDate,
    now,
  }).filter((row) => !currency || row.currency === currency);

  const snapshots = new Map(
    source.previousSummaries
      .filter((row) => row.businessDate === businessDate)
      .map((row) => [`${id(row.branchId)}:${row.currency}`, row]),
  );
  if (!recalculate) {
    rows = await Promise.all(
      rows.map(async (row) => {
        const existing = snapshots.get(`${row.branchId}:${row.currency}`);
        if (existing) {
          const snapshot =
            typeof existing.toObject === "function"
              ? existing.toObject()
              : { ...existing };
          return {
            ...snapshot,
            // Snapshots stored before closedAmount existed come back without
            // it. Derive it from that snapshot's OWN payment methods rather
            // than from the freshly computed row, so the figure always agrees
            // with the rest of the numbers in the same row.
            closedAmount:
              snapshot.closedAmount ??
              round(
                (snapshot.paymentsByMethod || []).reduce(
                  (sum, method) => sum + (method.closing || 0),
                  0,
                ),
              ),
            state: "closed",
          };
        }
        // Only freeze a snapshot once the business date has fully passed in
        // the agency timezone. The day flips to "closed" at the business day
        // end, but entries are still made after that, and freezing on a mere
        // page view would lock in whatever happened to be recorded at that
        // moment and permanently hide the rest.
        const localDate = zonedClock(now, source.settings.timezone).date;
        if (row.state !== "closed" || businessDate >= localDate) return row;
        try {
          const created = await DailySummary.create({
            ...row,
            status: "closed",
            closedAt: now.toISOString(),
          });
          return { ...created.toObject(), state: "closed" };
        } catch (error) {
          if (error?.code === 11000)
            return DailySummary.findOne({
              branchId: row.branchId,
              businessDate,
              currency: row.currency,
            })
              .lean()
              .then((saved) => ({ ...saved, state: "closed" }));
          throw error;
        }
      }),
    );
  }
  return { rows, settings: source.settings };
};

export const correctDailySummary = async ({ id: summaryId, reason, user }) => {
  if (user.role !== "owner")
    throw Object.assign(new Error("Owner access is required."), {
      status: 403,
    });
  if (!String(reason || "").trim())
    throw Object.assign(new Error("A correction reason is required."), {
      status: 400,
    });
  const existing = await DailySummary.findOne({ id: summaryId });
  if (!existing)
    throw Object.assign(new Error("Daily summary not found."), { status: 404 });
  const recalculated = await getDailySummary({
    user,
    businessDate: existing.businessDate,
    branchId: id(existing.branchId),
    currency: existing.currency,
    recalculate: true,
  });
  const next = recalculated.rows[0];
  const history = [
    ...(existing.correctionHistory || []),
    {
      correctedAt: new Date().toISOString(),
      correctedByUserId: user.id || user._id?.toString?.() || "",
      correctedBy: user.name || "",
      reason: String(reason).trim(),
      previousVersion: existing.version,
      previous: existing.toObject(),
    },
  ];
  Object.assign(existing, next, {
    status: "corrected",
    version: (existing.version || 1) + 1,
    correctionHistory: history,
    closedAt: new Date().toISOString(),
  });
  await existing.save();
  await Activity.create({
    id: `log_${randomToken(8)}`,
    at: new Date().toISOString(),
    userId: user.id || user._id?.toString?.() || "",
    userName: user.name || "",
    action: "Corrected daily summary",
    entity: "Daily Summary",
    detail: `${existing.branch} ${existing.businessDate} ${existing.currency}: ${String(reason).trim()}`,
  });
  return existing;
};
