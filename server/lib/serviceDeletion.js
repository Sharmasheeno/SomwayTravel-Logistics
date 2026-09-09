import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import Cargo from "../models/Cargo.js";
import Payment from "../models/Payment.js";
import Supplier from "../models/Supplier.js";
import SupplierPayment from "../models/SupplierPayment.js";
import DailyClose from "../models/DailyClose.js";
import ServiceDeletion from "../models/ServiceDeletion.js";
import { dailyCloseSnapshot } from "./finance.js";
import { hasPayableParent, serviceKeys } from "./serviceRelationships.js";
import { withServiceLock } from "./serviceLock.js";
import { rebuildStoredDailySummaries } from "./dailySummary.js";

const models = { ticket: Ticket, visa: Visa, cargo: Cargo };

export const refreshCloseSnapshots = async () => {
  for (const close of await DailyClose.find({})) {
    const snapshot = await dailyCloseSnapshot(close);
    const changed = Object.entries(snapshot).some(([key, value]) => close[key] !== value);
    if (!changed) continue;
    await DailyClose.updateOne({ id: close.id }, { $set: {
      ...snapshot,
      difference: Math.round(((close.actuallyCounted || 0) - snapshot.expectedBalance) * 100) / 100,
      reviewed: false, reviewedBy: "", checkedBy: "",
    } });
  }
};

export const assertServiceNotDeleting = async (type, id) => {
  if (await ServiceDeletion.exists({ _id: `${type}:${id}` }))
    throw Object.assign(new Error("This service is being deleted. Refresh the workspace."), { status: 409 });
};

export const deleteServiceRecords = (type, id) => withServiceLock(`${type}:${id}`, async () => {
  const key = `${type}:${id}`;
  await ServiceDeletion.updateOne({ _id: key }, { $setOnInsert: {
    transactionType: type, transactionId: id,
  } }, { upsert: true });
  const bills = await Supplier.find({ $or: [
    { id: `payable_${type}_${id}` },
    { transactionType: type, transactionId: id },
  ] });
  const billIds = [...new Set([`payable_${type}_${id}`, ...bills.map((bill) => bill.id)])];
  await Payment.deleteMany({ transactionType: type, transactionId: id });
  await SupplierPayment.deleteMany({ supplierBillId: { $in: billIds } });
  await Supplier.deleteMany({ id: { $in: billIds } });
  await models[type].deleteOne({ id });
  await refreshCloseSnapshots();
  await rebuildStoredDailySummaries();
  await ServiceDeletion.deleteOne({ _id: key });
});

export const purgeServiceFinanceRecords = async (type, id) => {
  const payableId = `payable_${type}_${id}`;
  const bills = await Supplier.find({ $or: [{ id: payableId }, { transactionType: type, transactionId: id }] });
  const billIds = [...new Set([payableId, ...bills.map((bill) => bill.id)])];
  // Customer receipts survive cancellation until their outgoing refunds settle.
  await SupplierPayment.deleteMany({ supplierBillId: { $in: billIds } });
  await Supplier.deleteMany({ id: { $in: billIds } });
  await refreshCloseSnapshots();
  await rebuildStoredDailySummaries();
};

export const purgeServiceFinance = (type, id) =>
  withServiceLock(`${type}:${id}`, () => purgeServiceFinanceRecords(type, id));

export const resumeServiceDeletions = async () => {
  for (const job of await ServiceDeletion.find({}))
    await deleteServiceRecords(job.transactionType, job.transactionId);
};

// Run once before serving requests. Match by exact ids, never names/references.
// Cancelled services remain valid parents; archived ticket/visa records were
// the previous deletion implementation and must be removed with their ledger.
export const cleanupDeletedServiceFinance = async () => {
  for (const [type, Model] of Object.entries(models)) {
    if (type === "cargo") continue;
    for (const row of await Model.find({ recordStatus: "archived" }))
      await deleteServiceRecords(type, row.id);
  }
  const [tickets, visas, cargo, bills, payments, supplierPayments] = await Promise.all([
    Ticket.find({}), Visa.find({}), Cargo.find({}), Supplier.find({}),
    Payment.find({}), SupplierPayment.find({}),
  ]);
  const keys = serviceKeys({ tickets, visas, cargo });
  const orphanBills = bills.filter((bill) => !hasPayableParent(bill, keys));
  const liveBillIds = new Set(bills.filter((bill) => hasPayableParent(bill, keys)).map((bill) => bill.id));
  const orphanPayments = payments.filter((payment) => !keys.has(`${payment.transactionType}:${payment.transactionId}`));
  const orphanSupplierPayments = supplierPayments.filter((payment) => !liveBillIds.has(payment.supplierBillId));
  await Payment.deleteMany({ id: { $in: orphanPayments.map((row) => row.id) } });
  await SupplierPayment.deleteMany({ id: { $in: orphanSupplierPayments.map((row) => row.id) } });
  await Supplier.deleteMany({ id: { $in: orphanBills.map((row) => row.id) } });
  await refreshCloseSnapshots();
  await rebuildStoredDailySummaries();
  return { payments: orphanPayments.length, payables: orphanBills.length, supplierPayments: orphanSupplierPayments.length };
};
