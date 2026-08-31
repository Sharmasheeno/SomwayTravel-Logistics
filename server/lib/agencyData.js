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
import { normalizePhone } from "./phone.js";

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

export const ALL_ENTITY_MODELS = { ...OFFICE_SCOPED_MODELS, ...SHARED_MODELS, clients: Client, activities: Activity };

export const officeForRole = (role) =>
  role === "officer_nairobi" ? "Nairobi" : role === "officer_mogadishu" ? "Mogadishu" : null;

export const toPlain = (doc) => {
  const object = doc.toObject ? doc.toObject() : doc;
  const rest = { ...object };
  delete rest._id;
  delete rest.__v;
  return rest;
};

export const defaultAgencyData = {
  agencyName: "Macruf Travel and Cargo Agency",
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
    AgencySettings.findOne({ key: "singleton" }).then((row) => row?.agencyName || defaultAgencyData.agencyName),
    Ticket.find({}),
    Cargo.find({}),
    Visa.find({}),
    Expense.find({}),
    Supplier.find({}),
    Client.find({}),
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
    paymentMethods.map((method) => [method._id.toString(), method.id])
  );

  return {
    agencyName,
    tickets: tickets.map(toPlain),
    cargo: cargo.map(toPlain),
    visas: visas.map(toPlain),
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
        paymentMethodId: paymentMethodIdByMongoId.get(row.paymentMethodId?.toString?.()) || String(plain.paymentMethodId || ""),
      };
    }),
    payments: payments.map(toPlain),
    supplierPayments: supplierPayments.map(toPlain),
  };
};

const hideCost = (items) => (items || []).map((item) => ({ ...item, cost: 0 }));

const sameBranch = (item, field, branchId) => String(item?.[field] || "") === branchId;

export const visibleData = (source, userOrRole, safeUsers) => {
  const data = { ...defaultAgencyData, ...source, users: safeUsers };
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  const scope = typeof userOrRole === "string" ? { kind: officeForRole(role) ? "legacyOffice" : role === "consultant" ? "readOnly" : "all" } : getUserBranchScope(userOrRole);
  if (scope.kind === "readOnly") return data;
  if (scope.kind === "branch") {
    const branchId = scope.branchId;
    return {
      ...data,
      branches: (data.branches || []).filter((branch) => branch.id === branchId),
      tickets: hideCost((data.tickets || []).filter((item) => sameBranch(item, "branchId", branchId))),
      cargo: hideCost((data.cargo || []).filter((item) => sameBranch(item, "originBranchId", branchId) || sameBranch(item, "destinationBranchId", branchId) || sameBranch(item, "paidByBranchId", branchId))),
      visas: hideCost((data.visas || []).filter((item) => sameBranch(item, "branchId", branchId))),
      expenses: (data.expenses || []).filter((item) => sameBranch(item, "branchId", branchId)),
      closes: (data.closes || []).filter((item) => sameBranch(item, "branchId", branchId)),
      suppliers: [],
      rates: [],
      startingBalances: [],
      paymentMethods: data.paymentMethods || [],
      branchPaymentMethods: (data.branchPaymentMethods || []).filter((item) => sameBranch(item, "branchId", branchId)),
      payments: (data.payments || []).filter((item) => sameBranch(item, "branchId", branchId)),
      supplierPayments: [],
      activities: [],
    };
  }
  const office = officeForRole(role);
  if (!office) return data;
  return {
    ...data,
    tickets: hideCost((data.tickets || []).filter((item) => item.office === office)),
    cargo: hideCost(data.cargo || []),
    visas: hideCost((data.visas || []).filter((item) => item.office === office)),
    expenses: (data.expenses || []).filter((item) => item.office === office),
    closes: (data.closes || []).filter((item) => item.office === office),
    suppliers: [],
    rates: [],
    startingBalances: [],
    activities: [],
  };
};

const replaceCollection = async (Model, items) => {
  const list = Array.isArray(items) ? items : [];
  await Model.deleteMany({});
  if (list.length) await Model.insertMany(list, { ordered: false });
};

const replaceOfficeSlice = async (Model, items, office) => {
  const list = (Array.isArray(items) ? items : []).filter((item) => item?.office === office);
  await Model.deleteMany({ office });
  if (list.length) await Model.insertMany(list, { ordered: false });
};

const writeCostPreservingOfficeSlice = async (Model, items, office) => {
  const list = (Array.isArray(items) ? items : []).filter((item) => item?.office === office);
  const existing = await Model.find({ office });
  const costById = new Map(existing.map((item) => [item.id, item.cost || 0]));
  const withPreservedCost = list.map((item) => ({ ...item, cost: costById.get(item.id) || 0 }));
  await Model.deleteMany({ office });
  if (withPreservedCost.length) await Model.insertMany(withPreservedCost, { ordered: false });
};

const mergeSharedCargo = async (incoming) => {
  const list = Array.isArray(incoming) ? incoming : [];
  const existing = await Cargo.find({});
  const existingById = new Map(existing.map((doc) => [doc.id, doc]));
  for (const item of list) {
    const current = existingById.get(item.id);
    const incomingIsNewer = !current || String(item.updatedAt || "") >= String(current.updatedAt || "");
    if (!incomingIsNewer) continue;
    const cost = current ? current.cost || 0 : 0;
    await Cargo.findOneAndUpdate(
      { id: item.id },
      { $set: { ...item, cost } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
};

const mergeClients = async (incoming) => {
  const list = Array.isArray(incoming) ? incoming : [];
  for (const item of list) {
    const normalized = normalizePhone(item.phone || item.id, { office: item.homeOffice });
    if (!normalized) continue;
    await Client.findOneAndUpdate(
      { normalizedPhone: normalized },
      { $set: { ...item, normalizedPhone: normalized } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
};

const mergeActivities = async (incoming) => {
  const list = Array.isArray(incoming) ? incoming : [];
  for (const item of list) {
    if (!item?.id) continue;
    await Activity.findOneAndUpdate({ id: item.id }, { $set: item }, { upsert: true, setDefaultsOnInsert: true });
  }
  const excess = await Activity.find({}).sort({ at: -1 }).skip(500).select("_id");
  if (excess.length) await Activity.deleteMany({ _id: { $in: excess.map((row) => row._id) } });
};

export const mergeWrite = async (incoming, role) => {
  if (role === "owner") {
    await Promise.all([
      replaceCollection(Ticket, incoming.tickets),
      replaceCollection(Cargo, incoming.cargo),
      replaceCollection(Visa, incoming.visas),
      replaceCollection(Expense, incoming.expenses),
      replaceCollection(Supplier, incoming.suppliers),
      replaceCollection(Client, (incoming.clients || []).map((item) => ({ ...item, normalizedPhone: normalizePhone(item.phone || item.id, { office: item.homeOffice }) }))),
      replaceCollection(DailyClose, incoming.closes),
      replaceCollection(Rate, incoming.rates),
      replaceCollection(StartingBalance, incoming.startingBalances),
      replaceCollection(Activity, incoming.activities),
    ]);
    if (typeof incoming.agencyName === "string" && incoming.agencyName.trim()) {
      await AgencySettings.findOneAndUpdate(
        { key: "singleton" },
        { $set: { agencyName: incoming.agencyName.trim() } },
        { upsert: true }
      );
    }
    return;
  }

  if (role === "consultant") {
    throw new Error("Consultants have read-only access.");
  }

  const office = officeForRole(role);
  if (!office) throw new Error("This account cannot update agency data.");

  await Promise.all([
    writeCostPreservingOfficeSlice(Ticket, incoming.tickets, office),
    writeCostPreservingOfficeSlice(Visa, incoming.visas, office),
    replaceOfficeSlice(Expense, incoming.expenses, office),
    replaceOfficeSlice(DailyClose, incoming.closes, office),
    mergeSharedCargo(incoming.cargo),
    mergeClients(incoming.clients),
    mergeActivities(incoming.activities),
  ]);
};
