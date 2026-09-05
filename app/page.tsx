"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiFetch, apiRequest, SESSION_EXPIRED_EVENT } from "./lib/api";

// A signed-in session belongs to the tab that established it. Opening the
// workspace in a new tab, or returning after the browser was closed, goes
// through the login screen again rather than silently resuming.
const TAB_SESSION_KEY = "somway.tab-session";
const markTabSignedIn = () => {
  try {
    sessionStorage.setItem(TAB_SESSION_KEY, "1");
  } catch {
    // Private modes can refuse sessionStorage; sign-in still works.
  }
};
const clearTabSession = () => {
  try {
    sessionStorage.removeItem(TAB_SESSION_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};
const tabHasSession = () => {
  try {
    return sessionStorage.getItem(TAB_SESSION_KEY) === "1";
  } catch {
    // Without storage this guard cannot apply; do not lock the user out.
    return true;
  }
};
import { SomwayIcon } from "./somway-icon";

const fetch = apiFetch;

type Role =
  "owner" | "operator" | "consultant" | "officer_nairobi" | "officer_mogadishu";
type Office = string;
type Currency = "KES" | "USD";
type PaymentMethod = "Cash" | "M-Pesa" | "Bank" | "EVC Plus";
type Page =
  | "overview"
  | "tickets"
  | "cargo"
  | "visas"
  | "daily-close"
  | "expenses"
  | "suppliers"
  | "clients"
  | "receipt"
  | "tracking"
  | "reports"
  | "receivables"
  | "team"
  | "settings"
  | "activity";

type Branch = {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  defaultCurrency: Currency;
  allowedCurrencies?: Currency[];
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
type User = {
  id: string;
  name: string;
  username: string;
  phone?: string;
  avatarUrl?: string;
  passwordHash?: string;
  role: Role;
  assignedBranchId?: string | null;
  active: boolean;
  createdAt: string;
  loginToken?: string;
  loginUrl?: string;
};
type TicketStatus = "booked" | "issued" | "changed" | "cancelled";
type VisaStatus = "submitted" | "approved" | "refused" | "delivered";
type Ticket = {
  id: string;
  ref: string;
  office: Office;
  branchId?: string | null;
  clientId?: string | null;
  normalizedPhone?: string;
  type: "Sale" | "Refund";
  saleDate: string;
  passenger: string;
  phone: string;
  route: string;
  airlinePnr: string;
  travelDate: string;
  currency: Currency;
  amount: number;
  cost: number;
  paymentMethod: PaymentMethod;
  paid: boolean;
  paymentDate: string;
  amountPaid?: number;
  balance?: number;
  paymentStatus?: "unpaid" | "partial" | "paid";
  status?: TicketStatus;
  workflowVersion?: number;
  statusHistory?: ServiceStatusHistory[];
  servedBy: string;
  notes: string;
  createdBy: string;
  updatedAt: string;
};
type CargoStatus =
  | "received"
  | "in_transit"
  | "arrived"
  | "ready_for_collection"
  | "delivered"
  | "cancelled"
  | "claim"
  | "In Transit"
  | "Arrived"
  | "Delivered"
  | "Claim";
type CargoHistory = {
  event: string;
  fromStatus?: string;
  toStatus: CargoStatus;
  at: string;
  userId?: string;
  userName?: string;
  branchId?: string | null;
  note?: string;
};
type ServiceStatusHistory = {
  event: string;
  fromStatus?: string;
  toStatus: string;
  at: string;
  userId?: string;
  userName?: string;
  branchId?: string | null;
  note?: string;
};
type Cargo = {
  id: string;
  tracking: string;
  origin: Office;
  destination: Office;
  originBranchId?: string | null;
  destinationBranchId?: string | null;
  dateIn: string;
  sender: string;
  senderPhone: string;
  senderEmail?: string;
  receiver: string;
  receiverPhone: string;
  receiverEmail?: string;
  senderClientId?: string | null;
  receiverClientId?: string | null;
  paymentResponsibility?: "sender" | "receiver" | "unresolved";
  payerClientId?: string | null;
  senderNormalizedPhone?: string;
  receiverNormalizedPhone?: string;
  contents: string;
  weight: number;
  currency: Currency;
  rate: number;
  rateNote?: string;
  customerCharge?: number;
  cost?: number;
  payType?: "Prepaid" | "Collect";
  paymentMethod?: PaymentMethod;
  paidByOffice?: Office;
  paidByBranchId?: string | null;
  paid?: boolean;
  paymentDate?: string;
  amountPaid?: number;
  balance?: number;
  paymentStatus?: "unpaid" | "partial" | "paid";
  status: CargoStatus;
  statusHistory?: CargoHistory[];
  receivedAt?: string;
  dispatchedAt?: string;
  arrivedAt?: string;
  readyForCollectionAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  dateDelivered: string;
  notes: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
};
type Visa = {
  id: string;
  ref: string;
  office: Office;
  branchId?: string | null;
  clientId?: string | null;
  normalizedPhone?: string;
  type: "Sale" | "Refund";
  appDate: string;
  applicant: string;
  phone: string;
  email?: string;
  destination: string;
  visaType: string;
  currency: Currency;
  amount: number;
  cost: number;
  paymentMethod: PaymentMethod;
  paid: boolean;
  paymentDate: string;
  amountPaid?: number;
  balance?: number;
  paymentStatus?: "unpaid" | "partial" | "paid";
  status: VisaStatus;
  workflowVersion?: number;
  statusHistory?: ServiceStatusHistory[];
  servedBy: string;
  notes: string;
  createdBy: string;
  updatedAt: string;
};
type Expense = {
  id: string;
  date: string;
  office: Office;
  branchId?: string | null;
  category: string;
  description: string;
  currency: Currency;
  amount: number;
  paymentMethod: PaymentMethod;
  inProfitLoss: boolean;
  paid: boolean;
  paidBy: string;
  notes: string;
  createdBy: string;
  recordStatus?: "active" | "void";
  voidedAt?: string;
  voidReason?: string;
};
type Supplier = {
  id: string;
  date: string;
  supplier: string;
  branchId?: string;
  reference?: string;
  description: string;
  currency: Currency;
  billed: number;
  paid: number;
  dueDate: string;
  notes: string;
  recordStatus?: "active" | "cancelled";
  cancelledAt?: string;
  cancellationReason?: string;
};
type Client = {
  id: string;
  name: string;
  phone: string;
  normalizedPhone?: string;
  phoneIsValid?: boolean;
  email?: string;
  homeOffice: Office;
  homeBranchId?: string | null;
  preferredLanguage?: "so" | "en";
  isActive?: boolean;
  type: "Trader" | "Diaspora" | "Corporate" | "Individual";
  notes: string;
};
type DailyClose = {
  id: string;
  date: string;
  office: Office;
  branchId?: string | null;
  paymentMethod: PaymentMethod;
  currency: Currency;
  actuallyCounted: number;
  countedBy: string;
  checkedBy: string;
  notes: string;
  reviewed: boolean;
  reviewedBy: string;
  openingBalance?: number;
  totalCollections?: number;
  totalExpenses?: number;
  totalRefunds?: number;
  expectedBalance?: number;
  difference?: number;
  status?: "closed" | "reopened";
  closedAt?: string;
};
type DailySummaryRow = {
  id: string;
  branchId: string;
  branch: string;
  businessDate: string;
  currency: Currency;
  timezone: string;
  businessDayStart: string;
  businessDayEnd: string;
  openingBalance: number;
  revenue: number;
  moneyReceived: number;
  closedAmount: number;
  refunds: number;
  expenses: number;
  accountsPayable: number;
  accountsReceivable: number;
  directCost: number;
  profit: number;
  expectedClosing: number;
  state: "live" | "closed" | "scheduled";
  version?: number;
  revenueByService: {
    service: string;
    transactions: number;
    revenue: number;
    directCost: number;
    profit: number;
    accountsReceivable: number;
  }[];
  paymentsByMethod: {
    paymentMethodId: string;
    paymentMethod: string;
    countsAsPhysicalCash: boolean;
    opening: number;
    received: number;
    refunds: number;
    expenses: number;
    supplierPaid: number;
    closing: number;
  }[];
  expensesByCategory: {
    category: string;
    transactions: number;
    amount: number;
  }[];
};
type Rate = {
  id: string;
  origin: Office;
  destination: Office;
  originBranchId?: string | null;
  destinationBranchId?: string | null;
  currency: Currency;
  rate: number;
  isActive?: boolean;
};
type StartingBalance = {
  id: string;
  office: Office;
  branchId?: string | null;
  method: PaymentMethod;
  paymentMethodId?: string | null;
  currency: Currency;
  amount: number;
};
type Activity = {
  id: string;
  at: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  detail: string;
};
type CustomerPayment = {
  id: string;
  branchId: string;
  transactionType: "ticket" | "visa" | "cargo";
  transactionId: string;
  amount: number;
  currency: Currency;
  paymentMethodId?: string;
  paymentMethod: PaymentMethod | string;
  paymentDate: string;
  reference?: string;
  notes?: string;
  receivedByUserId?: string;
  status?: "active" | "void";
  voidReason?: string;
};
type SupplierPayment = {
  id: string;
  supplierBillId: string;
  branchId?: string | null;
  amount: number;
  currency: Currency;
  paymentMethodId?: string;
  paymentMethod: PaymentMethod | string;
  paymentDate: string;
  reference?: string;
  notes?: string;
  status?: "active" | "void";
};
type PaymentMethodConfig = {
  id: string;
  name: string;
  code: string;
  type: "cash" | "mobile_money" | "bank" | "other";
  isActive: boolean;
};
type BranchPaymentMethod = {
  id: string;
  branchId: string;
  paymentMethodId: string;
  allowedCurrencies: Currency[];
  isActive: boolean;
  countsAsPhysicalCash: boolean;
};
type AgencyData = {
  agencyName: string;
  users: User[];
  tickets: Ticket[];
  cargo: Cargo[];
  visas: Visa[];
  expenses: Expense[];
  suppliers: Supplier[];
  clients: Client[];
  closes: DailyClose[];
  rates: Rate[];
  startingBalances: StartingBalance[];
  activities: Activity[];
  branches: Branch[];
  payments: CustomerPayment[];
  supplierPayments: SupplierPayment[];
  paymentMethods: PaymentMethodConfig[];
  branchPaymentMethods: BranchPaymentMethod[];
};
type FinanceReportRow = {
  branchId: string;
  branch: string;
  currency: Currency;
  customerCharges: number;
  paymentsReceived: number;
  profit: number;
  revenue: number;
  directCost: number;
  grossProfit: number;
  collections: number;
  expenses: number;
  outstanding: number;
  supplierExposure: number;
  services: Record<"ticket" | "visa" | "cargo", number>;
  serviceGrossProfit: Record<"ticket" | "visa" | "cargo", number>;
  serviceDetails: Partial<Record<
    "ticket" | "visa" | "cargo",
    {
      transactions: number;
      customerCharges: number;
      paymentsReceived: number;
      directCost: number;
      profit: number;
    }
  >>;
  paymentMethods: Record<string, number>;
  paymentMethodDetails: Record<
    string,
    {
      transactions: number;
      received: number;
      refunds: number;
      netReceived: number;
    }
  >;
};
type FinanceReport = {
  rows: FinanceReportRow[];
  totals: {
    currency: Currency;
    customerCharges: number;
    paymentsReceived: number;
    profit: number;
    revenue: number;
    directCost: number;
    collections: number;
    grossProfit: number;
    expenses: number;
    outstanding: number;
    supplierExposure: number;
  }[];
  trend: {
    label: string;
    rows: {
      branch: string;
      branchId: string;
      currency: Currency;
      customerCharges: number;
      paymentsReceived: number;
      profit: number;
      revenue: number;
      directCost: number;
      grossProfit: number;
    }[];
  }[];
  accountsReceivable?: {
    rows?: Receivable[];
    summary: Record<string, ReceivableTotal>;
    totals: ReceivableTotal[];
  };
};
type Receivable = {
  id: string;
  transactionType: "ticket" | "visa" | "cargo";
  transactionId: string;
  service: "Ticket" | "Visa" | "Cargo";
  reference: string;
  branchId: string;
  branch: string;
  clientId: string;
  customer: string;
  payerResolved: boolean;
  transactionDate: string;
  totalCharge: number;
  totalPaid: number;
  accountsReceivable: number;
  amountPaid: number;
  balanceDue: number;
  currency: Currency;
  paymentStatus: "unpaid" | "partial" | "paid";
  ageDays: number;
  aging: "current" | "1-30" | "31-60" | "61-90" | "90+";
};
type ReceivableTotal = {
  currency: Currency;
  totalCharges: number;
  totalPaid: number;
  totalOutstanding: number;
  outstandingRecords: number;
  totalCharge: number;
  amountPaid: number;
  balanceDue: number;
  records: number;
};
type InitialCustomerPayment = {
  amount: number;
  branchId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string;
  idempotencyKey?: string;
};
type ModuleProps = {
  data: AgencyData;
  user: User;
  save: (
    fn: (d: AgencyData) => AgencyData,
    a?: { entity: string; detail: string },
  ) => Promise<boolean>;
  notify: (s: string) => void;
  replaceData?: (source: Partial<AgencyData>) => void;
  /** Branch selected in the top bar. Empty string means every branch. */
  scopeBranchId?: string;
  /** Moves the workspace to another screen, for panel "View all" links. */
  go?: (page: Page) => void;
  /** Reference of a record to reveal, set when a notification is opened.
   *  The register seeds its search with it so the row is on screen. */
  focusRef?: string;
};

/**
 * Keeps a module's own branch filter in step with the global top-bar scope.
 * Modules filter either by branch id or by branch name, so both shapes are
 * supported. The page-level control still works; both write the same value.
 */
function useBranchScope(
  scopeBranchId: string | undefined,
  apply: (value: string) => void,
) {
  const applyRef = useRef(apply);
  // Assigned in an effect, never during render, so concurrent rendering stays safe.
  useEffect(() => {
    applyRef.current = apply;
  });
  useEffect(() => {
    if (scopeBranchId === undefined) return;
    applyRef.current(scopeBranchId);
  }, [scopeBranchId]);
}

const BRAND_NAME = "SomWay Travel & Logistics";
const OWNER_LOGIN = "abdikadirhassan2015@gmail.com";
const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const emptyData: AgencyData = {
  agencyName: BRAND_NAME,
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
  activities: [],
  branches: [],
  payments: [],
  supplierPayments: [],
  paymentMethods: [],
  branchPaymentMethods: [],
};
const roleLabel: Record<Role, string> = {
  owner: "Owner",
  operator: "Operator",
  consultant: "Consultant",
  officer_nairobi: "Legacy Nairobi Operator",
  officer_mogadishu: "Legacy Mogadishu Operator",
};
const money = (value: number, currency: Currency) =>
  `${currency} ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value || 0)}`;
/** The same figure without its currency code, for narrow columns that name the
 *  currency once in the row instead of repeating it in every cell. */
const amount = (value: number) =>
  new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(
    value || 0,
  );
const moneyByCurrency = <T,>(
  rows: T[],
  currencyFor: (row: T) => Currency,
  valueFor: (row: T) => number,
) =>
  (["KES", "USD"] as Currency[])
    .map((currency) => ({
      currency,
      value: rows
        .filter((row) => currencyFor(row) === currency)
        .reduce((total, row) => total + valueFor(row), 0),
    }))
    .filter((item, _index, items) => item.value !== 0 || items.every((x) => x.value === 0))
    .map((item) => money(item.value, item.currency))
    .join(" / ");
const dateLabel = (value: string) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00`))
    : "—";
const monthKey = (value: string) => value?.slice(0, 7);
const officeForRole = (role: Role): Office | null =>
  role === "officer_nairobi"
    ? "Nairobi"
    : role === "officer_mogadishu"
      ? "Mogadishu"
      : null;
const activeBranches = (data: AgencyData) =>
  data.branches.filter((branch) => branch.isActive);
const branchById = (data: AgencyData, id?: string | null) =>
  data.branches.find((branch) => branch.id === id);
const branchName = (data: AgencyData, id?: string | null, fallback = "") =>
  branchById(data, id)?.name || fallback;
const branchCode = (data: AgencyData, id?: string | null, fallback = "BR") =>
  branchById(data, id)?.code || fallback;
const branchForUser = (data: AgencyData, user: User) =>
  user.role === "operator" ? branchById(data, user.assignedBranchId) : null;
const branchOptions = (
  data: AgencyData,
  user?: User,
  includeInactive = false,
) => {
  const branches = includeInactive ? data.branches : activeBranches(data);
  if (user?.role === "operator")
    return branches.filter((branch) => branch.id === user.assignedBranchId);
  return branches;
};
const branchCurrencies = (branch?: Branch) =>
  branch?.allowedCurrencies?.length
    ? branch.allowedCurrencies
    : branch?.defaultCurrency
      ? [branch.defaultCurrency]
      : (["KES", "USD"] as Currency[]);
const branchIdForOffice = (data: AgencyData, office?: string | null) =>
  data.branches.find(
    (branch) => branch.name === office || branch.city === office,
  )?.id || "";
const paymentMethodsFor = (
  data: AgencyData,
  branchId: string,
  currency: Currency,
) => {
  const links = data.branchPaymentMethods.filter(
    (link) =>
      link.branchId === branchId &&
      link.isActive &&
      link.allowedCurrencies.includes(currency),
  );
  const names = links
    .map(
      (link) =>
        data.paymentMethods.find((method) => method.id === link.paymentMethodId)
          ?.name,
    )
    .filter((name): name is PaymentMethod => Boolean(name));
  return names;
};
const cargoStatusKey = (status: CargoStatus | string) =>
  (({
    "In Transit": "in_transit",
    Arrived: "arrived",
    Delivered: "delivered",
    Claim: "claim",
    Received: "received",
    "Ready for Collection": "ready_for_collection",
    Cancelled: "cancelled",
  })[String(status)] || String(status)) as CargoStatus;
const cargoStatusLabel = (status: CargoStatus | string) =>
  ({
    received: "Received",
    in_transit: "In Transit",
    arrived: "Arrived",
    ready_for_collection: "Ready for Collection",
    delivered: "Delivered",
    cancelled: "Cancelled",
    claim: "Claim",
  })[String(cargoStatusKey(status))] || "Received";
const cargoStatusTone = (status: CargoStatus | string) => {
  const key = cargoStatusKey(status);
  return key === "delivered"
    ? "success"
    : key === "claim" || key === "cancelled"
      ? "danger"
      : key === "arrived" || key === "ready_for_collection"
        ? "warning"
        : "blue";
};
const serviceStatusLabel = (status: string) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
const ticketNextStatuses: Record<string, TicketStatus[]> = {
  booked: ["issued", "cancelled"],
  issued: ["changed", "cancelled"],
  changed: ["issued", "cancelled"],
  cancelled: [],
};
const visaNextStatuses: Record<string, VisaStatus[]> = {
  submitted: ["approved", "refused"],
  approved: ["delivered"],
  refused: [],
  delivered: [],
};

function syncClients(data: AgencyData): AgencyData {
  return data;
}

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const href = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  downloadBlob(filename, `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

function downloadPdf(filename: string, title: string, lines: string[]) {
  const clean = (value: string) =>
    value
      .replace(/→/g, "to")
      .replace(/·/g, "-")
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "");
  const escapePdf = (value: string) =>
    clean(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  const wrap = (value: string, width = 82) => {
    const words = clean(value).split(/\s+/);
    const output: string[] = [];
    let line = "";
    words.forEach((word) => {
      if (`${line} ${word}`.trim().length > width) {
        if (line) output.push(line);
        line = word;
      } else line = `${line} ${word}`.trim();
    });
    if (line) output.push(line);
    return output;
  };
  const bodyLines = lines
    .flatMap((line) => (line ? wrap(line) : [""]))
    .slice(0, 44);
  const commands = [`BT /F1 19 Tf 50 792 Td (${escapePdf(title)}) Tj ET`];
  bodyLines.forEach((line, index) =>
    commands.push(
      `BT /F1 ${index < 2 ? 11 : 10} Tf 50 ${760 - index * 16} Td (${escapePdf(line)}) Tj ET`,
    ),
  );
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join(
      "\n",
    )}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  downloadBlob(filename, new TextEncoder().encode(pdf), "application/pdf");
}

// One-click receipt. Rather than send the user to the Receipt Builder page to
// re-type a reference, any register row can hand its already-known details
// straight to this function, which opens a self-contained, print-ready A4
// receipt in a new tab and triggers the browser's print/save dialog. The
// markup is inlined (not the app's DOM) so the printout carries only the
// receipt -- no sidebar, no chrome -- and looks the same on every device.
type ReceiptData = {
  agencyName: string;
  ref: string;
  date: string;
  client: string;
  description: string;
  branch: string;
  method: string;
  paymentStatus: string;
  serviceStatus: string;
  amount: number;
  cost?: number;
  profit: number;
  amountPaid: number;
  balance: number;
  currency: Currency;
  served: string;
  notes?: string;
  kind: string;
};
function generateReceipt(receipt: ReceiptData, logoUrl?: string) {
  const esc = (value: string | number) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const m = (value: number) => esc(money(value, receipt.currency));
  const paidTone = /paid|refunded/i.test(receipt.paymentStatus)
    ? "#0d8a4f"
    : "#b7791f";
  const rows: Array<[string, string]> = [
    ["Date", esc(dateLabel(receipt.date))],
    ["Client", esc(receipt.client)],
    ["Description", esc(receipt.description)],
    ["Branch", esc(receipt.branch)],
    ["Paid via", esc(receipt.method)],
    ["Payment status", esc(receipt.paymentStatus)],
    ["Service status", esc(receipt.serviceStatus)],
  ];
  const finance: Array<[string, string, string?]> = [
    ...(receipt.cost !== undefined
      ? ([["Agency cost", m(receipt.cost)]] as Array<[string, string]>)
      : []),
    ["Profit", m(receipt.profit), receipt.profit < 0 ? "#d64545" : "#0d8a4f"],
    ["Paid", m(receipt.amountPaid)],
    ["Balance", m(receipt.balance)],
  ];
  const logo = logoUrl
    ? `<img class="brand" src="${esc(logoUrl)}" alt="${esc(receipt.agencyName)}" />`
    : `<div class="brand brand-fallback">SW</div>`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>receipt-${esc(receipt.ref)}</title>
<style>
  :root { --green:#0d47a1; --muted:#61708c; --line:#dce6f2; --cream:#fff9e9; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #eef2f7; color: #14243d;
    font-family: "Poppins", "Inter", system-ui, -apple-system, sans-serif; }
  .sheet { max-width: 640px; margin: 26px auto; background: #fff;
    border: 1px solid var(--line); border-radius: 6px; padding: 40px 46px;
    box-shadow: 0 18px 44px rgba(3,23,53,.10); }
  header { display: grid; grid-template-columns: 46px 1fr auto; align-items: center;
    gap: 14px; padding-bottom: 22px; border-bottom: 2px solid var(--green); }
  .brand { width: 46px; height: 46px; border-radius: 12px; object-fit: contain; }
  .brand-fallback { display: grid; place-items: center; background: var(--green);
    color: #fff; font: 700 20px/1 Georgia, serif; }
  h1 { font: 500 21px/1.15 Georgia, serif; color: var(--green); margin: 0; }
  header p { font-size: 10px; color: var(--muted); margin: 4px 0 0; }
  .tag { align-self: start; padding: 6px 12px; border-radius: 999px;
    background: #e0f5e9; color: #0d8a4f; font-size: 11px; font-weight: 700; }
  .ref { display: flex; justify-content: space-between; align-items: center;
    background: var(--cream); padding: 14px 16px; margin: 24px 0; border-radius: 9px; }
  .ref span { font-size: 10px; color: #846d3d; }
  .ref strong { font-size: 15px; color: var(--green); letter-spacing: .02em; }
  dl { margin: 0; }
  dl > div { display: grid; grid-template-columns: 130px 1fr; padding: 12px 0;
    border-bottom: 1px solid #edf1f0; }
  dt { font-size: 11px; color: var(--muted); }
  dd { font-size: 12px; font-weight: 700; margin: 0; }
  .total { display: flex; justify-content: space-between; align-items: end; padding: 24px 0; }
  .total span { font-size: 11px; color: var(--muted); }
  .total strong { font: 500 30px/1 Georgia, serif; color: var(--green);
    font-variant-numeric: tabular-nums; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px;
    padding-bottom: 22px; }
  .grid > div { display: flex; flex-direction: column; gap: 5px; padding: 11px 13px;
    background: #f5f8fc; border-radius: 8px; }
  .grid span { color: var(--muted); font-size: 10px; }
  .grid strong { font-size: 14px; font-variant-numeric: tabular-nums; }
  .notes { padding: 12px 14px; margin: 0 0 18px; background: var(--cream);
    border-radius: 8px; color: #765d2b; font-size: 11px; line-height: 1.5; }
  footer { border-top: 1px solid var(--line); padding-top: 18px; }
  footer p { font: 500 17px/1.2 Georgia, serif; color: var(--green); margin: 0 0 4px; }
  footer span { font-size: 10px; color: var(--muted); }
  .toolbar { max-width: 640px; margin: 18px auto 0; display: flex; gap: 10px;
    justify-content: flex-end; }
  .toolbar button { border: 0; border-radius: 10px; padding: 11px 18px; cursor: pointer;
    font: 600 13px/1 inherit; }
  .toolbar .print { background: var(--green); color: #fff; }
  .toolbar .close { background: #e7edf5; color: #35425c; }
  @media print { body { background: #fff; } .sheet { box-shadow: none; border: 0;
    margin: 0; max-width: none; } .toolbar { display: none; } }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      ${logo}
      <div><h1>${esc(receipt.agencyName)}</h1><p>Nairobi &middot; Mogadishu</p></div>
      <span class="tag">Receipt</span>
    </header>
    <div class="ref"><span>Receipt number</span><strong>${esc(receipt.ref)}</strong></div>
    <dl>${rows
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join("")}</dl>
    <div class="total"><span>Sale price</span><strong>${m(receipt.amount)}</strong></div>
    <div class="grid">${finance
      .map(
        ([k, v, color]) =>
          `<div><span>${k}</span><strong${color ? ` style="color:${color}"` : ""}>${v}</strong></div>`,
      )
      .join("")}</div>
    ${receipt.notes ? `<p class="notes">${esc(receipt.notes)}</p>` : ""}
    <footer><p>Thank you for your business.</p><span>Served by ${esc(receipt.served)}</span></footer>
  </div>
  <div class="toolbar">
    <button class="close" onclick="window.close()">Close</button>
    <button class="print" onclick="window.print()">Print / Save PDF</button>
  </div>
  <script>
    window.addEventListener('load', function(){ setTimeout(function(){ window.focus(); window.print(); }, 350); });
  <\/script>
</body>
</html>`;
  const win = window.open("", "_blank", "noopener,noreferrer,width=760,height=900");
  if (!win) {
    window.alert(
      "Please allow pop-ups for this site to generate the receipt.",
    );
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.document.title = `receipt-${receipt.ref}`;
}
// Turn a ticket register row into receipt data for the one-click generator.
function ticketReceiptData(
  ticket: Ticket,
  agencyName: string,
): ReceiptData {
  const amountValue = ticket.amount || 0;
  const paid = ticket.amountPaid || 0;
  return {
    agencyName,
    ref: ticket.ref,
    date: ticket.saleDate,
    client: ticket.passenger,
    description: `Flight ${ticket.route}${ticket.airlinePnr ? ` · ${ticket.airlinePnr}` : ""}`,
    branch: ticket.office,
    method: ticket.paymentMethod,
    paymentStatus: ticket.paymentStatus || (ticket.paid ? "paid" : "unpaid"),
    serviceStatus: ticket.status || "booked",
    amount: amountValue,
    cost: ticket.cost,
    profit: amountValue - (ticket.cost || 0),
    amountPaid: paid,
    balance: ticket.balance ?? Math.max(0, amountValue - paid),
    currency: ticket.currency,
    served: ticket.servedBy || "Agency team",
    notes: ticket.notes,
    kind: "ticket",
  };
}
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <SomwayIcon name={name} size={size} />;

  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    ticket: (
      <>
        <path d="M3 8a3 3 0 0 0 0 6v4h18v-4a3 3 0 0 0 0-6V4H3z" />
        <path d="M13 5v2M13 11v2M13 17v1" />
      </>
    ),
    money: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M14.8 8.7c-.6-.6-1.5-.9-2.5-.9-1.3 0-2.3.6-2.3 1.6 0 2.5 4.8 1.1 4.8 3.6 0 1-.9 1.7-2.4 1.7-1 0-2-.3-2.7-1" />
        <path d="M12.4 6.4v11.2" />
      </>
    ),
    box: (
      <>
        <path d="m3 7 9-4 9 4-9 4z" />
        <path d="M3 7v10l9 4 9-4V7M12 11v10" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" />
        <path d="M16 13h5M17 13h.01" />
      </>
    ),
    passport: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <circle cx="12" cy="10" r="3" />
        <path d="M8 16h8M8 19h5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    cargo: (
      <>
        <path d="m3 7 9-4 9 4-9 4z" />
        <path d="M3 7v10l9 4 9-4V7M12 11v10" />
      </>
    ),
    visa: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <circle cx="12" cy="9" r="3" />
        <path d="M8 17h8M8 14h8" />
      </>
    ),
    close: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    expense: (
      <>
        <path d="M12 2v20M17 6.5C16 5 14 4 12 4 9.8 4 8 5.3 8 7s1.5 2.5 4.5 3.3S17 12 17 14s-2 3.5-5 3.5c-2.2 0-4.2-1-5.2-2.5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21c.5-5 3-7 7-7s6.5 2 7 7M16 5a4 4 0 0 1 0 7M17 14c3 0 5 2 5 6" />
      </>
    ),
    report: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </>
    ),
    phone: (
      <path d="M5 3h4l2 5-3 2c1.4 2.9 3.1 4.6 6 6l2-3 5 2v4c0 1.1-.9 2-2 2C10.2 20.5 3.5 13.8 3 5c0-1.1.9-2 2-2z" />
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    message: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.9L3 21l1.8-5a8.5 8.5 0 1 1 16.2-4.5z" />
        <path d="M8 12h.01M12 12h.01M16 12h.01" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h7v18h-7" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
      </>
    ),
    edit: (
      <>
        <path d="m4 20 4-1 11-11-3-3L5 16zM14 7l3 3" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    eye: (
      <>
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    "eye-off": (
      <>
        <path d="M17.94 17.94A10.6 10.6 0 0 1 12 19c-7 0-11-7-11-7a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a20.4 20.4 0 0 1-3.22 4.36" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <path d="M1 1l22 22" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.grid}
    </svg>
  );
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <img
      className={`brand-mark ${className}`.trim()}
      src="/somway-primary-logo-alpha.png"
      alt="SomWay Travel & Logistics"
    />
  );
}
function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <img
      className={`brand-master-logo ${className}`.trim()}
      src="/somway-primary-logo-alpha.png"
      alt="SomWay Travel & Logistics"
    />
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <div className="field-control">{children}</div>
    </label>
  );
}
function PasswordInput({
  value,
  onChange,
  autoComplete,
  autoFocus,
  required,
  minLength,
  placeholder,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
      >
        <Icon name={visible ? "eye-off" : "eye"} size={16} />
      </button>
    </div>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "blue" | "neutral";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty empty-state">
      <span>
        <Icon name="cargo" size={26} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
// Branch country flags. ISO 3166-1 alpha-2 codes are turned into regional
// indicator pairs, so a flag needs no image asset, scales with the type and
// stays crisp at any density. An unknown country simply renders no flag
// rather than a broken placeholder.
const COUNTRY_CODES: Record<string, string> = {
  somalia: "SO",
  somaliland: "SO",
  kenya: "KE",
  ethiopia: "ET",
  djibouti: "DJ",
  eritrea: "ER",
  uganda: "UG",
  tanzania: "TZ",
  rwanda: "RW",
  "south sudan": "SS",
  sudan: "SD",
  egypt: "EG",
  "united arab emirates": "AE",
  uae: "AE",
  "saudi arabia": "SA",
  qatar: "QA",
  oman: "OM",
  yemen: "YE",
  turkey: "TR",
  "türkiye": "TR",
  china: "CN",
  india: "IN",
  pakistan: "PK",
  "south africa": "ZA",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  usa: "US",
  canada: "CA",
};
const countryFlag = (country?: string) => {
  const code = COUNTRY_CODES[String(country || "").trim().toLowerCase()];
  if (!code) return "";
  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
};
// Windows has no emoji flag glyphs, so a regional-indicator pair renders as
// bare letters ("SO", "KE") in Chrome and Edge. The two countries SomWay
// actually operates in are drawn as SVG so they are real flags on every
// platform; anything else falls back to the emoji, then to the ISO code.
const FLAG_ART: Record<string, ReactNode> = {
  SO: (
    <svg viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#4189dd" />
      <path
        fill="#fff"
        d="M12 4.2l1.03 3.17h3.33l-2.7 1.96 1.03 3.17L12 10.53l-2.69 1.97 1.03-3.17-2.7-1.96h3.33z"
      />
    </svg>
  ),
  KE: (
    <svg viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="4.6" fill="#000" />
      <rect y="5.4" width="24" height="5.2" fill="#be0027" />
      <rect y="11.4" width="24" height="4.6" fill="#009a44" />
      <g stroke="#fff" strokeWidth="0.8" strokeLinecap="round">
        <path d="M9.4 3.2L14.6 12.8" />
        <path d="M14.6 3.2L9.4 12.8" />
      </g>
      <ellipse cx="12" cy="8" rx="2.5" ry="4.6" fill="#be0027" />
      <path d="M12 3.4a2.5 4.6 0 000 9.2z" fill="#000" />
      <path d="M12 3.4a2.5 4.6 0 010 9.2z" fill="#000" opacity="0.001" />
      <path
        d="M12 3.4a2.5 4.6 0 000 9.2"
        fill="none"
        stroke="#fff"
        strokeWidth="0.5"
      />
      <path d="M11.3 5.6h1.4v4.8h-1.4z" fill="#fff" />
    </svg>
  ),
};

// Office values are stored as branch names ("Nairobi Office"), sometimes as
// the bare city or the code, so resolve loosely before looking up a country.
const branchByOffice = (data: AgencyData, office?: string) => {
  const value = String(office || "").trim().toLowerCase();
  if (!value) return undefined;
  return data.branches?.find(
    (branch) =>
      branch.name.toLowerCase() === value ||
      branch.code.toLowerCase() === value ||
      branch.name.toLowerCase().startsWith(value) ||
      value.startsWith(branch.city.toLowerCase()),
  );
};

/**
 * A branch name shown inline with its country flag. Used wherever a branch is
 * named as plain text rather than as a chip: report headings, receipt rows,
 * branch performance, expense breakdowns and the public site.
 */
function BranchName({
  data,
  branch,
  country,
  className = "",
}: {
  data?: AgencyData;
  branch?: string;
  country?: string;
  className?: string;
}) {
  const resolved =
    country || (data ? branchByOffice(data, branch)?.country : undefined);
  return (
    <span className={`branch-inline ${className}`.trim()}>
      <BranchFlag country={resolved} />
      <span>{branch}</span>
    </span>
  );
}

/**
 * A branch picker that shows each country's flag. A native <select> cannot
 * render an image inside <option>, so this is a listbox.
 *
 * `onChange` deliberately receives `{ target: { value } }` so it is a drop-in
 * replacement for the <select> it supersedes: the surrounding forms derive
 * currency, payment method and office name from the chosen branch in handlers
 * that already read `event.target.value`, and none of that logic has to move.
 */
function BranchSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select a branch",
  allLabel,
  allValue = "",
  required,
}: {
  options: Branch[];
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Filters offer an "All Branches" entry ahead of the list. */
  allLabel?: string;
  allValue?: string;
  /** Accepted so this drops into forms that marked the old <select>
   *  required. The list always has a branch selected, so there is nothing
   *  to enforce, but dropping the prop silently would be worse. */
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((branch) => branch.id === value);
  const showingAll = Boolean(allLabel) && !selected;
  return (
    <div className="branch-select">
      <button
        type="button"
        className="branch-select-button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <>
            <BranchFlag country={selected.country} />
            <span>{selected.name}</span>
          </>
        ) : showingAll ? (
          <>
            <Icon name="building" size={16} />
            <span>{allLabel}</span>
          </>
        ) : (
          <span className="branch-select-placeholder">{placeholder}</span>
        )}
        <Icon name="chevron" size={14} />
      </button>
      {open && !disabled && (
        <>
          <button
            type="button"
            className="notif-scrim"
            aria-label="Close branch list"
            onClick={() => setOpen(false)}
          />
          <ul className="branch-select-list" role="listbox">
            {allLabel && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={showingAll}
                  className={showingAll ? "is-selected" : ""}
                  onClick={() => {
                    onChange({ target: { value: allValue } });
                    setOpen(false);
                  }}
                >
                  <Icon name="building" size={16} />
                  <span>
                    <strong>{allLabel}</strong>
                    <small>Every branch</small>
                  </span>
                </button>
              </li>
            )}
            {options.map((branch) => (
              <li key={branch.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={branch.id === value}
                  className={branch.id === value ? "is-selected" : ""}
                  onClick={() => {
                    onChange({ target: { value: branch.id } });
                    setOpen(false);
                  }}
                >
                  <BranchFlag country={branch.country} />
                  <span>
                    <strong>{branch.name}</strong>
                    <small>
                      {branch.city}, {branch.country}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** The office chip used across registers, receipts and client records. */
function BranchBadge({ data, office }: { data: AgencyData; office?: string }) {
  const branch = branchByOffice(data, office);
  return (
    <Badge tone={branch?.country === "Kenya" ? "blue" : "success"}>
      <BranchFlag country={branch?.country} />
      {office}
    </Badge>
  );
}

function BranchFlag({ country }: { country?: string }) {
  const code = COUNTRY_CODES[String(country || "").trim().toLowerCase()];
  if (!code) return null;
  const art = FLAG_ART[code];
  return (
    <span className="branch-flag" role="img" aria-label={country}>
      {art || countryFlag(country) || code}
    </span>
  );
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Avatar({
  user,
  className = "",
}: {
  user: { name: string; avatarUrl?: string };
  className?: string;
}) {
  if (user.avatarUrl) {
    return (
      <img
        className={`avatar avatar-photo ${className}`}
        src={user.avatarUrl}
        alt=""
      />
    );
  }
  return <div className={`avatar ${className}`}>{initialsOf(user.name)}</div>;
}

// Photos are resized in the browser before upload: a phone camera JPEG is
// several megabytes, and the profile only ever renders this at ~44px.
const AVATAR_PIXELS = 256;
const readResizedImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That image could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("That file is not a valid image."));
      image.onload = () => {
        const side = Math.min(image.width, image.height);
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_PIXELS;
        canvas.height = AVATAR_PIXELS;
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("That image could not be processed."));
        // Centre-crop to a square so the circular frame never distorts a face.
        context.drawImage(
          image,
          (image.width - side) / 2,
          (image.height - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_PIXELS,
          AVATAR_PIXELS,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });

function ProfileModal({
  user,
  roleLabel,
  branchName,
  onSaved,
  onClose,
}: {
  user: User;
  roleLabel: string;
  branchName: string;
  onSaved: (user: User) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const pickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      setAvatarUrl(await readResizedImage(file));
    } catch (photoError) {
      setError(
        photoError instanceof Error ? photoError.message : "That image could not be used.",
      );
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const body: Record<string, string> = { name, phone, avatarUrl };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const result = await apiRequest<{ user: User }>("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSaved(result.user);
      setCurrentPassword("");
      setNewPassword("");
      setNotice(
        newPassword
          ? "Profile updated. You have been signed out on other devices."
          : "Profile updated.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "The profile could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Your profile" subtitle={`${roleLabel}${branchName ? ` · ${branchName}` : ""}`} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-notice">{notice}</p>}
        <div className="profile-photo-row">
          <Avatar user={{ name, avatarUrl }} className="profile-photo" />
          <div className="profile-photo-actions">
            <label className="button secondary">
              {avatarUrl ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/*" onChange={pickPhoto} hidden />
            </label>
            {avatarUrl && (
              <button type="button" className="ghost" onClick={() => setAvatarUrl("")}>
                Remove
              </button>
            )}
            <small className="muted">Square images work best.</small>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Full name">
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Phone">
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+252 61 563 3609"
            />
          </Field>
          <Field label="Username">
            <input value={user.username} readOnly disabled />
          </Field>
          <Field label="Role">
            <input value={roleLabel} readOnly disabled />
          </Field>
        </div>
        <p className="form-intro">
          Leave the password fields empty unless you want to change your password.
        </p>
        <div className="form-grid">
          <Field label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 10 characters"
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type Notification = {
  id: string;
  kind: string;
  severity: "high" | "medium" | "low";
  title: string;
  reference: string;
  detail: string;
  page: Page;
  recordId: string;
  at: string;
};

function NotificationsPanel({
  items,
  loading,
  error,
  onOpen,
  onClose,
}: {
  items: Notification[];
  loading: boolean;
  error: string;
  onOpen: (item: Notification) => void;
  onClose: () => void;
}) {
  return (
    <div className="notif-panel" role="dialog" aria-label="Notifications">
      <div className="notif-head">
        <strong>Notifications</strong>
        <button className="text-button" onClick={onClose} aria-label="Close notifications">
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="notif-list">
        {loading && <p className="notif-empty">Checking your records…</p>}
        {!loading && error && <p className="notif-empty">{error}</p>}
        {!loading && !error && !items.length && (
          <p className="notif-empty">Nothing needs attention right now.</p>
        )}
        {!loading &&
          !error &&
          items.map((item) => (
            <button key={item.id} className="notif-item" onClick={() => onOpen(item)}>
              <span className={`notif-dot notif-${item.severity}`} />
              <span className="notif-body">
                <strong>{item.title}</strong>
                <span className="notif-ref">{item.reference}</span>
                <span className="notif-detail">{item.detail}</span>
              </span>
              <Icon name="chevron" size={14} />
            </button>
          ))}
      </div>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  children,
  side,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  side?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <span className="eyebrow">Agency Workspace</span>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className={`modal-grid ${side ? "with-side" : ""}`}>
          <div>{children}</div>
          {side && <aside className="modal-side">{side}</aside>}
        </div>
        <div className="modal-close-wrap">
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
function Confirm({
  title,
  detail,
  onConfirm,
  onClose,
  confirmLabel = "Confirm",
}: {
  title: string;
  detail: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
}) {
  return (
    <Modal title={title} subtitle={detail} onClose={onClose}>
      <div className="modal-actions">
        <button className="button ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="button danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
function PageHeader({
  eyebrow,
  title,
  detail,
  actions,
  icon,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  actions?: ReactNode;
  /** Optional glyph shown beside the title, as the Daily Summary design does. */
  icon?: string;
}) {
  return (
    <header className="page-header" data-context={eyebrow}>
      <div>
        <h1>
          {title}
          {icon && (
            <i className="page-title-icon" aria-hidden="true">
              <Icon name={icon} size={20} />
            </i>
          )}
        </h1>
        <p>{detail}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
function Kpi({
  label,
  value,
  note,
  icon,
  tone = "green",
  valueClassName = "",
}: {
  label: string;
  value: string | number;
  note: string;
  icon: string;
  tone?: string;
  valueClassName?: string;
}) {
  return (
    <article className="metric-card card-hover">
      <div className={`metric-icon tone-${tone}`}>
        <Icon name={icon} />
      </div>
      <div className="metric-main">
        <span className="eyebrow-soft">{label}</span>
        <strong className={valueClassName}>{value}</strong>
        <div className="metric-foot">
          <span />
          <span>{note}</span>
        </div>
      </div>
    </article>
  );
}
// One KPI card per branch/currency/service in the daily summary. It mirrors
// the system metric-card look (icon chip + eyebrow label + big value) but the
// body carries the four money figures for that service instead of a single
// value, so the branch report reads as cards rather than a repeating table.
const SERVICE_ICONS: Record<string, string> = {
  tickets: "ticket",
  ticket: "ticket",
  visas: "passport",
  visa: "passport",
  cargo: "box",
};
const SERVICE_TONES: Record<string, string> = {
  tickets: "blue",
  ticket: "blue",
  visas: "cyan",
  visa: "cyan",
  cargo: "violet",
};
function ServiceKpiCard({
  currency,
  service,
  transactions,
  revenue,
  directCost,
  profit,
  customerDebt,
}: {
  currency: string;
  service: string;
  transactions: number;
  revenue: string;
  directCost: string;
  profit: string;
  customerDebt: string;
}) {
  const key = service.toLowerCase();
  const icon = SERVICE_ICONS[key] || "receipt";
  const tone = SERVICE_TONES[key] || "green";
  return (
    <article className="metric-card card-hover service-kpi">
      <div className={`metric-icon tone-${tone}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="metric-main">
        <span className="eyebrow-soft">
          {currency} · {service}
        </span>
        <strong>{revenue}</strong>
        <span className="service-kpi-caption">
          {transactions} transaction{transactions === 1 ? "" : "s"} · Revenue
        </span>
        <dl className="service-kpi-stats">
          <div>
            <dt>Direct Cost</dt>
            <dd>{directCost}</dd>
          </div>
          <div>
            <dt>Profit</dt>
            <dd className="is-profit">{profit}</dd>
          </div>
          <div>
            <dt>Customer Debt</dt>
            <dd>{customerDebt}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
// One KPI card per branch/currency/payment-method in the daily summary. Same
// metric-card look as ServiceKpiCard, but the body carries the cash-drawer
// figures: Closing is the headline, with Opening/Received/Refunds/Expenses/
// Payables Paid beneath.
const METHOD_ICONS: Record<string, string> = {
  cash: "money",
  "m-pesa": "phone",
  mpesa: "phone",
  "evc plus": "phone",
  evc: "phone",
  bank: "building",
  card: "wallet",
};
const METHOD_TONES: Record<string, string> = {
  cash: "green",
  "m-pesa": "cyan",
  mpesa: "cyan",
  "evc plus": "cyan",
  evc: "cyan",
  bank: "blue",
  card: "violet",
};
function MethodKpiCard({
  currency,
  method,
  closing,
  opening,
  received,
  refunds,
  expenses,
  payablesPaid,
}: {
  currency: string;
  method: string;
  closing: string;
  opening: string;
  received: string;
  refunds: string;
  expenses: string;
  payablesPaid: string;
}) {
  const key = method.toLowerCase();
  const icon = METHOD_ICONS[key] || "wallet";
  const tone = METHOD_TONES[key] || "blue";
  return (
    <article className="metric-card card-hover service-kpi">
      <div className={`metric-icon tone-${tone}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="metric-main">
        <span className="eyebrow-soft">
          {currency} · {method}
        </span>
        <strong>{closing}</strong>
        <span className="service-kpi-caption">Closing balance</span>
        <dl className="service-kpi-stats">
          <div>
            <dt>Opening</dt>
            <dd>{opening}</dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd className="is-profit">{received}</dd>
          </div>
          <div>
            <dt>Refunds</dt>
            <dd>{refunds}</dd>
          </div>
          <div>
            <dt>Expenses</dt>
            <dd>{expenses}</dd>
          </div>
          <div>
            <dt>Payables Paid</dt>
            <dd>{payablesPaid}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
function MetricCard({
  icon,
  label,
  value,
  delta,
  tone = "blue",
  foot,
}: {
  icon: string;
  label: string;
  value: string | number;
  delta?: string;
  tone?: string;
  foot?: string;
}) {
  return (
    <div className="metric-card card-hover">
      <div className={`metric-icon tone-${tone}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="metric-main">
        <span className="eyebrow-soft">{label}</span>
        <strong>{value}</strong>
        <div className="metric-foot">
          <span
            className={
              delta?.startsWith("↓") || delta?.startsWith("-")
                ? "negative"
                : "positive"
            }
          >
            {delta || ""}
          </span>
          <span>{foot || ""}</span>
        </div>
      </div>
    </div>
  );
}
function Panel({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-head">
        {title && (
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}
        {actions && <div>{actions}</div>}
      </div>
      {children}
    </section>
  );
}
function StatusBadge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "orange" | "red" | "violet" | "cyan" | "gray";
}) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
// On phones the registers render as stacked cards instead of a wide table
// (see the max-width:767px block in somway-handoff-compat.css). Each cell
// shows its column name from `data-label`. Headers are authored inline in
// sixteen different tables, so rather than thread labels through every call
// site the labels are mirrored from the table's own <thead>. No dependency
// array: rows change with filters, search and new records, and the labels
// have to follow.
function useStackedTableLabels() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const table = ref.current?.querySelector("table");
    if (!table) return;
    const headers = [...table.querySelectorAll("thead th")].map(
      (header) => header.textContent?.trim() || "",
    );
    if (!headers.length) return;
    for (const row of table.querySelectorAll("tbody tr")) {
      [...row.children].forEach((cell, index) => {
        // Action cells have a blank header; they stay full width on mobile.
        if (headers[index]) cell.setAttribute("data-label", headers[index]);
      });
    }
  });
  return ref;
}
function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  const tableRef = useStackedTableLabels();
  return (
    <div className="table-wrap" ref={tableRef}>
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
/**
 * One icon and colour per financial metric, so "Profit" looks the same on
 * every page it appears on. Colour follows meaning: money in is green,
 * money out is orange, what we are owed is blue, margin is violet.
 */
const METRIC_LOOK: Record<string, { icon: string; tone: string }> = {
  customerCharges: { icon: "receipt", tone: "blue" },
  paymentsReceived: { icon: "money", tone: "green" },
  directCost: { icon: "expense", tone: "orange" },
  profit: { icon: "trend", tone: "violet" },
  grossProfit: { icon: "trend", tone: "violet" },
  revenue: { icon: "chart", tone: "cyan" },
  collections: { icon: "wallet", tone: "green" },
  outstanding: { icon: "clock", tone: "red" },
  refunds: { icon: "logout", tone: "pink" },
  netReceived: { icon: "wallet", tone: "cyan" },
};
const metricLook = (metric: string) =>
  METRIC_LOOK[metric] || { icon: "chart", tone: "blue" };

/**
 * Period-on-period movement for a dashboard figure. Returns "" when there is
 * nothing to compare against -- a card shows no arrow rather than a made-up
 * one. A rise from zero has no meaningful percentage, so it reads as "new".
 */
const trendDelta = (current: number, previous: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return "";
  if (previous === 0) return current > 0 ? "↑ new" : "";
  if (current === previous) return "↔ 0.0%";
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return `${change > 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}%`;
};

/** Records dated inside [from, to] on the given field. */
const datedWithin = <T,>(rows: T[], field: keyof T, from: string, to: string) =>
  rows.filter((row) => {
    const value = String(row[field] ?? "").slice(0, 10);
    return value >= from && value <= to;
  });

/** The equally long window immediately before [from, to]. */
const previousWindow = (from: string, to: string) => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start)
    return { from, to };
  const spanDays = Math.round((end - start) / 86400000) + 1;
  const previousEnd = new Date(start - 86400000);
  const previousStart = new Date(start - spanDays * 86400000);
  return {
    from: previousStart.toISOString().slice(0, 10),
    to: previousEnd.toISOString().slice(0, 10),
  };
};

const compactTick = (value: number) => {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}K`;
  return String(Math.round(value));
};

function BarChart({
  values,
  labels,
  showAxis = false,
  axisLabel,
}: {
  values: number[];
  labels: string[];
  showAxis?: boolean;
  axisLabel?: string;
}) {
  const max = Math.max(...values, 1);
  // Round the top of the scale up to a readable step so ticks land on whole numbers.
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const niceMax = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => niceMax * fraction);
  const bars = (
    <div className="bar-chart">
      {showAxis && (
        <div className="bar-chart-grid" aria-hidden="true">
          {ticks.map((tick) => <i key={tick} />)}
        </div>
      )}
      {values.map((value, index) => (
        <div className="bar-group" key={`${labels[index]}-${index}`}>
          <div className="bar-stack"><i style={{ height: `${Math.max(3, (value / niceMax) * 100)}%` }} /></div>
          <span>{labels[index]}</span>
        </div>
      ))}
    </div>
  );

  if (!showAxis) return bars;

  return (
    <div className="bar-chart-wrap" role="img" aria-label={axisLabel || "Bar chart"}>
      <div className="bar-chart-axis" aria-hidden="true">
        {ticks.map((tick) => <span key={tick}>{compactTick(tick)}</span>)}
      </div>
      {bars}
    </div>
  );
}
function Donut({
  total,
  segments,
  centerLabel,
  detailed = false,
}: {
  total: string;
  segments: { value: number; color: string; label: string; amount?: string }[];
  centerLabel?: string;
  /** Shows the share above the amount on two lines, as the reference does. */
  detailed?: boolean;
}) {
  const stops = segments.reduce(
    (result, segment) => {
      const start = result.accumulated;
      const accumulated = start + segment.value;
      return {
        accumulated,
        stops: [...result.stops, `${segment.color} ${start}% ${accumulated}%`],
      };
    },
    { accumulated: 0, stops: [] as string[] },
  ).stops.join(", ");
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
        <div><strong>{total}</strong><span>{centerLabel || "Total"}</span></div>
      </div>
      <div className={detailed ? "legend legend-detailed" : "legend"}>
        {segments.map((segment) => (
          <div key={segment.label}>
            <i style={{ background: segment.color }} />
            <span>{segment.label}</span>
            {detailed ? (
              <b>
                {segment.value.toFixed(1)}%<em>{segment.amount}</em>
              </b>
            ) : (
              <b>{segment.amount || `${segment.value}%`}</b>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function Toolbar({
  query,
  setQuery,
  office,
  setOffice,
  branches = [],
  allowAll = true,
}: {
  query: string;
  setQuery: (v: string) => void;
  office: string;
  setOffice: (v: string) => void;
  branches?: Branch[];
  allowAll?: boolean;
}) {
  return (
    <div className="toolbar filter-row">
      <label className="search-box search-field">
        <Icon name="search" size={17} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search records…"
        />
      </label>
      <label className="filter-field">
        <span>Branch</span>
        <div>
          <Icon name="building" size={16} />
          <select value={office} onChange={(e) => setOffice(e.target.value)}>
            {allowAll && <option value="All">All Branches</option>}
            {branches.map((branch) => (
              <option key={branch.id} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
          <Icon name="chevron" size={14} />
        </div>
      </label>
    </div>
  );
}
function Actions({
  onEdit,
  onDelete,
  onPayment,
  paymentLabel = "Record payment",
}: {
  onEdit: () => void;
  onDelete?: () => void;
  onPayment?: () => void;
  paymentLabel?: string;
}) {
  return (
    <div className="row-actions action-group">
      {onPayment && (
        <button type="button" className="small-icon payment-action" title={paymentLabel} onClick={onPayment}>
          Pay
        </button>
      )}
      <button
        className="small-icon edit-action"
        aria-label="Edit"
        onClick={onEdit}
      >
        <Icon name="edit" size={16} />
      </button>
      {onDelete && (
        <button
          className="small-icon delete-action"
          aria-label="Delete"
          onClick={onDelete}
        >
          <Icon name="trash" size={16} />
        </button>
      )}
    </div>
  );
}
function TableShell({
  children,
  className = "",
}: {
  children: ReactNode;
  /** `metric-table` keeps a dense financial table in two columns on a phone
   *  instead of one field per row. */
  className?: string;
}) {
  const tableRef = useStackedTableLabels();
  return (
    <div className={`table-wrap ${className}`.trim()} ref={tableRef}>
      <table>{children}</table>
    </div>
  );
}

function CustomerPaymentForm({
  transactionType,
  transactionId,
  label,
  branchId,
  currency,
  balance,
  customer,
  service,
  totalCharge,
  amountPaid,
  isRefund = false,
  data,
  onClose,
  onSaved,
}: {
  transactionType: "ticket" | "visa" | "cargo";
  transactionId: string;
  label: string;
  branchId: string;
  currency: Currency;
  balance: number;
  customer?: string;
  service?: string;
  totalCharge?: number;
  amountPaid?: number;
  isRefund?: boolean;
  data: AgencyData;
  onClose: () => void;
  onSaved: (data: AgencyData) => void;
}) {
  const methods = paymentMethodsFor(data, branchId, currency);
  const [form, setForm] = useState({
    amount: String(balance || ""),
    paymentDate: today(),
    paymentMethod: methods[0] || ("Bank" as PaymentMethod),
    reference: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = await apiRequest<{ data: AgencyData }>("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": globalThis.crypto.randomUUID(),
        },
        body: JSON.stringify({
          transactionType,
          transactionId,
          branchId,
          amount: Number(form.amount),
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          reference: form.reference,
          notes: form.notes,
        }),
      });
      onSaved(payload.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Payment could not be recorded",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={isRefund ? "Record Refund" : "Record Payment"}
      subtitle={`${label} / Remaining ${money(balance, currency)}`}
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        {error && <p className="form-error">{error}</p>}
        {!isRefund && (
          <dl className="payment-summary">
            <div><dt>Customer</dt><dd>{customer || label}</dd></div>
            <div><dt>Service</dt><dd>{service || transactionType}</dd></div>
            <div><dt>Reference</dt><dd>{label}</dd></div>
            <div><dt>Total Charge</dt><dd>{money(totalCharge ?? balance, currency)}</dd></div>
            <div><dt>Previously Paid</dt><dd>{money(amountPaid || 0, currency)}</dd></div>
            <div><dt>Remaining Balance</dt><dd>{money(balance, currency)}</dd></div>
            <div><dt>Payment Branch</dt><dd>{branchById(data, branchId)?.name || "Assigned branch"}</dd></div>
          </dl>
        )}
        <div className="form-grid">
          <Field label={isRefund ? "Refund amount" : "Amount received"}>
            <input
              required
              min="0.01"
              max={balance}
              step="0.01"
              type="number"
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
            />
          </Field>
          <Field label={isRefund ? "Refund date" : "Payment date"}>
            <input
              required
              type="date"
              value={form.paymentDate}
              onChange={(event) =>
                setForm({ ...form, paymentDate: event.target.value })
              }
            />
          </Field>
          <Field label="Payment method">
            <select
              required
              value={form.paymentMethod}
              onChange={(event) =>
                setForm({
                  ...form,
                  paymentMethod: event.target.value as PaymentMethod,
                })
              }
            >
              {methods.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </Field>
          <Field label="Reference">
            <input
              value={form.reference}
              onChange={(event) =>
                setForm({ ...form, reference: event.target.value })
              }
            />
          </Field>
          <Field label="Notes" wide>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={
              busy || Number(form.amount) <= 0 || Number(form.amount) > balance
            }
          >
            {busy ? "Saving..." : isRefund ? "Record Refund" : "Record Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const entityCollections = [
  "tickets",
  "cargo",
  "visas",
  "expenses",
  "suppliers",
  "clients",
  "closes",
  "rates",
  "startingBalances",
  "paymentMethods",
  "branchPaymentMethods",
] as const;
type EntityCollection = (typeof entityCollections)[number];
function changedEntity(
  current: AgencyData,
  next: AgencyData,
): {
  collection: EntityCollection;
  record?: Record<string, unknown>;
  deletedId?: string;
  created: boolean;
} | null {
  const changed = entityCollections.filter((key) => current[key] !== next[key]);
  const nonEntityChanged =
    current.agencyName !== next.agencyName || current.users !== next.users;
  if (nonEntityChanged || changed.length !== 1) return null;
  const collection = changed[0];
  const before = current[collection] as Array<Record<string, unknown>>;
  const after = next[collection] as Array<Record<string, unknown>>;
  const beforeIds = new Set(before.map((item) => String(item.id || "")));
  const afterIds = new Set(after.map((item) => String(item.id || "")));
  const added = after.filter((item) => !beforeIds.has(String(item.id || "")));
  const removed = before.filter((item) => !afterIds.has(String(item.id || "")));
  const updated = after.filter((item) => {
    const prior = before.find((candidate) => candidate.id === item.id);
    return prior && prior !== item;
  });
  if (added.length === 1 && removed.length === 0 && updated.length === 0)
    return { collection, record: added[0], created: true };
  if (added.length === 0 && removed.length === 0 && updated.length === 1)
    return { collection, record: updated[0], created: false };
  if (added.length === 0 && removed.length === 1 && updated.length === 0)
    return { collection, deletedId: String(removed[0].id), created: false };
  return null;
}

export default function Home() {
  const [data, setData] = useState<AgencyData>(emptyData);
  const dataRef = useRef<AgencyData>(emptyData);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [portalPath, setPortalPath] = useState("/");
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState<Page>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifError, setNotifError] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [focusRef, setFocusRef] = useState("");
  const [seenAlerts, setSeenAlerts] = useState<string[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Toasts carry a tone: a failed save used to render with the same green
  // tick as a success, so an error read as confirmation. Errors also stay
  // on screen longer and can be dismissed, because they need reading.
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState<"success" | "error">("success");
  const [overviewBranchId, setOverviewBranchId] = useState("");
  const [overviewFrom, setOverviewFrom] = useState(`${today().slice(0, 7)}-01`);
  const [overviewTo, setOverviewTo] = useState(today());
  const applyData = (source: Partial<AgencyData>) => {
    const next = syncClients({ ...emptyData, ...source });
    dataRef.current = next;
    setData(next);
  };
  const loadWorkspace = async (signedIn: User) => {
    const response = await fetch("/api/data", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.error || "Could not load agency data.");
    applyData(payload.data || {});
    setLoadError("");
    markTabSignedIn();
    setUser(signedIn);
  };
  useEffect(() => {
    let active = true;
    const load = async () => {
      const path = window.location.pathname;
      setPortalPath(path);
      if (path === "/") {
        setReady(true);
        return;
      }
      try {
        const statusResponse = await fetch("/api/auth/status", {
          cache: "no-store",
        });
        const status = await statusResponse.json();
        if (!statusResponse.ok)
          throw new Error(status.error || "Secure storage is unavailable.");
        if (!active) return;
        // The owner account is created directly (seed or database), so the
        // in-app first-run setup screen is intentionally not shown; /admin
        // always presents the email + password login form.
        void status;
        // This tab never signed in -- a new tab, or a return visit after the
        // browser closed. Do not resume the cookie; show the login screen.
        if (!tabHasSession()) return;
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        if (meResponse.status === 401) {
          clearTabSession();
          return;
        }
        const me = await meResponse.json();
        if (!meResponse.ok)
          throw new Error(
            me.error || "The current session could not be checked.",
          );
        const sessionUser = me.user as User;
        if (path === "/admin" && sessionUser.role !== "owner") {
          await fetch("/api/auth/logout", { method: "POST" });
              clearTabSession();
          return;
        }
        if (path.startsWith("/portal/")) {
          const token = path.split("/").filter(Boolean)[1] || "";
          const linkResponse = await fetch(
            `/api/auth/link?token=${encodeURIComponent(token)}`,
            { cache: "no-store" },
          );
          const link = await linkResponse.json();
          if (!linkResponse.ok)
            throw new Error(
              link.error || "This staff access link is unavailable.",
            );
          if (
            String(link.user.username).toLowerCase() !==
            sessionUser.username.toLowerCase()
          ) {
            await fetch("/api/auth/logout", { method: "POST" });
              clearTabSession();
            return;
          }
        }
        const dataResponse = await fetch("/api/data", { cache: "no-store" });
        const payload = await dataResponse.json();
        if (!dataResponse.ok)
          throw new Error(payload.error || "Could not load agency data.");
        if (!active) return;
        applyData(payload.data || {});
        setUser(sessionUser);
      } catch (error) {
        if (active)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not open the secure workspace.",
          );
      } finally {
        if (active) setReady(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(
      () => setToast(""),
      toastTone === "error" ? 9000 : 2800,
    );
    return () => clearTimeout(id);
  }, [toast, toastTone]);
  // The server rejected a request because this account no longer has a valid
  // session -- it was deleted, suspended, or signed out elsewhere. Drop back
  // to the login screen immediately rather than leaving a dead workspace on
  // screen where every action would fail.
  useEffect(() => {
    const onExpired = () => {
      clearTabSession();
      setUser(null);
      setNotifications([]);
      setNotifOpen(false);
      setAccountOpen(false);
      setProfileOpen(false);
      setLoadError("Your session has ended. Please sign in again.");
    };
    globalThis.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => globalThis.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);
  // Alerts are derived from the records, so they are refetched whenever the
  // workspace data changes -- taking a payment clears its own alert. The
  // spinner is raised here, while rendering, rather than inside the effect:
  // it goes up in the same paint that shows the changed records, instead of
  // one paint later, and the effect is left to report only what came back.
  const [notifSource, setNotifSource] = useState<unknown>(null);
  if (user && notifSource !== data) {
    setNotifSource(data);
    setNotifLoading(true);
  }
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiRequest<{ items: Notification[] }>("/api/notifications")
      .then((result) => {
        if (cancelled) return;
        setNotifications(result.items || []);
        setNotifError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setNotifications([]);
        setNotifError(
          error instanceof Error ? error.message : "Alerts are unavailable.",
        );
      })
      .finally(() => {
        if (!cancelled) setNotifLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, data]);
  // Alerts that have not been opened yet. A refetch keeps an alert in the
  // list, but it only counts towards the badge until it has been seen.
  const unseenCount = notifications.filter(
    (item) => !seenAlerts.includes(item.id),
  ).length;
  const save = (
    updater: (current: AgencyData) => AgencyData,
    action?: { entity: string; detail: string },
  ) => {
    if (!user) return Promise.resolve(false);
    const operation = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const current = dataRef.current;
        const rawNext = updater(current);
        const entityChange = changedEntity(current, rawNext);
        if (!entityChange) {
          throw new Error(
            "This change requires a dedicated secure endpoint and was not saved.",
          );
        }
        const requestPath = entityChange.deletedId
            ? `/api/entities/${entityChange.collection}/${encodeURIComponent(entityChange.deletedId)}`
            : `/api/entities/${entityChange.collection}${entityChange.created ? "" : `/${encodeURIComponent(String(entityChange.record?.id || ""))}`}`;
        const payload = await apiRequest<{ data?: AgencyData }>(
          requestPath,
          {
            method: entityChange.deletedId
              ? "DELETE"
              : entityChange.created
                ? "POST"
                : "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ record: entityChange.record, action }),
          },
        );
        if (payload.data) applyData(payload.data);
        return true;
      })
      .catch(async (error) => {
        try {
          const response = await fetch("/api/data", { cache: "no-store" });
          const payload = await response.json();
          if (response.ok && payload.data) applyData(payload.data);
        } catch {}
        setToastTone("error");
        setToast(
          error instanceof Error
            ? error.message
            : "Changes could not be saved.",
        );
        return false;
      });
    saveQueueRef.current = operation.then(() => undefined);
    return operation;
  };
  const notify = (message: string) => {
    setToastTone("success");
    setToast(message);
  };
  if (!ready)
    return (
      <main className="loading-screen">
        <BrandLogo className="loading-brand-logo" />
        <p>Preparing your agency workspace…</p>
      </main>
    );
  if (portalPath === "/") return <Landing />;
  if (loadError && !user)
    return <AuthMessage title="Access unavailable" detail={loadError} />;
  if (!user)
    return (
      <Login
        linkToken={
          portalPath.startsWith("/portal/")
            ? portalPath.split("/").filter(Boolean)[1]
            : ""
        }
        onLogin={loadWorkspace}
      />
    );
  const canFinancial = user.role === "owner" || user.role === "consultant";
  const navItems: {
    page: Page;
    label: string;
    icon: string;
    finance?: boolean;
    owner?: boolean;
  }[] = [
    { page: "overview", label: "Dashboard", icon: "dashboard" },
    { page: "tickets", label: "Bookings", icon: "plane" },
    { page: "cargo", label: "Cargo", icon: "box" },
    { page: "visas", label: "Visa Services", icon: "passport" },
    { page: "daily-close", label: "Daily Summary", icon: "settings" },
    { page: "expenses", label: "Expenses", icon: "wallet" },
    { page: "clients", label: "Clients", icon: "users" },
    {
      page: "receivables",
      label: "Accounts Receivable",
      icon: "money",
    },
    { page: "receipt", label: "Receipts", icon: "file" },
    { page: "tracking", label: "Track Shipment", icon: "search" },
    {
      page: "reports",
      label: "Financial Reports",
      icon: "chart",
      finance: true,
    },
    {
      page: "suppliers",
      label: "Accounts Payable",
      icon: "wallet",
      finance: true,
    },
    { page: "activity", label: "Activity Log", icon: "shield", finance: true },
    { page: "team", label: "Team & Roles", icon: "users", owner: true },
    { page: "settings", label: "Settings", icon: "settings", owner: true },
  ];
  const nav = navItems.filter(
    (item) =>
      (!item.finance || canFinancial) && (!item.owner || user.role === "owner"),
  );
  const renderPage = () => {
    switch (page) {
      case "overview":
        return (
          <Overview
            data={data}
            user={user}
            onNavigate={setPage}
            branchId={overviewBranchId}
            from={overviewFrom}
            to={overviewTo}
          />
        );
      case "tickets":
        return (
          <Tickets
            data={data}
            user={user}
            save={save}
            notify={notify}
            replaceData={applyData}
            scopeBranchId={overviewBranchId}
            focusRef={focusRef}
          />
        );
      case "cargo":
        return (
          <CargoDesk
            data={data}
            user={user}
            save={save}
            notify={notify}
            replaceData={applyData}
            scopeBranchId={overviewBranchId}
            focusRef={focusRef}
          />
        );
      case "visas":
        return (
          <Visas
            data={data}
            user={user}
            save={save}
            notify={notify}
            replaceData={applyData}
            scopeBranchId={overviewBranchId}
            focusRef={focusRef}
          />
        );
      case "daily-close":
        return (
          <DailyClose
            data={data}
            user={user}
            save={save}
            notify={notify}
            scopeBranchId={overviewBranchId}
            go={setPage}
          />
        );
      case "expenses":
        return <Expenses data={data} user={user} save={save} notify={notify} scopeBranchId={overviewBranchId} />;
      case "suppliers":
        return (
          <Suppliers
            data={data}
            user={user}
            save={save}
            notify={notify}
            replaceData={applyData}
          />
        );
      case "receivables":
        return (
          <Receivables
            data={data}
            user={user}
            notify={notify}
            replaceData={applyData}
          />
        );
      case "clients":
        return <Clients data={data} user={user} save={save} notify={notify} />;
      case "receipt":
        return <Receipt data={data} />;
      case "tracking":
        return <Tracking data={data} user={user} notify={notify} />;
      case "reports":
        return <Reports data={data} user={user} scopeBranchId={overviewBranchId} />;
      case "team":
        return <Team data={data} user={user} save={save} notify={notify} />;
      case "settings":
        return (
          <Settings
            data={data}
            user={user}
            save={save}
            notify={notify}
            replaceData={applyData}
          />
        );
      case "activity":
        return <ActivityLog data={data} />;
    }
  };
  return (
    <div className={`app-shell ${navCollapsed ? "nav-collapsed" : ""}`}>
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand-lockup sidebar-brand">
          <BrandLogo className="sidebar-logo" />
        </div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.page}
              className={page === item.page ? "active" : ""}
              onClick={() => {
                setFocusRef("");
                setPage(item.page);
                setMobileNav(false);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {page === item.page && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-promo">
          <span>Delivering journeys.</span>
          <strong>Connecting possibilities.</strong>
          <Icon name="plane" size={48} />
          <a href="#top">View Company Profile</a>
        </div>
        <div className="sidebar-user sidebar-footer">
          <button
            className="sidebar-profile"
            aria-label="Open your profile"
            onClick={() => {
              setProfileOpen(true);
              setMobileNav(false);
            }}
          >
            <Avatar user={user} className="user-avatar" />
            <span>
              <strong>{user.name}</strong>
              <span>{roleLabel[user.role]}</span>
            </span>
          </button>
          <button
            aria-label="Sign out"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              clearTabSession();
              window.location.href =
                portalPath === "/admin" ? "/admin" : portalPath;
            }}
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className="app-main">
        <header className="topbar">
          <button
            className="mobile-menu shell-menu"
            aria-label="Toggle navigation"
            onClick={() => {
              // Below 1280px the sidebar is an overlay drawer closed by the
              // scrim; at desktop widths it is a grid column we collapse.
              if (window.matchMedia("(min-width: 1280px)").matches) {
                setNavCollapsed((collapsed) => !collapsed);
              } else {
                setMobileNav(true);
              }
            }}
          >
            <Icon name="menu" />
          </button>
          <div className="workspace topbar-workspace workspace-context">
            <span className="office-pulse" />
            <span>
              <strong>{roleLabel[user.role]} Workspace</strong>
              <small>
                {page === "overview"
                  ? "Live travel and logistics overview"
                  : nav.find((item) => item.page === page)?.label}
              </small>
            </span>
          </div>
          <div className="top-actions">
            {/* Branch scope is global: it drives every module's branch filter.
                Operators are pinned to their own branch, so they see a label
                rather than a control they are not allowed to change. */}
            {branchOptions(data, user).length > 1 ? (
              <label className="topbar-filter topbar-control">
                <Icon name="building" size={16} />
                <select
                  value={overviewBranchId}
                  onChange={(event) => setOverviewBranchId(event.target.value)}
                  aria-label="Branch scope"
                >
                  <option value="">All Branches</option>
                  {branchOptions(data, user).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <Icon name="chevron" size={14} />
              </label>
            ) : (
              <span className="topbar-filter topbar-context">
                <Icon name="building" size={16} />
                {branchForUser(data, user)?.name || "All Branches"}
              </span>
            )}
            {/* The date range only governs the overview. Every other screen owns
                its own period control, so no date chip is shown there. */}
            {page === "overview" && canFinancial && (
              <label className="topbar-filter topbar-control topbar-date-control">
                <Icon name="calendar" size={16} />
                <input
                  aria-label="Overview start date"
                  type="date"
                  value={overviewFrom}
                  onChange={(event) => setOverviewFrom(event.target.value)}
                />
                <span>to</span>
                <input
                  aria-label="Overview end date"
                  type="date"
                  value={overviewTo}
                  onChange={(event) => setOverviewTo(event.target.value)}
                />
              </label>
            )}
            <div className="notif-anchor">
              <button
                className="icon-btn"
                aria-label={`Notifications${unseenCount ? `, ${unseenCount} needing attention` : ""}`}
                aria-expanded={notifOpen}
                onClick={() => {
                  setAccountOpen(false);
                  setNotifOpen((open) => !open);
                }}
              >
                <Icon name="bell" />
                {unseenCount > 0 && (
                  <span className="notif-badge">
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </span>
                )}
              </button>
            </div>
            <div className="account-anchor">
              <button
                className="account-button"
                aria-label={`Account menu for ${user.name}`}
                aria-expanded={accountOpen}
                onClick={() => {
                  setNotifOpen(false);
                  setAccountOpen((open) => !open);
                }}
              >
                <Avatar user={user} className="account-avatar" />
              </button>
            </div>
          </div>
        </header>
        <div className="page-wrap content" key={page}>
          {renderPage()}
        </div>
      </main>
      {/* The topbar is a horizontal scroll container on phones, so these
          panels are rendered outside it and positioned against the viewport
          rather than the button that opened them. */}
      {(notifOpen || accountOpen) && (
        <button
          className="notif-scrim"
          aria-label="Close menu"
          onClick={() => {
            setNotifOpen(false);
            setAccountOpen(false);
          }}
        />
      )}
      {notifOpen && (
        <NotificationsPanel
          items={notifications}
          loading={notifLoading}
          error={notifError}
          onClose={() => setNotifOpen(false)}
          onOpen={(item) => {
            // Opening an alert marks it seen: the badge drops by one while
            // the row stays in the list until the underlying work is done.
            setSeenAlerts((seen) =>
              seen.includes(item.id) ? seen : [...seen, item.id],
            );
            // Land on the right screen with the record's reference already
            // in the search box, so the row itself is what you see.
            setFocusRef(item.reference);
            setPage(item.page);
            setNotifOpen(false);
            setMobileNav(false);
          }}
        />
      )}
      {accountOpen && (
        <div className="account-menu" role="menu">
          <button
            className="account-identity"
            onClick={() => {
              setAccountOpen(false);
              setProfileOpen(true);
            }}
          >
            <Avatar user={user} />
            <span>
              <strong>{user.name}</strong>
              <span>{roleLabel[user.role]}</span>
            </span>
          </button>
          <button
            className="account-action"
            onClick={() => {
              setAccountOpen(false);
              setProfileOpen(true);
            }}
          >
            <Icon name="user" size={15} />
            Profile
          </button>
          <a className="account-action" href="/">
            <Icon name="plane" size={15} />
            Public website
          </a>
          <button
            className="account-action account-signout"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              clearTabSession();
              window.location.href =
                portalPath === "/admin" ? "/admin" : portalPath;
            }}
          >
            <Icon name="logout" size={15} />
            Sign out
          </button>
        </div>
      )}
      {profileOpen && (
        <ProfileModal
          user={user}
          roleLabel={roleLabel[user.role]}
          branchName={branchForUser(data, user)?.name || ""}
          onClose={() => setProfileOpen(false)}
          onSaved={(updated) => setUser({ ...user, ...updated })}
        />
      )}
      {toast && (
        <div className={`toast toast-${toastTone}`} role="status">
          <Icon name={toastTone === "error" ? "alert" : "check"} size={16} />
          <span>{toast}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss"
            onClick={() => setToast("")}
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function Landing() {
  const [trackingKind, setTrackingKind] = useState<"cargo" | "visa">("cargo");
  const [tracking, setTracking] = useState("");
  const [found, setFound] = useState<{
    kind: "cargo" | "visa";
    reference: string;
    origin?: Office;
    destination: string;
    status: string;
    date: string;
  } | null>(null);
  const [trackStatus, setTrackStatus] = useState<
    "idle" | "loading" | "ready" | "not-found" | "error"
  >("idle");
  const selectTrackingKind = (kind: "cargo" | "visa") => {
    setTrackingKind(kind);
    setTracking("");
    setFound(null);
    setTrackStatus("idle");
  };
  const lookup = async (event: FormEvent) => {
    event.preventDefault();
    if (!tracking.trim()) return;
    setTrackStatus("loading");
    try {
      const response = await fetch(
        `/api/public/track?kind=${trackingKind}&reference=${encodeURIComponent(tracking.trim())}`,
      );
      const payload = await response.json();
      if (!response.ok) throw new Error();
      setFound(payload.record || null);
      setTrackStatus(payload.record ? "ready" : "not-found");
    } catch {
      setFound(null);
      setTrackStatus("error");
    }
  };
  const services = [
    ["plane", "Air Ticketing", "Domestic and international flight booking, changes, rebooking and customer support.", "Book now", "#contact"],
    ["box", "Cargo Shipping", "Secure cargo intake, pricing, tracking, arrival, collection and delivery coordination.", "Track cargo", "#tracking"],
    ["passport", "Visa Processing", "Application intake, document tracking, payment monitoring and status communication.", "Track visa", "#tracking"],
    ["headset", "Travel Assistance", "Professional support from our Nairobi and Mogadishu offices.", "Contact support", "#contact"],
  ];
  return (
    <main className="public-page">
      <nav className="public-nav" aria-label="Public navigation">
        <a className="public-logo-lockup" href="#home" aria-label="SomWay home">
          <BrandLogo className="public-header-logo" />
        </a>
        <div className="public-links">
          <a className="active" href="#home">Home</a>
          <a href="#services">Services</a>
          <a href="#tracking">Cargo Tracking</a>
          <a href="#tracking">Visa Tracking</a>
          <a href="#branches">Branches</a>
          <a href="#contact">Contact</a>
          <a className="button primary" href="#tracking"><Icon name="box" /> Track Shipment</a>
        </div>
      </nav>

      <section className="hero public-hero-live" id="home">
        <img className="hero-media" src="/macruf-general-hero.png" alt="Passenger aircraft and professionally handled air cargo" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="chip">Welcome to SomWay</span>
          <h1>Your trusted partner for <span>travel, cargo and visa</span> services.</h1>
          <p>From air ticketing to secure cargo shipping and visa processing, SomWay connects Nairobi and Mogadishu with fast, reliable and professional service.</p>
          <div className="hero-actions">
            <a className="button primary" href="#tracking"><Icon name="box" /> Track Cargo</a>
            <a className="button secondary" href="#tracking"><Icon name="passport" /> Track Visa</a>
          </div>
          <div className="trust-chips">
            <span>Fast &amp; Reliable</span><span>Secure Handling</span><span>Real-time Tracking</span><span>Customer Support</span>
          </div>
        </div>
      </section>

      <section className="public-section" id="services">
        <div className="section-title"><h2>Our Services</h2><p>Professional solutions for travel, cargo and visa needs.</p></div>
        <div className="services-grid">
          {services.map(([icon, title, copy, action, href]) => (
            <article className="service-card" key={title}>
              <div className="service-icon"><Icon name={icon} /></div>
              <h3>{title}</h3><p>{copy}</p>
              <a href={href}>{action} <Icon name="arrow" size={14} /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="tracking-public" id="tracking">
        <div className="panel-head public-tracking-head">
          <div><h3>Tracking Centre</h3><p>Track cargo shipments and visa applications using your SomWay reference.</p></div>
          <div className="subtabs">
            <button type="button" className={trackingKind === "cargo" ? "active" : ""} onClick={() => selectTrackingKind("cargo")}>Cargo Shipment</button>
            <button type="button" className={trackingKind === "visa" ? "active" : ""} onClick={() => selectTrackingKind("visa")}>Visa Application</button>
          </div>
        </div>
        <form className="public-tracking-form" onSubmit={lookup}>
          <label className="search-field">
            <Icon name="search" />
            <input
              aria-label={trackingKind === "cargo" ? "Cargo tracking number" : "Visa application reference"}
              value={tracking}
              onChange={(event) => { setTracking(event.target.value); setTrackStatus("idle"); }}
              placeholder={trackingKind === "cargo" ? "Enter cargo tracking number" : "Enter visa application reference"}
            />
          </label>
          <button className="button primary" disabled={trackStatus === "loading"} type="submit">
            {trackStatus === "loading" ? "Checking..." : "Search"}
          </button>
        </form>
        <div className="public-result" aria-live="polite">
          {trackStatus === "idle" && <p>Use the complete reference printed on your SomWay receipt.</p>}
          {trackStatus === "not-found" && <p>No matching record was found. Check the reference and try again.</p>}
          {trackStatus === "error" && <p>Tracking is temporarily unavailable. Please contact SomWay for assistance.</p>}
          {trackStatus === "ready" && found && (
            <div className="public-result-grid">
              <div><span>Reference</span><strong>{found.reference}</strong></div>
              <div><span>{found.kind === "cargo" ? "Route" : "Destination"}</span><strong>{found.kind === "cargo" ? `${found.origin} to ${found.destination}` : found.destination}</strong></div>
              <div><span>Status</span><strong>{serviceStatusLabel(found.status)}</strong></div>
              <div><span>Date</span><strong>{dateLabel(found.date)}</strong></div>
            </div>
          )}
        </div>
      </section>

      <section className="public-section" id="branches">
        <div className="section-title"><h2>Our Branches</h2><p>Visit or contact SomWay in Nairobi or Mogadishu.</p></div>
        <div className="public-branches">
          {/* Each branch carries its own city artwork. Replacing the file in
              /public with a photograph of the office keeps the same path. */}
          {[
            [
              "Mogadishu Office",
              "Mogadishu, Somalia",
              "+252 61 563 3609",
              "/branch-mogadishu.jpg",
            ],
            [
              "Nairobi Office",
              "Nairobi, Kenya",
              "+254 700 000 000",
              "/branch-nairobi.jpg",
            ],
          ].map(([city, address, phone, image]) => (
            <article className="branch-card" key={city}>
              <div><h3><BranchName country={address.split(", ")[1]} branch={city} /></h3><p>{address}</p><p>{phone}<br />support@somway.com</p>
                <div className="subtabs"><a href={`tel:${phone.replace(/\s/g, "")}`}>Call</a><a href="#contact">WhatsApp</a><a href="mailto:support@somway.com">Email</a></div>
              </div>
              <img className="image" src={image} alt={`${address} branch`} loading="lazy" />
            </article>
          ))}
        </div>
      </section>

      <section className="public-section" id="contact">
        <div className="contact-grid">
          <div className="contact-card"><h3>Get in Touch</h3><p>Our team can help with tickets, visas and cargo.</p><div className="stack public-contact-list"><span><Icon name="phone" /> +252 61 563 3609</span><span><Icon name="mail" /> support@somway.com</span><span><Icon name="clock" /> Sat-Thu, 8:00 AM-6:00 PM</span></div></div>
          <div className="contact-card public-contact-copy"><h3>Travel and logistics, coordinated with care.</h3><p>Tell us which service you need and the SomWay team will guide you through the next step.</p><a className="button primary" href="mailto:support@somway.com"><Icon name="mail" /> Email SomWay</a></div>
          <div className="contact-card whatsapp"><Icon name="headset" size={52} /><div><h3>Need immediate help?</h3><p>Chat with our support team on WhatsApp.</p></div><a className="button secondary" href="https://wa.me/252615633609" target="_blank" rel="noreferrer"><Icon name="phone" /> Chat on WhatsApp</a></div>
        </div>
      </section>

      <footer className="public-footer">
        <div className="public-footer-brand"><div className="public-logo-lockup"><BrandLogo className="public-footer-logo" /></div><p>Your trusted partner for travel, cargo and visa services.</p></div>
        <div><h4>Quick Links</h4><a href="#home">Home</a><a href="#services">Services</a><a href="#tracking">Track Shipment</a><a href="#contact">Contact</a></div>
        <div><h4>Our Services</h4><a href="#services">Air Ticketing</a><a href="#services">Cargo Shipping</a><a href="#services">Visa Processing</a><a href="#services">Travel Assistance</a></div>
        <div><h4>Contact Us</h4><p>Mogadishu: +252 61 563 3609</p><p>Nairobi, Kenya</p><p>support@somway.com</p></div>
        {/* The Nairobi branch photo is CC BY 2.0, which requires the
            photographer to be credited wherever it is published. The
            Mogadishu photo is CC0 and needs no credit. */}
        <div className="footer-bottom">
          <span>
            Copyright {new Date().getFullYear()} SomWay Travel &amp; Logistics.
          </span>
          <span className="footer-credit">
            Nairobi photo by Ninara (CC BY 2.0) · Mogadishu photo by AMISOM
            Public Information (CC0)
          </span>
          <span>Privacy Policy &nbsp; Terms &amp; Conditions</span>
        </div>
      </footer>
    </main>
  );
}

function LegacyLanding() {
  const [trackingKind, setTrackingKind] = useState<"cargo" | "visa">("cargo");
  const [tracking, setTracking] = useState("");
  const [found, setFound] = useState<{
    kind: "cargo" | "visa";
    reference: string;
    origin?: Office;
    destination: string;
    status: string;
    date: string;
    visaType?: string;
    office?: Office;
  } | null>(null);
  const [trackStatus, setTrackStatus] = useState<
    "idle" | "loading" | "ready" | "not-found" | "error"
  >("idle");
  const selectTrackingKind = (kind: "cargo" | "visa") => {
    setTrackingKind(kind);
    setTracking("");
    setFound(null);
    setTrackStatus("idle");
  };
  const lookup = async (event: FormEvent) => {
    event.preventDefault();
    if (!tracking.trim()) return;
    setTrackStatus("loading");
    try {
      const response = await fetch(
        `/api/public/track?kind=${trackingKind}&reference=${encodeURIComponent(tracking.trim())}`,
      );
      const payload = await response.json();
      if (!response.ok) throw new Error();
      setFound(payload.record || null);
      setTrackStatus(payload.record ? "ready" : "not-found");
    } catch {
      setFound(null);
      setTrackStatus("error");
    }
  };
  const services = [
    {
      icon: "ticket",
      label: "Flight tickets",
      copy: "Regional and international flight booking with clear itineraries, direct communication and dependable follow-up.",
      link: "#contact",
      action: "Book your journey",
    },
    {
      icon: "cargo",
      label: "Air cargo",
      copy: "Reliable air-cargo handling with flexible per-kilogram pricing and clear shipment tracking from acceptance to delivery.",
      link: "#tracking",
      action: "Track your cargo",
    },
    {
      icon: "visa",
      label: "Visa applications",
      copy: "A straightforward visa application service with a SomWay reference for checking progress online.",
      link: "#tracking",
      action: "Track your application",
    },
  ];
  return (
    <main className="public-site">
      <header className="public-nav">
        <a
          className="public-brand"
          href="#top"
          aria-label={`${BRAND_NAME} home`}
        >
          <BrandLogo className="public-brand-logo" />
        </a>
        <nav aria-label="Public navigation">
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#tracking">Track status</a>
          <a href="#contact">Contact</a>
        </nav>
        <a
          className="public-whatsapp"
          href="https://wa.me/252615633609"
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="message" size={16} /> WhatsApp us
        </a>
      </header>
      <section className="public-hero" id="top">
        <img
          src="/macruf-general-hero.png"
          alt="Passenger aircraft and professionally handled air cargo in a modern airport environment"
        />
        <div className="public-hero-shade" />
        <div className="public-hero-copy">
          <p className="public-kicker">
            <span />
            Travel · Visa · Cargo
          </p>
          <h1>
            Your way to the world.
            <br />
            <em>Travel without limits.</em>
          </h1>
          <p>
            Book flights, submit visa applications and move cargo with one
            dependable team, supported by clear communication and online status
            tracking.
          </p>
          <div className="public-hero-actions">
            <a
              className="public-primary"
              href="https://wa.me/252615633609"
              target="_blank"
              rel="noreferrer"
            >
              Start your journey <Icon name="arrow" />
            </a>
          </div>
          <div className="public-trust">
            <span>
              <b>Flight booking</b>
              <small>Regional & international</small>
            </span>
            <span>
              <b>Air cargo</b>
              <small>Flexible pricing</small>
            </span>
            <span>
              <b>Visa applications</b>
              <small>Trackable progress</small>
            </span>
          </div>
        </div>
      </section>
      <div className="public-marquee" aria-hidden="true">
        <div>
          <span>Flight tickets</span>
          <i /> <span>Visa applications</span>
          <i /> <span>Air cargo</span>
          <i /> <span>Cargo tracking</span>
          <i /> <span>Visa tracking</span>
          <i /> <span>Flight tickets</span>
          <i /> <span>Visa applications</span>
          <i /> <span>Air cargo</span>
        </div>
      </div>
      <section className="public-about" id="about">
        <div className="about-statement">
          <p className="public-kicker">
            <span />
            About SomWay
          </p>
          <h2>Travel and cargo, coordinated with care.</h2>
        </div>
        <div className="about-copy">
          <p>
            SomWay Travel & Logistics helps travellers, families and
            businesses book flights, submit visa applications and move cargo
            with confidence.
          </p>
          <p>
            Every service follows one clear process, with direct communication
            from the first enquiry to the final confirmation or handoff.
          </p>
          <a href="#contact">
            Contact SomWay <Icon name="arrow" size={15} />
          </a>
        </div>
        <div className="about-values">
          <article>
            <span>01</span>
            <strong>Clear communication</strong>
            <p>
              Direct updates throughout your journey, application or shipment.
            </p>
          </article>
          <article>
            <span>02</span>
            <strong>One agency</strong>
            <p>
              Flight, visa and cargo services coordinated through one dependable
              experience.
            </p>
          </article>
          <article>
            <span>03</span>
            <strong>Trackable progress</strong>
            <p>Online references for cargo and visa application status.</p>
          </article>
        </div>
      </section>
      <section className="public-services" id="services">
        <div className="public-section-title">
          <div>
            <p>Our services</p>
            <h2>Three essential services. One clear experience.</h2>
          </div>
          <p>
            Thoughtful travel, visa and cargo services connected by clear
            communication and one consistent SomWay experience.
          </p>
        </div>
        <div className="service-cards">
          {services.map((service, index) => (
            <article
              style={{ "--delay": `${index * 110}ms` } as React.CSSProperties}
              key={service.label}
            >
              <span>0{index + 1}</span>
              <div className="service-icon">
                <Icon name={service.icon} size={24} />
              </div>
              <h3>{service.label}</h3>
              <p>{service.copy}</p>
              <a href={service.link}>
                {service.action} <Icon name="arrow" size={14} />
              </a>
            </article>
          ))}
        </div>
      </section>
      <section className="public-branches" aria-labelledby="branch-heading">
        <div className="public-section-title">
          <div>
            <p>Where we operate</p>
            <h2 id="branch-heading">Two offices. One connected journey.</h2>
          </div>
          <p>
            Local support in Kenya and Somalia, with the same clear SomWay
            experience from first request to final delivery.
          </p>
        </div>
        <div className="public-branch-list">
          <article>
            <BranchFlag country="Kenya" />
            <div>
              <strong>Nairobi Office</strong>
              <small>Nairobi, Kenya</small>
            </div>
            <Icon name="arrow" size={17} />
          </article>
          <article>
            <BranchFlag country="Somalia" />
            <div>
              <strong>Mogadishu Office</strong>
              <small>Mogadishu, Somalia</small>
            </div>
            <Icon name="arrow" size={17} />
          </article>
        </div>
      </section>
      <section className="public-track" id="tracking">
        <div>
          <p className="public-kicker">
            <span />
            Status tracking
          </p>
          <h2>One reference. A clear status.</h2>
          <p>
            Select cargo or visa application, then enter the complete reference
            issued by SomWay.
          </p>
          <div className="track-route" aria-hidden="true">
            <span>Cargo</span>
            <i>
              <b />
            </i>
            <span>Visa</span>
          </div>
        </div>
        <form className="public-track-box" onSubmit={lookup}>
          <div className="public-tracking-tabs">
            <button
              className={trackingKind === "cargo" ? "active" : ""}
              type="button"
              onClick={() => selectTrackingKind("cargo")}
            >
              <Icon name="cargo" /> Cargo
            </button>
            <button
              className={trackingKind === "visa" ? "active" : ""}
              type="button"
              onClick={() => selectTrackingKind("visa")}
            >
              <Icon name="visa" /> Visa application
            </button>
          </div>
          <div className="track-box-heading">
            <span>
              <Icon name={trackingKind} />
            </span>
            <div>
              <small>SomWay status desk</small>
              <strong>
                {trackingKind === "cargo"
                  ? "Track a shipment"
                  : "Track a visa application"}
              </strong>
            </div>
          </div>
          <label>
            <Icon name="search" size={20} />
            <input
              aria-label={
                trackingKind === "cargo"
                  ? "Cargo tracking number"
                  : "Visa application reference"
              }
              value={tracking}
              onChange={(event) => {
                setTracking(event.target.value);
                setTrackStatus("idle");
              }}
              placeholder={
                trackingKind === "cargo"
                  ? "Enter cargo tracking number"
                  : "Enter visa application reference"
              }
            />
            <button disabled={trackStatus === "loading"} type="submit">
              {trackStatus === "loading" ? "Checking…" : "Track"}
            </button>
          </label>
          <div className="track-feedback" aria-live="polite">
            {trackStatus === "idle" && (
              <p>
                Use the complete reference shown on your receipt or application
                record.
              </p>
            )}
            {trackStatus === "loading" && (
              <p className="track-loading">
                <i />
                Checking the latest recorded status…
              </p>
            )}
            {trackStatus === "ready" && found && (
              <div className="public-track-result">
                <div>
                  <small>Reference</small>
                  <strong>{found.reference}</strong>
                </div>
                <div>
                  <small>
                    {found.kind === "cargo" ? "Route" : "Destination"}
                  </small>
                  <strong>
                    {found.kind === "cargo"
                      ? `${found.origin} → ${found.destination}`
                      : found.destination}
                  </strong>
                </div>
                <div>
                  <small>Status</small>
                  <Badge
                    tone={
                      found.status === "Delivered" ||
                      found.status === "delivered" ||
                      found.status === "approved"
                        ? "success"
                        : found.status === "Claim" || found.status === "refused"
                          ? "danger"
                          : found.status === "Arrived"
                            ? "warning"
                            : "blue"
                    }
                  >
                    {found.kind === "visa"
                      ? serviceStatusLabel(found.status)
                      : found.status}
                  </Badge>
                </div>
                <div>
                  <small>
                    {found.kind === "cargo" ? "Received" : "Application date"}
                  </small>
                  <strong>{dateLabel(found.date)}</strong>
                </div>
              </div>
            )}
            {trackStatus === "not-found" && (
              <p className="public-track-empty">
                No {trackingKind === "cargo" ? "shipment" : "visa application"}{" "}
                matched that reference. Check the number or contact SomWay.
              </p>
            )}
            {trackStatus === "error" && (
              <p className="public-track-empty">
                Tracking is temporarily unavailable. Please contact us on
                WhatsApp for help.
              </p>
            )}
          </div>
        </form>
      </section>
      <section className="public-contact public-contact-cta" id="contact">
        <div className="contact-lead">
          <BrandMark className="contact-mark" />
          <p className="public-kicker">
            <span />
            Contact SomWay
          </p>
          <h2>Ready when you are.</h2>
          <p>
            Contact SomWay for flight booking, visa applications, cargo pricing
            or help with an existing reference.
          </p>
          <a
            className="contact-main"
            href="https://wa.me/252615633609"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="message" /> Contact us on WhatsApp <Icon name="arrow" />
          </a>
        </div>
      </section>
      <footer className="public-footer">
        <a className="public-brand" href="#top">
          <BrandLogo className="public-brand-logo" />
        </a>
        <p>Flight tickets · Visa applications · Air cargo</p>
        <div>
          <a href="https://wa.me/252615633609" target="_blank" rel="noreferrer">
            Contact SomWay
          </a>
          <span>
            © {new Date().getFullYear()} {BRAND_NAME}
          </span>
        </div>
      </footer>
    </main>
  );
}

function Login({
  linkToken,
  onLogin,
}: {
  linkToken: string;
  onLogin: (user: User) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [staffName, setStaffName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!linkToken) return;
    void fetch(`/api/auth/link?token=${encodeURIComponent(linkToken)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || "Staff link is unavailable.");
        setUsername(payload.user.username);
        setStaffName(payload.user.name);
      })
      .catch((error) =>
        setError(
          error instanceof Error ? error.message : "Staff link is unavailable.",
        ),
      );
  }, [linkToken]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          linkToken: linkToken || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Username or password is incorrect.");
      await onLogin(payload.user);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Sign-in could not be completed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="auth-screen">
      <section className="auth-story">
        <a className="auth-back" href="/">
          ← Public website
        </a>
        <div className="brand light">
          <BrandLogo className="auth-brand-logo" />
        </div>
        <div className="story-copy">
          <p className="eyebrow">Welcome back</p>
          <h1>Every journey, payment and handoff—accounted for.</h1>
          <p>A secure operating surface for two offices working as one.</p>
        </div>
        <div className="route-line">
          <span>NBO</span>
          <i />
          <b>Shared cargo desk</b>
          <i />
          <span>MGQ</span>
        </div>
      </section>
      <section className="auth-panel">
        <form onSubmit={submit}>
          <p className="eyebrow">Protected workspace</p>
          <h2>
            {staffName ? `Welcome, ${staffName.split(" ")[0]}` : "Sign in"}
          </h2>
          <p className="form-intro">
            Enter your email and password to continue.
          </p>
          <Field label="Email">
            <input
              type="email"
              readOnly={Boolean(linkToken)}
              autoFocus={!linkToken}
              autoComplete="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <PasswordInput
              autoFocus={Boolean(linkToken)}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <p className="form-error">{error}</p>}
          <button
            disabled={submitting}
            className="button primary full"
            type="submit"
          >
            {submitting ? "Logging in…" : "Login"} <Icon name="arrow" />
          </button>
          <p className="storage-note">
            <Icon name="lock" size={16} />
            Role permissions are enforced after sign-in.
          </p>
        </form>
      </section>
    </main>
  );
}

function AuthMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="auth-screen">
      <section className="auth-story">
        <a className="auth-back" href="/">
          ← Public website
        </a>
        <div className="brand light">
          <BrandLogo className="auth-brand-logo" />
        </div>
        <div className="story-copy">
          <p className="eyebrow">Protected workspace</p>
          <h1>Private agency access.</h1>
          <p>
            The public website remains available for clients and service
            information.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <div>
          <p className="eyebrow">Access notice</p>
          <h2>{title}</h2>
          <p className="form-intro">{detail}</p>
          <a className="button primary full" href="/">
            Return to public website <Icon name="arrow" />
          </a>
        </div>
      </section>
    </main>
  );
}

export function LegacyOverview({
  data,
  user,
  onNavigate,
}: {
  data: AgencyData;
  user: User;
  onNavigate: (p: Page) => void;
}) {
  const financial = user.role === "owner" || user.role === "consultant";
  const office = officeForRole(user.role);
  const myTickets = office
    ? data.tickets.filter((x) => x.office === office)
    : data.tickets;
  const myVisas = office
    ? data.visas.filter((x) => x.office === office)
    : data.visas;
  const openCargo = data.cargo.filter(
    (c) => !["delivered", "cancelled"].includes(cargoStatusKey(c.status)),
  );
  const thisMonth = today().slice(0, 7);
  const revenue = (currency: Currency) =>
    [
      ...data.tickets.map((x) => ({
        d: x.saleDate,
        c: x.currency,
        a: x.type === "Refund" ? -x.amount : x.amount,
      })),
      ...data.visas.map((x) => ({
        d: x.appDate,
        c: x.currency,
        a: x.type === "Refund" ? -x.amount : x.amount,
      })),
      ...data.cargo.map((x) => ({
        d: x.dateIn,
        c: x.currency,
        a: x.customerCharge ?? x.weight * x.rate,
      })),
    ]
      .filter((x) => x.c === currency && monthKey(x.d) === thisMonth)
      .reduce((s, x) => s + x.a, 0);
  const pipeline = [
    {
      label: "In transit",
      count: data.cargo.filter((c) => cargoStatusKey(c.status) === "in_transit")
        .length,
      tone: "blue",
    },
    {
      label: "Arrived",
      count: data.cargo.filter((c) => cargoStatusKey(c.status) === "arrived")
        .length,
      tone: "warning",
    },
    {
      label: "Delivered",
      count: data.cargo.filter((c) => cargoStatusKey(c.status) === "delivered")
        .length,
      tone: "success",
    },
    {
      label: "Claims",
      count: data.cargo.filter((c) => cargoStatusKey(c.status) === "claim")
        .length,
      tone: "danger",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow={`${roleLabel[user.role]} workspace`}
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}.`}
        detail={
          financial
            ? "Here’s the full agency picture across Nairobi and Mogadishu."
            : `Your ${office} operational desk is ready. Agency-wide financials are protected.`
        }
        actions={
          <button
            className="button primary"
            onClick={() => onNavigate("cargo")}
          >
            <Icon name="plus" /> New Cargo
          </button>
        }
      />
      <section className="kpi-grid">
        {financial ? (
          <>
            <Kpi
              label="Revenue this month"
              value={money(revenue("KES"), "KES")}
              note={`${money(revenue("USD"), "USD")} in USD`}
              icon="report"
            />
            <Kpi
              label="Open cargo"
              value={openCargo.length}
              note="Across all branches"
              icon="cargo"
              tone="blue"
            />
            <Kpi
              label="Unpaid items"
              value={
                [...data.tickets, ...data.visas, ...data.cargo].filter(
                  (x) => !x.paid,
                ).length
              }
              note="Needs follow-up"
              icon="expense"
              tone="cream"
            />
            <Kpi
              label="Active clients"
              value={data.clients.length}
              note="Registered relationships"
              icon="users"
              tone="violet"
            />
          </>
        ) : (
          <>
            <Kpi
              label="Tickets logged"
              value={myTickets.length}
              note={`${office} office`}
              icon="ticket"
            />
            <Kpi
              label="Shared cargo open"
              value={openCargo.length}
              note="Branch teams collaborate"
              icon="cargo"
              tone="blue"
            />
            <Kpi
              label="Visas in progress"
              value={
                myVisas.filter(
                  (v) => !["delivered", "refused"].includes(v.status),
                ).length
              }
              note={`${office} applications`}
              icon="visa"
              tone="cream"
            />
            <Kpi
              label="Your access"
              value="Operations"
              note="Financial reports hidden"
              icon="lock"
              tone="violet"
            />
          </>
        )}
      </section>
      <section className="dashboard-grid">
        <article className="panel span-2">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Live workflow</p>
              <h2>Cargo pipeline</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("cargo")}>
              Open cargo desk <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="pipeline">
            {pipeline.map((x) => (
              <div key={x.label}>
                <div className={`pipeline-count ${x.tone}`}>{x.count}</div>
                <span>{x.label}</span>
                <i
                  style={{
                    width: `${Math.max(6, data.cargo.length ? (x.count / data.cargo.length) * 100 : 6)}%`,
                  }}
                />
              </div>
            ))}
          </div>
          {data.cargo.length ? (
            <div className="recent-list">
              {data.cargo
                .slice()
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 4)
                .map((c) => (
                  <div key={c.id}>
                    <span className="route-token">
                      {c.origin.slice(0, 3).toUpperCase()}
                    </span>
                    <div>
                      <strong>{c.tracking}</strong>
                      <small>
                        {c.sender} → {c.receiver}
                      </small>
                    </div>
                    <Badge tone={cargoStatusTone(c.status)}>
                      {cargoStatusLabel(c.status)}
                    </Badge>
                  </div>
                ))}
            </div>
          ) : (
            <Empty
              title="No cargo yet"
              detail="Create the first shipment to start the shared handoff workflow."
            />
          )}
        </article>
        <article className="panel quick-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Move quickly</p>
              <h2>Daily actions</h2>
            </div>
          </div>
          {[
            { p: "tickets" as Page, l: "New Ticket", i: "ticket" },
            { p: "visas" as Page, l: "New Visa", i: "visa" },
            { p: "daily-close" as Page, l: "Complete Daily Close", i: "close" },
            { p: "tracking" as Page, l: "Track a Shipment", i: "search" },
          ].map((a) => (
            <button key={a.p} onClick={() => onNavigate(a.p)}>
              <span>
                <Icon name={a.i} />
              </span>
              {a.l}
              <Icon name="arrow" size={15} />
            </button>
          ))}
        </article>
      </section>
    </>
  );
}

function PreviousOverview({
  data,
  user,
  onNavigate,
}: {
  data: AgencyData;
  user: User;
  onNavigate: (p: Page) => void;
}) {
  const financial = user.role === "owner" || user.role === "consultant";
  const operatorBranch = branchForUser(data, user);
  const office = officeForRole(user.role) || operatorBranch?.name || "assigned";
  const branches = activeBranches(data);
  const [branchId, setBranchId] = useState("");
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [trendCurrency, setTrendCurrency] = useState<Currency>("KES");
  const monthStart = `${today().slice(0, 7)}-01`;

  useEffect(() => {
    if (!financial) return;
    let active = true;
    const asOf = today();
    void Promise.all([
      fetch(
        `/api/reports/finance?branchId=${encodeURIComponent(branchId)}&from=${monthStart}&to=${asOf}`,
        { cache: "no-store" },
      ),
      fetch(
        `/api/receivables?branchId=${encodeURIComponent(branchId)}&status=outstanding&asOf=${asOf}`,
        { cache: "no-store" },
      ),
    ])
      .then(async ([reportResponse, receivableResponse]) => {
        const reportPayload = await reportResponse.json();
        const receivablePayload = await receivableResponse.json();
        if (!reportResponse.ok || !receivableResponse.ok)
          throw new Error(
            reportPayload.error ||
              receivablePayload.error ||
              "Dashboard could not be loaded.",
          );
        if (active)
          setReport({
            ...reportPayload,
            accountsReceivable: {
              summary: receivablePayload.summary || {},
              totals: receivablePayload.totals || [],
            },
          });
      })
      .catch(() => active && setReport({ rows: [], totals: [], trend: [] }));
    return () => {
      active = false;
    };
  }, [branchId, financial, monthStart]);

  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const scopedCargo = branchId
    ? data.cargo.filter((cargo) => cargo.originBranchId === branchId)
    : data.cargo;
  const scopedClients = branchId
    ? data.clients.filter((client) => client.homeBranchId === branchId)
    : data.clients;
  const activeCargo = scopedCargo.filter(
    (cargo) => cargoStatusKey(cargo.status) !== "cancelled",
  );
  const openCargo = activeCargo.filter(
    (cargo) => cargoStatusKey(cargo.status) !== "delivered",
  );
  const myTickets = operatorBranch
    ? data.tickets.filter((ticket) => ticket.branchId === operatorBranch.id)
    : data.tickets;
  const myVisas = operatorBranch
    ? data.visas.filter((visa) => visa.branchId === operatorBranch.id)
    : data.visas;
  const totals = report?.totals || [];
  const receivableTotals = report?.accountsReceivable?.totals || [];
  const currencies = totals.map((row) => row.currency);
  const primaryCurrency = (
    selectedBranch?.defaultCurrency ||
    (currencies.includes("KES") ? "KES" : currencies[0]) ||
    "USD"
  ) as Currency;
  const receivableValue = receivableTotals.length
    ? receivableTotals
        .slice()
        .sort((a, b) => Number(b.totalOutstanding > 0) - Number(a.totalOutstanding > 0))
        .map((row) => money(row.totalOutstanding, row.currency))
        .join("\n")
    : money(0, selectedBranch?.defaultCurrency || "USD");
  const revenueValue = totals.length
    ? totals
        .slice()
        .sort((a, b) => Number(b.revenue !== 0) - Number(a.revenue !== 0))
        .map((row) => money(row.revenue, row.currency))
        .join("\n")
    : money(0, primaryCurrency);
  const receivableRecords = receivableTotals.reduce(
    (count, row) => count + row.outstandingRecords,
    0,
  );
  const trendCurrencies = currencies.length
    ? currencies
    : selectedBranch
      ? branchCurrencies(selectedBranch)
      : (["KES", "USD"] as Currency[]);
  const activeTrendCurrency = trendCurrencies.includes(trendCurrency)
    ? trendCurrency
    : primaryCurrency;
  const trendValues = (report?.trend || []).map((month) => ({
    label: month.label,
    value: month.rows
      .filter((row) => row.currency === activeTrendCurrency)
      .reduce((sum, row) => sum + row.revenue, 0),
  }));
  const maxTrend = Math.max(1, ...trendValues.map((item) => item.value));
  const serviceSummary = (["ticket", "cargo", "visa"] as const).map(
    (service) =>
      (report?.rows || [])
        .filter((row) => row.currency === activeTrendCurrency)
        .reduce(
          (summary, row) => ({
            ...summary,
            transactions:
              summary.transactions +
              (row.serviceDetails?.[service]?.transactions || 0),
            revenue:
              summary.revenue +
              (row.serviceDetails?.[service]?.paymentsReceived || 0),
          }),
          { service, transactions: 0, revenue: 0 },
        ),
  );
  const pipeline = [
    { label: "In transit", status: "in_transit", tone: "blue" },
    { label: "Arrived", status: "arrived", tone: "warning" },
    { label: "Delivered", status: "delivered", tone: "success" },
    { label: "Claims", status: "claim", tone: "danger" },
  ].map((item) => ({
    ...item,
    count: scopedCargo.filter(
      (cargo) => cargoStatusKey(cargo.status) === item.status,
    ).length,
  }));

  return (
    <>
      <PageHeader
        eyebrow={`${roleLabel[user.role]} workspace`}
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}.`}
        detail={
          financial
            ? `Current business overview for ${selectedBranch?.name || "all branches"}. Current balances remain separate from this month's revenue.`
            : `Your ${office} operational desk is ready. Agency-wide financials are protected.`
        }
        actions={
          financial ? (
            <select
              className="overview-branch-select"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              aria-label="Dashboard branch"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : (
            <button className="button primary" onClick={() => onNavigate("cargo")}>
              <Icon name="plus" /> New Cargo
            </button>
          )
        }
      />
      <section className="kpi-grid">
        {financial ? (
          <>
            <Kpi
              label="Total Revenue"
              value={revenueValue}
              valueClassName="kpi-multi-value"
              note="This month"
              icon="report"
            />
            <Kpi
              label="Total Cargo"
              value={activeCargo.length}
              note={`${openCargo.length} currently open`}
              icon="cargo"
              tone="blue"
            />
            <Kpi
              label="Accounts Receivable"
              value={receivableValue}
              valueClassName="kpi-multi-value"
              note={`${receivableRecords} outstanding ${receivableRecords === 1 ? "record" : "records"}`}
              icon="expense"
              tone="cream"
            />
            <Kpi
              label="Total Clients"
              value={
                scopedClients.filter((client) => client.isActive !== false)
                  .length
              }
              note={selectedBranch?.name || "All active client relationships"}
              icon="users"
              tone="violet"
            />
          </>
        ) : (
          <>
            <Kpi
              label="Tickets logged"
              value={myTickets.length}
              note={`${office} office`}
              icon="ticket"
            />
            <Kpi
              label="Shared cargo open"
              value={openCargo.length}
              note="Branch teams collaborate"
              icon="cargo"
              tone="blue"
            />
            <Kpi
              label="Visas in progress"
              value={
                myVisas.filter(
                  (visa) => !["delivered", "refused"].includes(visa.status),
                ).length
              }
              note={`${office} applications`}
              icon="visa"
              tone="cream"
            />
            <Kpi
              label="Your access"
              value="Operations"
              note="Financial reports hidden"
              icon="lock"
              tone="violet"
            />
          </>
        )}
      </section>
      {financial && (
        <section className="dashboard-grid executive-dashboard">
          <article className="panel span-2">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Six-month movement</p>
                <h2>{activeTrendCurrency} revenue trend</h2>
              </div>
              {trendCurrencies.length > 1 && (
                <select
                  className="trend-select"
                  value={activeTrendCurrency}
                  onChange={(event) =>
                    setTrendCurrency(event.target.value as Currency)
                  }
                >
                  {trendCurrencies.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              )}
            </div>
            {trendValues.some((item) => item.value !== 0) ? (
              <div className="bar-chart dashboard-trend">
                {trendValues.map((item) => (
                  <div key={item.label}>
                    <span>
                      {new Intl.NumberFormat("en", {
                        notation: "compact",
                      }).format(item.value)}
                    </span>
                    <i
                      style={{
                        height: `${Math.max(4, (item.value / maxTrend) * 100)}%`,
                      }}
                    />
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="No revenue in this period"
                detail="Recorded ticket, cargo and visa sales will appear here."
              />
            )}
          </article>
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Current month</p>
                <h2>Revenue by service</h2>
              </div>
            </div>
            <div className="service-snapshot">
              {serviceSummary.map((item) => (
                <div key={item.service}>
                  <span>
                    {item.service[0].toUpperCase() + item.service.slice(1)}
                  </span>
                  <strong>{money(item.revenue, activeTrendCurrency)}</strong>
                  <small>{item.transactions} transactions</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
      <section className="dashboard-grid">
        <article className="panel span-2">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Live workflow</p>
              <h2>Cargo pipeline</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("cargo")}>
              Open cargo desk <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="pipeline">
            {pipeline.map((item) => (
              <div key={item.label}>
                <div className={`pipeline-count ${item.tone}`}>
                  {item.count}
                </div>
                <span>{item.label}</span>
                <i
                  style={{
                    width: `${Math.max(6, scopedCargo.length ? (item.count / scopedCargo.length) * 100 : 6)}%`,
                  }}
                />
              </div>
            ))}
          </div>
          {scopedCargo.length ? (
            <div className="recent-list">
              {scopedCargo
                .slice()
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 4)
                .map((cargo) => (
                  <div key={cargo.id}>
                    <span className="route-token">
                      {cargo.origin.slice(0, 3).toUpperCase()}
                    </span>
                    <div>
                      <strong>{cargo.tracking}</strong>
                      <small>
                        {cargo.sender} to {cargo.receiver}
                      </small>
                    </div>
                    <Badge tone={cargoStatusTone(cargo.status)}>
                      {cargoStatusLabel(cargo.status)}
                    </Badge>
                  </div>
                ))}
            </div>
          ) : (
            <Empty
              title="No cargo yet"
              detail="Create the first shipment to start the shared handoff workflow."
            />
          )}
        </article>
        <article className="panel quick-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Move quickly</p>
              <h2>Daily actions</h2>
            </div>
          </div>
          {[
            { p: "tickets" as Page, l: "New Ticket", i: "ticket" },
            { p: "visas" as Page, l: "New Visa", i: "visa" },
            { p: "daily-close" as Page, l: "Review Daily Summary", i: "close" },
            { p: "tracking" as Page, l: "Track a Shipment", i: "search" },
          ].map((action) => (
            <button key={action.p} onClick={() => onNavigate(action.p)}>
              <span>
                <Icon name={action.i} />
              </span>
              {action.l}
              <Icon name="arrow" size={15} />
            </button>
          ))}
        </article>
      </section>
    </>
  );
}

function Overview({
  data,
  user,
  onNavigate,
  branchId,
  from,
  to,
}: {
  data: AgencyData;
  user: User;
  onNavigate: (p: Page) => void;
  branchId: string;
  from: string;
  to: string;
}) {
  const financial = user.role === "owner" || user.role === "consultant";
  const branches = activeBranches(data);
  const [report, setReport] = useState<FinanceReport | null>(null);
  // Totals for the window immediately before the selected one, so the money
  // cards can show a real movement. Empty when that fetch fails.
  const [priorTotals, setPriorTotals] = useState<FinanceReport["totals"]>([]);
  const [trendCurrency, setTrendCurrency] = useState<Currency>("USD");

  useEffect(() => {
    if (!financial) return;
    let active = true;
    const before = previousWindow(from, to);
    void Promise.all([
      fetch(
        `/api/reports/finance?branchId=${encodeURIComponent(branchId)}&from=${from}&to=${to}`,
        { cache: "no-store" },
      ),
      fetch(
        `/api/receivables?branchId=${encodeURIComponent(branchId)}&status=outstanding&asOf=${to}`,
        { cache: "no-store" },
      ),
      // The same report for the window immediately before this one. Its
      // failure must not take the dashboard down, so it resolves to null.
      fetch(
        `/api/reports/finance?branchId=${encodeURIComponent(branchId)}&from=${before.from}&to=${before.to}`,
        { cache: "no-store" },
      )
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    ])
      .then(async ([financeResponse, receivableResponse, priorPayload]) => {
        const financePayload = await financeResponse.json();
        const receivablePayload = await receivableResponse.json();
        if (!financeResponse.ok || !receivableResponse.ok)
          throw new Error("Overview data could not be loaded.");
        if (active) {
          setPriorTotals(priorPayload?.totals || []);
          setReport({
            ...financePayload,
            accountsReceivable: {
              rows: receivablePayload.rows || [],
              summary: receivablePayload.summary || {},
              totals: receivablePayload.totals || [],
            },
          });
        }
      })
      .catch(() => active && setReport({ rows: [], totals: [], trend: [] }));
    return () => {
      active = false;
    };
  }, [branchId, financial, from, to]);

  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const scopedTickets = branchId
    ? data.tickets.filter((ticket) => ticket.branchId === branchId)
    : data.tickets;
  const scopedCargo = branchId
    ? data.cargo.filter((cargo) => cargo.originBranchId === branchId)
    : data.cargo;
  const scopedVisas = branchId
    ? data.visas.filter((visa) => visa.branchId === branchId)
    : data.visas;
  const scopedClients = branchId
    ? data.clients.filter((client) => client.homeBranchId === branchId)
    : data.clients;
  const totals = report?.totals || [];
  const receivableTotals = report?.accountsReceivable?.totals || [];
  const currencies = Array.from(
    new Set([
      ...totals.map((row) => row.currency),
      ...receivableTotals.map((row) => row.currency),
    ]),
  ) as Currency[];
  const displayCurrencies = currencies.length
    ? currencies
    : selectedBranch
      ? branchCurrencies(selectedBranch)
      : (["KES", "USD"] as Currency[]);
  const activeTrendCurrency = displayCurrencies.includes(trendCurrency)
    ? trendCurrency
    : displayCurrencies[0];
  const formatTotals = (
    rows: { currency: Currency; value: number }[],
    fallback = displayCurrencies,
  ) =>
    (rows.length
      ? rows
      : fallback.map((currency) => ({ currency, value: 0 })))
      .map((row) => money(row.value, row.currency))
      .join("\n");
  const revenueValue = formatTotals(
    totals.map((row) => ({
      currency: row.currency,
      value: row.paymentsReceived ?? row.revenue,
    })),
  );
  const receivableValue = formatTotals(
    receivableTotals.map((row) => ({
      currency: row.currency,
      value: row.totalOutstanding,
    })),
  );
  // Period-on-period movement. The counts are dated locally; the money
  // figures come from the finance report, which is already range-scoped.
  const prior = previousWindow(from, to);
  const cargoNow = datedWithin(scopedCargo, "dateIn", from, to).length;
  const cargoBefore = datedWithin(scopedCargo, "dateIn", prior.from, prior.to).length;
  const ticketsNow = datedWithin(scopedTickets, "saleDate", from, to).length;
  const ticketsBefore = datedWithin(scopedTickets, "saleDate", prior.from, prior.to).length;
  const visasNow = datedWithin(scopedVisas, "appDate", from, to).length;
  const visasBefore = datedWithin(scopedVisas, "appDate", prior.from, prior.to).length;

  // Money movement is compared in the currency on screen, since totals are
  // reported per currency and cannot be summed across them.
  const sumFor = (
    rows: { currency: Currency; paymentsReceived?: number; revenue?: number }[],
  ) =>
    rows
      .filter((row) => row.currency === activeTrendCurrency)
      .reduce((total, row) => total + (row.paymentsReceived ?? row.revenue ?? 0), 0);

  const trends = {
    payments: trendDelta(sumFor(totals), sumFor(priorTotals)),
    cargo: trendDelta(cargoNow, cargoBefore),
    tickets: trendDelta(ticketsNow, ticketsBefore),
    visas: trendDelta(visasNow, visasBefore),
  };

  const activeCargo = scopedCargo.filter(
    (cargo) => !["cancelled", "delivered"].includes(cargoStatusKey(cargo.status)),
  );
  const pendingVisas = scopedVisas.filter((visa) => visa.status === "submitted");
  const completedJobs =
    scopedCargo.filter((cargo) => cargoStatusKey(cargo.status) === "delivered")
      .length +
    scopedVisas.filter((visa) => visa.status === "delivered").length +
    scopedTickets.filter((ticket) => ticket.status === "issued").length;
  const receivableRecords = receivableTotals.reduce(
    (sum, row) => sum + row.outstandingRecords,
    0,
  );
  const openPayables = data.suppliers.filter(
    (supplier) =>
      supplier.recordStatus !== "cancelled" &&
      supplier.billed - supplier.paid > 0 &&
      (!branchId || supplier.branchId === branchId),
  ).length;
  const trendValues = (report?.trend || []).map((month) => ({
    label: month.label,
    value: month.rows
      .filter((row) => row.currency === activeTrendCurrency)
      .reduce(
        (sum, row) => sum + (row.paymentsReceived ?? row.revenue),
        0,
      ),
  }));
  const maxTrend = Math.max(1, ...trendValues.map((item) => item.value));
  const serviceSummary = (["ticket", "cargo", "visa"] as const).map(
    (service) => {
      const matchingRows = (report?.rows || []).filter(
        (row) => row.currency === activeTrendCurrency,
      );
      return matchingRows.reduce(
        (summary, row) => ({
          ...summary,
          transactions:
            summary.transactions +
            (row.serviceDetails?.[service]?.transactions || 0),
          revenue:
            summary.revenue +
            (row.serviceDetails?.[service]?.paymentsReceived || 0),
        }),
        { service, transactions: 0, revenue: 0 },
      );
    },
  );
  const serviceTotal = Math.max(
    1,
    serviceSummary.reduce((sum, item) => sum + item.revenue, 0),
  );
  const ticketShare = (serviceSummary[0].revenue / serviceTotal) * 100;
  const cargoShare = (serviceSummary[1].revenue / serviceTotal) * 100;
  const serviceChart = {
    background: `conic-gradient(#1565c0 0 ${ticketShare}%, #00acc1 ${ticketShare}% ${ticketShare + cargoShare}%, #46b96b ${ticketShare + cargoShare}% 100%)`,
  };
  const pipeline = [
    { label: "In Transit", status: "in_transit", tone: "blue", icon: "cargo" },
    { label: "Arrived", status: "arrived", tone: "cyan", icon: "location" },
    { label: "Ready", status: "ready_for_collection", tone: "amber", icon: "close" },
    { label: "Delivered", status: "delivered", tone: "green", icon: "receipt" },
  ].map((item) => ({
    ...item,
    count: scopedCargo.filter(
      (cargo) => cargoStatusKey(cargo.status) === item.status,
    ).length,
  }));
  const maxBranchRevenue = Math.max(
    1,
    ...(report?.rows || []).map(
      (row) => row.paymentsReceived ?? row.revenue,
    ),
  );
  const recentTransactions = [
    ...scopedTickets.map((ticket) => ({
      id: ticket.id,
      date: ticket.saleDate,
      type: "Ticket",
      icon: "ticket",
      description: `${ticket.passenger} · ${ticket.route}`,
      client: ticket.passenger,
      amount: ticket.amountPaid || 0,
      currency: ticket.currency,
      status: ticket.paymentStatus || (ticket.paid ? "paid" : "unpaid"),
    })),
    ...scopedCargo.map((cargo) => ({
      id: cargo.id,
      date: cargo.dateIn,
      type: "Cargo",
      icon: "cargo",
      description: `${cargo.origin} to ${cargo.destination}`,
      client: cargo.sender,
      amount: cargo.amountPaid || 0,
      currency: cargo.currency,
      status: cargo.paymentStatus || (cargo.paid ? "paid" : "unpaid"),
    })),
    ...scopedVisas.map((visa) => ({
      id: visa.id,
      date: visa.appDate,
      type: "Visa",
      icon: "visa",
      description: `${visa.destination} · ${visa.visaType}`,
      client: visa.applicant,
      amount: visa.amountPaid || 0,
      currency: visa.currency,
      status: visa.paymentStatus || (visa.paid ? "paid" : "unpaid"),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const clientActivity = scopedClients
    .map((client) => ({
      client,
      count:
        scopedTickets.filter((item) => item.clientId === client.id).length +
        scopedCargo.filter(
          (item) =>
            item.senderClientId === client.id || item.receiverClientId === client.id,
        ).length +
        scopedVisas.filter((item) => item.clientId === client.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  // Each alert carries its own count and colour. There is deliberately no
  // timestamp: these are standing counts of open work, not events, and the
  // row index was previously rendered as an age ("1h", "2h"), which read as
  // real data and was not.
  const alerts = [
    {
      label: "Customer payments due",
      count: receivableRecords,
      detail: `outstanding record${receivableRecords === 1 ? "" : "s"}`,
      icon: "receipt",
      tone: "red",
      page: "receivables" as Page,
    },
    {
      label: "Visa applications pending",
      count: pendingVisas.length,
      detail: "awaiting progress",
      icon: "visa",
      tone: "blue",
      page: "visas" as Page,
    },
    {
      label: "Cargo movements open",
      count: activeCargo.length,
      detail: `active shipment${activeCargo.length === 1 ? "" : "s"}`,
      icon: "cargo",
      tone: "cyan",
      page: "cargo" as Page,
    },
    {
      label: "Accounts payable",
      count: openPayables,
      detail: `open bill${openPayables === 1 ? "" : "s"}`,
      icon: "expense",
      tone: "pink",
      page: "suppliers" as Page,
    },
  ];

  return <LiveOverviewDashboard
    data={data}
    user={user}
    financial={financial}
    branches={branches}
    branchId={branchId}
    displayCurrencies={displayCurrencies}
    activeTrendCurrency={activeTrendCurrency}
    setTrendCurrency={setTrendCurrency}
    revenueValue={revenueValue}
    receivableValue={receivableValue}
    activeCargo={activeCargo}
    scopedCargo={scopedCargo}
    pendingVisas={pendingVisas}
    completedJobs={completedJobs}
    scopedClients={scopedClients}
    scopedVisas={scopedVisas}
    trends={trends}
    scopedTickets={scopedTickets}
    receivableRecords={receivableRecords}
    branchRows={report?.rows || []}
    trendValues={trendValues}
    serviceSummary={serviceSummary}
    pipeline={pipeline}
    recentTransactions={recentTransactions}
    clientActivity={clientActivity}
    alerts={alerts}
    onNavigate={onNavigate}
  />;

}

type LiveOverviewDashboardProps = {
  data: AgencyData;
  user: User;
  financial: boolean;
  branches: Branch[];
  branchId: string;
  displayCurrencies: Currency[];
  activeTrendCurrency: Currency;
  setTrendCurrency: (value: Currency) => void;
  revenueValue: string;
  receivableValue: string;
  activeCargo: Cargo[];
  scopedCargo: Cargo[];
  pendingVisas: Visa[];
  completedJobs: number;
  scopedClients: Client[];
  scopedVisas: Visa[];
  scopedTickets: Ticket[];
  receivableRecords: number;
  branchRows: FinanceReportRow[];
  trendValues: { label: string; value: number }[];
  serviceSummary: { service: string; transactions: number; revenue: number }[];
  pipeline: { label: string; status: string; tone: string; icon: string; count: number }[];
  recentTransactions: {
    id: string;
    date: string;
    type: string;
    icon: string;
    description: string;
    client: string;
    amount: number;
    currency: Currency;
    status: string;
  }[];
  clientActivity: { client: Client; count: number }[];
  alerts: {
    label: string;
    count: number;
    detail: string;
    icon: string;
    tone: string;
    page: Page;
  }[];
  onNavigate: (page: Page) => void;
  /** Period-on-period movement for the count cards. Empty when there is no
   *  comparable previous period. */
  trends: {
    payments: string;
    cargo: string;
    tickets: string;
    visas: string;
  };
};

function LiveOverviewDashboard({
  data,
  user,
  financial,
  branches,
  branchId,
  displayCurrencies,
  activeTrendCurrency,
  setTrendCurrency,
  revenueValue,
  receivableValue,
  activeCargo,
  scopedCargo,
  pendingVisas,
  completedJobs,
  scopedClients,
  scopedVisas,
  scopedTickets,
  receivableRecords,
  branchRows,
  trendValues,
  serviceSummary,
  pipeline,
  recentTransactions,
  clientActivity,
  alerts,
  onNavigate,
  trends,
}: LiveOverviewDashboardProps) {
  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const serviceTotal = serviceSummary.reduce((sum, item) => sum + item.revenue, 0);
  const serviceColors = ["#0b66e3", "#00a9c7", "#3bbf63"];
  const serviceSegments = serviceSummary.map((item, index) => ({
    value: serviceTotal ? (item.revenue / serviceTotal) * 100 : 0,
    color: serviceColors[index] || serviceColors[0],
    label: item.service[0].toUpperCase() + item.service.slice(1),
    amount: `${serviceTotal ? Math.round((item.revenue / serviceTotal) * 100) : 0}%`,
  }));
  const greeting = new Date().getHours() < 12
    ? "morning"
    : new Date().getHours() < 18
      ? "afternoon"
      : "evening";
  const recentRows: ReactNode[][] = recentTransactions.map((item) => [
    dateLabel(item.date),
    <span className="transaction-type" key={`${item.id}-type`}><Icon name={item.icon} size={14} /> {item.type}</span>,
    item.description,
    item.client,
    money(item.amount, item.currency),
    <StatusBadge
      key={`${item.id}-status`}
      tone={item.status === "paid" ? "green" : item.status === "partial" ? "orange" : "gray"}
    >
      {item.status}
    </StatusBadge>,
  ]);

  // Month-over-month movement in payments received, taken from the finance
  // report trend rather than a stored figure.
  const revenueGrowth = (() => {
    const points = trendValues.filter((point) => Number.isFinite(point.value));
    if (points.length < 2) return null;
    const previous = points[points.length - 2].value;
    const latest = points[points.length - 1].value;
    if (!previous) return null;
    return ((latest - previous) / previous) * 100;
  })();
  const activeCases = activeCargo.length + pendingVisas.length;
  const pendingApprovals = data.closes.filter((close) => !close.reviewed).length;

  // Highest-spending clients in the active trend currency, derived from the same
  // clientStats helper the Clients registry uses so the figures always agree.
  const topClients = scopedClients
    .map((client) => {
      const stats = clientStats(data, client);
      return {
        client,
        spend: activeTrendCurrency === "KES" ? stats.spendKES : stats.spendUSD,
      };
    })
    .filter((entry) => entry.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  // Per-branch revenue comes from the finance report rows (already branch-scoped
  // and permission-filtered by the API); shipment counts come from visible cargo.
  const branchPerformance = (() => {
    const byBranch = new Map<string, { branch: string; branchId: string; revenue: number }>();
    branchRows
      .filter((row) => row.currency === activeTrendCurrency)
      .forEach((row) => {
        const current = byBranch.get(row.branch) || {
          branch: row.branch,
          branchId: row.branchId,
          revenue: 0,
        };
        current.revenue += row.revenue;
        byBranch.set(row.branch, current);
      });
    const list = [...byBranch.values()];
    const peak = Math.max(...list.map((item) => item.revenue), 1);
    return list
      .map((item) => ({
        ...item,
        shipments: scopedCargo.filter(
          (cargo) => String(cargo.originBranchId || "") === item.branchId,
        ).length,
        share: item.revenue > 0 ? Math.max(6, (item.revenue / peak) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  })();

  return (
    <>
      <div className="overview-greeting-row">
        <div className="overview-greeting-copy">
          <h1>
            Good {greeting}, {user.name.split(" ")[0]} <span aria-hidden="true">👋</span>
          </h1>
          <p>Here&rsquo;s what&rsquo;s happening with SomWay today.</p>
        </div>
        <section className="overview-status-strip" aria-label="Today at a glance">
          {financial && (
            <div>
              <span className="status-icon cyan"><Icon name="report" /></span>
              <div>
                <strong className={revenueGrowth !== null && revenueGrowth < 0 ? "negative" : undefined}>
                  {revenueGrowth === null
                    ? "—"
                    : `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%`}
                </strong>
                <small>Revenue Growth</small>
              </div>
            </div>
          )}
          <div>
            <span className="status-icon blue"><Icon name="cargo" /></span>
            <div><strong>{activeCases}</strong><small>Active Cases</small></div>
          </div>
          <div>
            <span className="status-icon amber"><Icon name="expense" /></span>
            <div><strong>{pendingApprovals}</strong><small>Pending Approvals</small></div>
          </div>
          <div>
            <span className="status-icon green"><Icon name="close" /></span>
            <div><strong>{completedJobs}</strong><small>Completed Jobs</small></div>
          </div>
        </section>
      </div>

      <div className="metrics-grid six">
        <MetricCard icon="money" label="Payments Received" value={financial ? revenueValue.split("\n")[0] : "Protected"} tone="cyan" delta={trends.payments} foot="Selected period" />
        <MetricCard icon="box" label="Cargo Shipments" value={scopedCargo.length} tone="blue" delta={trends.cargo} foot={`${activeCargo.length} currently active`} />
        <MetricCard icon="wallet" label="Accounts Receivable" value={financial ? receivableValue.split("\n")[0] : "Protected"} tone="green" foot={`${receivableRecords} outstanding records`} />
        <MetricCard icon="users" label="Total Clients" value={scopedClients.filter((client) => client.isActive !== false).length} tone="violet" foot={selectedBranch?.name || "All active relationships"} />
        <MetricCard icon="passport" label="Visa Applications" value={scopedVisas.length} tone="cyan" delta={trends.visas} foot={`${pendingVisas.length} in progress`} />
        <MetricCard icon="ticket" label="Tickets Issued" value={scopedTickets.filter((ticket) => ticket.status !== "cancelled").length} tone="blue" delta={trends.tickets} foot={`${scopedTickets.length} total records`} />
      </div>

      {financial && (
        <div
          className="split-3 dashboard-analytics-row"
          style={{ marginTop: 14, gridTemplateColumns: "minmax(0,1.35fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.25fr)" }}
        >
          <Panel title="Monthly Payments Trend" subtitle="Money received from customers" actions={displayCurrencies.length > 1 ? <select className="trend-select" value={activeTrendCurrency} onChange={(event) => setTrendCurrency(event.target.value as Currency)} aria-label="Trend currency">{displayCurrencies.map((currency) => <option key={currency}>{currency}</option>)}</select> : undefined}>
            <BarChart
              values={trendValues.map((item) => item.value)}
              labels={trendValues.map((item) => item.label)}
              showAxis
              axisLabel={`Monthly payments received in ${activeTrendCurrency}`}
            />
          </Panel>
          <Panel title="Payments by Service" subtitle={`${activeTrendCurrency} service mix`}>
            <Donut total={money(serviceTotal, activeTrendCurrency)} centerLabel="Total" segments={serviceSegments} />
          </Panel>
          <Panel title="Branch Performance" subtitle={`${activeTrendCurrency} revenue by branch`}>
            {branchPerformance.length ? (
              <div className="stack branch-performance">
                {branchPerformance.map((row) => (
                  <div key={row.branch}>
                    <strong className="branch-performance-name"><BranchName data={data} branch={row.branch} /></strong>
                    <div className="branch-performance-figures">
                      <div>
                        <small>Revenue</small>
                        <b>{money(row.revenue, activeTrendCurrency)}</b>
                      </div>
                      <div>
                        <small>Shipments</small>
                        <b>{row.shipments}</b>
                      </div>
                    </div>
                    <div className="progress"><i style={{ width: `${row.share}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="No branch revenue" detail="Branch performance appears once payments are recorded." />
            )}
          </Panel>
          <Panel title="Cargo Tracking Status" actions={<button type="button" className="linkish" onClick={() => onNavigate("cargo")}>View all <Icon name="arrow" size={13} /></button>}>
            <div className="stack dashboard-status-list">
              {pipeline.map((item) => {
                const totalTracked = pipeline.reduce((sum, entry) => sum + entry.count, 0);
                const share = totalTracked ? Math.round((item.count / totalTracked) * 100) : 0;
                return (
                  <div className="dashboard-status-row" key={item.label}>
                    <div className={`metric-icon tone-${item.tone}`}><Icon name={item.icon} size={17} /></div>
                    <strong>{item.label}</strong>
                    <b>{item.count}</b>
                    <span className="status-share">{share}%</span>
                  </div>
                );
              })}
            </div>
            <div className="dashboard-status-total">
              <span>Total Shipments</span>
              <b>{pipeline.reduce((sum, entry) => sum + entry.count, 0)}</b>
            </div>
          </Panel>
        </div>
      )}

      <div className="split-2 dashboard-bottom-row" style={{ marginTop: 14 }}>
        <Panel title="Recent Transactions" actions={<button type="button" className="linkish" onClick={() => onNavigate("receivables")}>View all <Icon name="arrow" size={13} /></button>}>
          {recentRows.length ? <DataTable columns={["Date", "Type", "Description", "Client", "Amount", "Status"]} rows={recentRows} /> : <Empty title="No transactions yet" detail="New service records will appear here." />}
        </Panel>
        {financial && (
          <Panel title="Top Clients" actions={<button type="button" className="linkish" onClick={() => onNavigate("clients")}>View all <Icon name="arrow" size={13} /></button>}>
            <div className="stack">
              {topClients.length ? topClients.map((entry, index) => (
                <div className="recent-client-row top-client-row" key={entry.client.id}>
                  <span className="client-rank">{index + 1}</span>
                  <div className="avatar">{entry.client.name.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{entry.client.name}</strong>
                    <span className="muted">{entry.client.type} client</span>
                  </div>
                  <b className="top-client-spend">{money(entry.spend, activeTrendCurrency)}</b>
                </div>
              )) : <Empty title="No client spend yet" detail="Top clients appear once services are billed." />}
            </div>
          </Panel>
        )}
        <div className="split-even">
          <Panel title="Tasks & Alerts">
            <div className="alert-list">
              {alerts.map((alert) => (
                <button
                  type="button"
                  className={`alert-row${alert.count ? "" : " is-clear"}`}
                  key={alert.label}
                  onClick={() => onNavigate(alert.page)}
                >
                  <span
                    className={`metric-icon tone-${alert.count ? alert.tone : "gray"}`}
                  >
                    <Icon name={alert.icon} size={17} />
                  </span>
                  <span className="alert-copy">
                    <strong>{alert.label}</strong>
                    <small>
                      {alert.count} {alert.detail}
                    </small>
                  </span>
                  <span className="alert-count">{alert.count}</span>
                  <Icon name="chevron" size={14} />
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Recent Clients">
            <div className="stack">
              {clientActivity.slice(0, 4).map(({ client }) => (
                <div className="recent-client-row" key={client.id}>
                  <div className="avatar">{client.name.slice(0, 2).toUpperCase()}</div>
                  <div><strong>{client.name}</strong><span className="muted"><BranchName data={data} branch={branchName(data, client.homeBranchId, client.homeOffice)} /></span></div>
                  <StatusBadge tone="blue">{client.type}</StatusBadge>
                </div>
              ))}
              {!clientActivity.length && <Empty title="No clients yet" detail="Client relationships will appear here." />}
            </div>
          </Panel>
        </div>
      </div>

      <span className="sr-only">{completedJobs} completed jobs</span>
    </>
  );
}

function Tickets({ data, user, save, notify, replaceData, scopeBranchId, focusRef }: ModuleProps) {
  const userBranch = branchForUser(data, user);
  const roleOffice = officeForRole(user.role) || userBranch?.name || null;
  const branches = branchOptions(data, user);
  const canWrite =
    user.role === "owner" ||
    user.role === "operator" ||
    !!officeForRole(user.role);
  const financial = user.role === "owner" || user.role === "consultant";
  // Deleting is owner-only; operators create and correct, never remove.
  const canDelete = user.role === "owner";
  const [query, setQuery] = useState(focusRef || "");
  // Opening a notification lands here with the record reference, so the
  // register searches for it and the row is on screen. This is adjusted
  // while rendering rather than in an effect so the list never paints once
  // with the old query and again with the new one. Only a reference we have
  // not seen before replaces the box, so anything typed since is kept.
  const [seenFocus, setSeenFocus] = useState(focusRef);
  if (focusRef !== seenFocus) {
    setSeenFocus(focusRef);
    if (focusRef) setQuery(focusRef);
  }
  const [office, setOffice] = useState(roleOffice || "All");
  // Follow the global branch scope chosen in the top bar.
  useBranchScope(scopeBranchId, (id) =>
    setOffice(id ? branchName(data, id, "All") : roleOffice || "All"),
  );
  const [ticketView, setTicketView] = useState<
    "all" | "issued" | "pending" | "refund" | "cancelled"
  >("all");
  const [editing, setEditing] = useState<Ticket | null | undefined>();
  const [deleting, setDeleting] = useState<Ticket | null>(null);
  const [paying, setPaying] = useState<Ticket | null>(null);
  const scopedRows = data.tickets.filter(
    (x) =>
      (office === "All" || x.office === office) &&
      `${x.ref} ${x.passenger} ${x.phone} ${x.route}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const rows = scopedRows.filter((ticket) => {
    if (ticketView === "issued") return ticket.status === "issued";
    if (ticketView === "pending")
      return ticket.type !== "Refund" && ticket.paymentStatus !== "paid";
    if (ticketView === "refund")
      return ticket.type === "Refund" && ticket.paymentStatus !== "paid";
    if (ticketView === "cancelled") return ticket.status === "cancelled";
    return true;
  });
  const ticketRevenue = moneyByCurrency(
    scopedRows,
    (ticket) => ticket.currency,
    (ticket) => (ticket.type === "Refund" ? -ticket.amount : ticket.amount),
  );
  const ticketProfit = moneyByCurrency(
    scopedRows,
    (ticket) => ticket.currency,
    (ticket) =>
      ticket.type === "Refund" ? -ticket.amount : ticket.amount - ticket.cost,
  );
  const pendingRefunds = scopedRows.filter(
    (ticket) => ticket.type === "Refund" && ticket.paymentStatus !== "paid",
  );
  const updateTicketStatus = async (
    ticket: Ticket,
    status: NonNullable<Ticket["status"]>,
  ) => {
    const currentStatus = ticket.status || "booked";
    const normallyAllowed = (ticketNextStatuses[currentStatus] || []).includes(
      status,
    );
    const correctionReason =
      user.role === "owner" && !normallyAllowed
        ? window.prompt("Reason for correcting this ticket status") || ""
        : "";
    if (user.role === "owner" && !normallyAllowed && !correctionReason.trim())
      return;
    const response = await fetch(
      `/api/workflows/tickets/${encodeURIComponent(ticket.id)}/transition`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, correctionReason }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      notify(payload.error || "Ticket status could not be updated");
      return;
    }
    replaceData?.(payload.data);
    notify(`${ticket.ref} changed to ${serviceStatusLabel(status)}`);
  };
  return (
    <>
      <PageHeader
        eyebrow="Sales operations"
        title="Tickets"
        detail={
          financial
            ? "Manage bookings, payments, cost and margin across all branches."
            : `Manage ${roleOffice} bookings. Agency cost and profit remain hidden.`
        }
        actions={
          canWrite && (
            <button className="button primary" onClick={() => setEditing(null)}>
              <Icon name="plus" /> New Ticket
            </button>
          )
        }
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        office={office}
        setOffice={setOffice}
        branches={branches}
        allowAll={!roleOffice}
      />
      <div className="subtabs" aria-label="Ticket views">
        {[
          ["all", "All Tickets", scopedRows.length],
          ["issued", "Issued", scopedRows.filter((x) => x.status === "issued").length],
          ["pending", "Pending Payment", scopedRows.filter((x) => x.type !== "Refund" && x.paymentStatus !== "paid").length],
          ["refund", "Pending Refund", pendingRefunds.length],
          ["cancelled", "Cancelled", scopedRows.filter((x) => x.status === "cancelled").length],
        ].map(([key, label, count]) => (
          <button
            type="button"
            key={String(key)}
            className={ticketView === key ? "active" : ""}
            onClick={() => setTicketView(key as typeof ticketView)}
          >
            {label} {count}
          </button>
        ))}
      </div>
      <div className="metrics-grid">
        <MetricCard icon="ticket" label="Tickets Issued" value={scopedRows.length} tone="blue" foot="Selected branch" />
        <MetricCard icon="money" label="Revenue" value={ticketRevenue} tone="cyan" foot="Sales less refunds" />
        <MetricCard icon="trend" label="Gross Profit" value={ticketProfit} tone="green" foot="Revenue less agency cost" />
        <MetricCard
          icon="wallet"
          label="Pending Refunds"
          value={moneyByCurrency(pendingRefunds, (ticket) => ticket.currency, (ticket) => ticket.amount)}
          tone="orange"
          foot={`${pendingRefunds.length} open record${pendingRefunds.length === 1 ? "" : "s"}`}
        />
      </div>
      {rows.length ? (
        <Panel title="Ticket Register" actions={<StatusBadge tone="blue">Live</StatusBadge>}>
        <TableShell>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Passenger</th>
              <th>Route / travel</th>
              <th>Office</th>
              <th>Payment</th>
              {financial && (
                <>
                  <th>Sale</th>
                  <th>Agency cost</th>
                  <th>Profit</th>
                </>
              )}
              <th>Payment status</th>
              <th>Ticket status</th>
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const profit =
                x.type === "Refund" ? -x.amount : x.amount - x.cost;
              return (
                <tr key={x.id}>
                  <td>
                    <div className="ref-cell">
                      <div className="ref-cell-text">
                        <strong>{x.ref}</strong>
                        <small>{dateLabel(x.saleDate)}</small>
                      </div>
                      {x.type !== "Refund" && (
                        <button
                          type="button"
                          className="receipt-chip"
                          title={`Generate receipt for ${x.ref}`}
                          aria-label={`Generate receipt for ${x.ref}`}
                          onClick={() =>
                            generateReceipt(
                              ticketReceiptData(x, data.agencyName),
                              "/somway-primary-logo-alpha.png",
                            )
                          }
                        >
                          <Icon name="receipt" size={14} />
                          <span>Receipt</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    {x.passenger}
                    <small>{x.phone}</small>
                  </td>
                  <td>
                    {x.route}
                    <small>
                      {dateLabel(x.travelDate)} · {x.airlinePnr || "No PNR"}
                    </small>
                  </td>
                  <td>
                    <BranchBadge data={data} office={x.office} />
                  </td>
                  <td>
                    {x.paymentMethod}
                    <small>
                      {x.paymentStatus === "partial"
                        ? `${money(x.amountPaid || 0, x.currency)} paid`
                        : x.paid
                          ? dateLabel(x.paymentDate)
                          : x.type === "Refund"
                            ? "Refund not paid"
                            : "Awaiting payment"}
                    </small>
                  </td>
                  {financial && (
                    <>
                      <td>
                        {money(
                          (x.type === "Refund" ? -1 : 1) * x.amount,
                          x.currency,
                        )}
                      </td>
                      <td>{money(x.cost, x.currency)}</td>
                      <td className={profit < 0 ? "negative" : "positive"}>
                        {money(profit, x.currency)}
                      </td>
                    </>
                  )}
                  <td>
                    <Badge
                      tone={
                        x.type === "Refund"
                          ? x.paid
                            ? "success"
                            : "danger"
                          : x.paymentStatus === "paid"
                            ? "success"
                            : x.paymentStatus === "partial"
                              ? "blue"
                              : "warning"
                      }
                    >
                      {x.type === "Refund"
                        ? x.paid
                          ? "Refunded"
                          : "Refund due"
                        : x.paymentStatus === "paid"
                          ? "Paid"
                          : x.paymentStatus === "partial"
                            ? "Part paid"
                            : "Unpaid"}
                    </Badge>
                  </td>
                  <td>
                    {canWrite ? (
                      <select
                        className={`inline-status ${x.status || "booked"}`}
                        aria-label={`Ticket status for ${x.ref}`}
                        value={x.status || "booked"}
                        onChange={(event) =>
                          void updateTicketStatus(
                            x,
                            event.target.value as NonNullable<Ticket["status"]>,
                          )
                        }
                      >
                        {[
                          x.status || "booked",
                          ...(user.role === "owner"
                            ? ([
                                "booked",
                                "issued",
                                "changed",
                                "cancelled",
                              ] as const)
                            : ticketNextStatuses[x.status || "booked"] || []),
                        ]
                          .filter(
                            (status, index, list) =>
                              list.indexOf(status) === index,
                          )
                          .map((status) => (
                            <option key={status} value={status}>
                              {serviceStatusLabel(status)}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <Badge
                        tone={x.status === "cancelled" ? "danger" : "blue"}
                      >
                        {serviceStatusLabel(x.status || "booked")}
                      </Badge>
                    )}
                  </td>
                  {canWrite && (
                    <td>
                      <Actions
                        onEdit={() => setEditing(x)}
                        onDelete={canDelete ? () => setDeleting(x) : undefined}
                        onPayment={
                          (x.balance ?? x.amount) > 0
                            ? () => setPaying(x)
                            : undefined
                        }
                        paymentLabel={
                          x.type === "Refund"
                            ? "Record refund"
                            : "Record payment"
                        }
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableShell>
        </Panel>
      ) : (
        <Empty
          title="No ticket records"
          detail="Log a sale or refund to begin the ticket register."
        />
      )}
      {editing !== undefined && (
        <TicketForm
          current={editing}
          user={user}
          branches={branches}
          data={data}
          onClose={() => setEditing(undefined)}
          onSave={(record) => {
            void save(
              (d) => ({
                ...d,
                tickets: editing
                  ? [...d.tickets.filter((x) => x.id !== editing.id), record]
                  : [record, ...d.tickets],
              }),
              {
                entity: "Ticket",
                detail: `${editing ? "Updated" : "Created"} ${record.ref}`,
              },
            );
            setEditing(undefined);
            notify(
              `Ticket ${record.ref} ${editing ? "updated" : "created"} for ${record.passenger || "passenger"}`,
            );
          }}
        />
      )}
      {paying && (
        <CustomerPaymentForm
          transactionType="ticket"
          transactionId={paying.id}
          label={paying.ref}
          branchId={String(paying.branchId || "")}
          currency={paying.currency}
          balance={paying.balance ?? paying.amount}
          isRefund={paying.type === "Refund"}
          data={data}
          onClose={() => setPaying(null)}
          onSaved={(next) => {
            replaceData?.(next);
            setPaying(null);
            notify(
              paying.type === "Refund" ? "Refund recorded" : "Payment recorded",
            );
          }}
        />
      )}
      {deleting && (
        <Confirm
          title="Archive ticket?"
          detail={`${deleting.ref} will leave active registers while its history remains retained.`}
          confirmLabel="Archive Ticket"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            save(
              (d) => ({
                ...d,
                tickets: d.tickets.filter((x) => x.id !== deleting.id),
              }),
              { entity: "Ticket", detail: `Archived ${deleting.ref}` },
            );
            setDeleting(null);
            notify("Ticket archived");
          }}
        />
      )}
    </>
  );
}
function TicketForm({
  current,
  user,
  branches,
  data,
  onClose,
  onSave,
}: {
  current: Ticket | null;
  user: User;
  branches: Branch[];
  data: AgencyData;
  onClose: () => void;
  onSave: (r: Ticket) => void;
}) {
  const initialBranch = current?.branchId || branches[0]?.id || "";
  const selectedBranch = branchById(data, initialBranch);
  const initialCurrency =
    current?.currency ||
    selectedBranch?.defaultCurrency ||
    branchCurrencies(selectedBranch)[0];
  const initialPaymentMethod =
    current?.paymentMethod ||
    paymentMethodsFor(data, initialBranch, initialCurrency)[0] ||
    ("Bank" as PaymentMethod);
  const locked = user.role === "operator";
  const [f, setF] = useState({
    branchId: initialBranch,
    office:
      current?.office ||
      branchName(data, initialBranch, branches[0]?.name || ""),
    type: current?.type || "Sale",
    saleDate: current?.saleDate || today(),
    passenger: current?.passenger || "",
    phone: current?.phone || "",
    route: current?.route || "",
    airlinePnr: current?.airlinePnr || "",
    travelDate: current?.travelDate || "",
    currency: initialCurrency,
    amount: String(current?.amount || ""),
    cost: String(current?.cost || ""),
    paymentMethod: initialPaymentMethod,
    notes: current?.notes || "",
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.passenger || !f.phone || !f.route || !f.amount || !f.paymentMethod)
      return;
    onSave({
      id: current?.id || uid("tkt"),
      ref: current?.ref || "",
      office: branchName(data, f.branchId, f.office),
      branchId: f.branchId,
      type: f.type as "Sale" | "Refund",
      saleDate: f.saleDate,
      passenger: f.passenger,
      phone: f.phone,
      route: f.route,
      airlinePnr: f.airlinePnr,
      travelDate: f.travelDate,
      currency: f.currency as Currency,
      amount: Number(f.amount),
      cost: f.type === "Refund" ? 0 : Number(f.cost) || 0,
      paymentMethod: f.paymentMethod as PaymentMethod,
      paid: false,
      paymentDate: "",
      servedBy: user.name,
      notes: f.notes,
      createdBy: current?.createdBy || user.id,
      updatedAt: new Date().toISOString(),
    });
  };
  return (
    <Modal
      title={current ? "Edit Ticket" : "Create Ticket"}
      subtitle="Required fields are marked by their labels."
      onClose={onClose}
      side={
        <div>
          <h3>Profit Summary</h3>
          <div className="summary-eq">
            <span className="muted">Sale Amount</span>
            <div className="big">{money(Number(f.amount) || 0, f.currency as Currency)}</div>
            <div className="muted">minus</div>
            <span className="muted">Agency Cost</span>
            <div className="big">{money(Number(f.cost) || 0, f.currency as Currency)}</div>
            <hr />
            <span className="muted">Gross Profit</span>
            <div className="big green">
              {money(
                f.type === "Refund"
                  ? -(Number(f.amount) || 0)
                  : (Number(f.amount) || 0) - (Number(f.cost) || 0),
                f.currency as Currency,
              )}
            </div>
          </div>
        </div>
      }
    >
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Branch">
            <BranchSelect
              options={branches}
              value={f.branchId}
              disabled={locked}
              onChange={(e) => {
                const branch = branchById(data, e.target.value);
                const currency =
                  branch?.defaultCurrency || branchCurrencies(branch)[0];
                const paymentMethod =
                  paymentMethodsFor(data, e.target.value, currency)[0] ||
                  ("Bank" as PaymentMethod);
                setF({
                  ...f,
                  branchId: e.target.value,
                  office: branch?.name || f.office,
                  currency,
                  paymentMethod,
                });
              }}
            />
          </Field>
          <Field label="Type">
            <select
              value={f.type}
              onChange={(e) => {
                const type = e.target.value as Ticket["type"];
                setF({ ...f, type, cost: type === "Refund" ? "" : f.cost });
              }}
            >
              <option>Sale</option>
              <option>Refund</option>
            </select>
          </Field>
          <Field label="Sale date">
            <input
              required
              type="date"
              value={f.saleDate}
              onChange={(e) => setF({ ...f, saleDate: e.target.value })}
            />
          </Field>
          <Field label="Travel date">
            <input
              type="date"
              value={f.travelDate}
              onChange={(e) => setF({ ...f, travelDate: e.target.value })}
            />
          </Field>
          <Field label="Passenger name">
            <input
              required
              value={f.passenger}
              onChange={(e) => setF({ ...f, passenger: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              required
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </Field>
          <Field label="From">
            <input
              required
              placeholder="NBO–DXB"
              value={f.route}
              onChange={(e) => setF({ ...f, route: e.target.value })}
            />
          </Field>
          <Field label="To">
            <input
              value={f.airlinePnr}
              onChange={(e) => setF({ ...f, airlinePnr: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <select
              value={f.currency}
              onChange={(e) => {
                const currency = e.target.value as Currency;
                const paymentMethod =
                  paymentMethodsFor(data, f.branchId, currency)[0] ||
                  ("Bank" as PaymentMethod);
                setF({ ...f, currency, paymentMethod });
              }}
            >
              {branchCurrencies(branchById(data, f.branchId)).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label={f.type === "Refund" ? "Refund amount" : "Sale amount"}>
            <input
              required
              min="0"
              type="number"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
          {user.role === "owner" && f.type !== "Refund" && (
            <Field label="Agency cost">
              <input
                min="0"
                type="number"
                value={f.cost}
                onChange={(e) => setF({ ...f, cost: e.target.value })}
              />
            </Field>
          )}
          <Field label="Payment method">
            <select
              required
              value={f.paymentMethod}
              onChange={(e) =>
                setF({ ...f, paymentMethod: e.target.value as PaymentMethod })
              }
            >
              {paymentMethodsFor(data, f.branchId, f.currency).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes" wide>
            <textarea
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            {current ? "Save Changes" : "Create Ticket"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const cargoNextActions = (cargo: Cargo, user: User) => {
  const key = cargoStatusKey(cargo.status);
  const next: Record<
    string,
    { status: CargoStatus; label: string; branch: "origin" | "destination" }[]
  > = {
    received: [{ status: "in_transit", label: "Dispatch", branch: "origin" }],
    in_transit: [
      { status: "arrived", label: "Mark arrived", branch: "destination" },
    ],
    arrived: [
      { status: "ready_for_collection", label: "Ready", branch: "destination" },
      { status: "delivered", label: "Deliver", branch: "destination" },
    ],
    ready_for_collection: [
      { status: "delivered", label: "Deliver", branch: "destination" },
    ],
  };
  return (next[key] || []).filter(
    (action) =>
      user.role === "owner" ||
      (user.role === "operator" &&
        user.assignedBranchId ===
          (action.branch === "origin"
            ? cargo.originBranchId
            : cargo.destinationBranchId)),
  );
};
function CargoDesk({ data, user, save, notify, replaceData, scopeBranchId, focusRef }: ModuleProps) {
  const canWrite = user.role !== "consultant";
  const financial = user.role === "owner" || user.role === "consultant";
  // Deleting is owner-only; operators create and correct, never remove.
  const canDelete = user.role === "owner";
  const [query, setQuery] = useState(focusRef || "");
  // Opening a notification lands here with the record reference, so the
  // register searches for it and the row is on screen. This is adjusted
  // while rendering rather than in an effect so the list never paints once
  // with the old query and again with the new one. Only a reference we have
  // not seen before replaces the box, so anything typed since is kept.
  const [seenFocus, setSeenFocus] = useState(focusRef);
  if (focusRef !== seenFocus) {
    setSeenFocus(focusRef);
    if (focusRef) setQuery(focusRef);
  }
  const [office, setOffice] = useState("All");
  // Follow the global branch scope chosen in the top bar.
  useBranchScope(scopeBranchId, (id) =>
    setOffice(id ? branchName(data, id, "All") : "All"),
  );
  const [editing, setEditing] = useState<Cargo | null | undefined>();
  const [paying, setPaying] = useState<Cargo | null>(null);
  const [details, setDetails] = useState<Cargo | null>(null);
  const rows = data.cargo
    .filter(
      (x) =>
        (office === "All" || x.origin === office) &&
        `${x.tracking} ${x.sender} ${x.receiver} ${x.contents}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const cargoStatusCounts = [
    ["Received", "received", "#0b66e3"],
    ["In Transit", "in_transit", "#7c3aed"],
    ["Arrived", "arrived", "#00a9c7"],
    ["Ready", "ready_for_collection", "#f59e0b"],
    ["Delivered", "delivered", "#16a34a"],
  ].map(([label, status, color]) => ({
    label,
    status,
    color,
    count: rows.filter((cargo) => cargoStatusKey(cargo.status) === status).length,
  }));
  const cargoSegments = cargoStatusCounts.map((item) => ({
    value: rows.length ? (item.count / rows.length) * 100 : 0,
    color: item.color,
    label: item.label,
    amount: String(item.count),
  }));
  const routeActivity = Object.entries(
    rows.reduce<Record<string, number>>((totals, cargo) => {
      const route = `${cargo.origin.slice(0, 3).toUpperCase()}-${cargo.destination.slice(0, 3).toUpperCase()}`;
      totals[route] = (totals[route] || 0) + 1;
      return totals;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const transitionCargo = async (
    cargo: Cargo,
    status: CargoStatus,
    cancellationReason = "",
  ) => {
    try {
      const payload = await apiRequest<{ data?: AgencyData }>(
        `/api/cargo/${encodeURIComponent(cargo.id)}/transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, cancellationReason }),
        },
      );
      if (payload.data) replaceData?.(payload.data);
      notify(`${cargo.tracking} marked ${cargoStatusLabel(status)}`);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Cargo status could not be updated",
      );
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Two-office collaboration"
        title="Shared Cargo Desk"
        detail="Origin branch dispatches. Destination branch records arrival, collection readiness and final delivery."
        actions={
          canWrite && (
            <button className="button primary" onClick={() => setEditing(null)}>
              <Icon name="plus" /> New Cargo
            </button>
          )
        }
      />
      <div className="cargo-overview">
        <div className="metrics-grid five">
          <MetricCard icon="box" label="Total Shipments" value={rows.length} tone="blue" foot="Selected branch" />
          <MetricCard icon="route" label="In Transit" value={cargoStatusCounts[1].count} tone="violet" foot="Active movements" />
          <MetricCard icon="clock" label="Ready for Collection" value={cargoStatusCounts[3].count} tone="orange" foot="Awaiting customer" />
          <MetricCard icon="check" label="Delivered" value={cargoStatusCounts[4].count} tone="green" foot="Completed shipments" />
          <MetricCard
            icon="money"
            label="Cargo Revenue"
            value={moneyByCurrency(rows, (cargo) => cargo.currency, (cargo) => cargo.customerCharge ?? cargo.weight * cargo.rate)}
            tone="cyan"
            foot="Customer charges"
          />
        </div>
        <div className="split-even">
          <Panel title="Shipment Status Overview">
            <Donut total={String(rows.length)} segments={cargoSegments} />
          </Panel>
          <Panel title="Route Activity">
            <BarChart
              values={routeActivity.length ? routeActivity.map((entry) => entry[1]) : [0]}
              labels={routeActivity.length ? routeActivity.map((entry) => entry[0]) : ["No routes"]}
            />
          </Panel>
        </div>
      </div>
      <div className="collab-banner">
        <span>
          <Icon name="cargo" />
        </span>
        <div>
          <strong>Branch-controlled cargo workflow</strong>
          <p>
            Every shipment follows received, in transit, arrived, ready for
            collection and delivered milestones.
          </p>
        </div>
        <div className="avatar-stack">
          <i>N</i>
          <i>M</i>
        </div>
      </div>
      <Toolbar
        query={query}
        setQuery={setQuery}
        office={office}
        setOffice={setOffice}
        branches={branchOptions(data, user)}
      />
      {rows.length ? (
        <Panel title="Shipments" actions={<StatusBadge tone="blue">Live</StatusBadge>}>
        <TableShell>
          <thead>
            <tr>
              <th>Tracking</th>
              <th>Route</th>
              <th>Sender → receiver</th>
              <th>Shipment</th>
              {financial && <th>Cargo charge</th>}
              <th>Payment</th>
              <th>Status</th>
              <th>Last update</th>
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const amount = x.customerCharge ?? x.weight * x.rate;
              const actions = cargoNextActions(x, user);
              const canTakePayment =
                user.role === "owner" ||
                (user.role === "operator" &&
                  String(user.assignedBranchId || "") ===
                    String(x.paidByBranchId || x.originBranchId || ""));
              const canCancel =
                !["delivered", "cancelled"].includes(
                  cargoStatusKey(x.status),
                ) &&
                (user.role === "owner" ||
                  (user.role === "operator" &&
                    [x.originBranchId, x.destinationBranchId].some(
                      (branchId) =>
                        String(branchId || "") ===
                        String(user.assignedBranchId || ""),
                    )));
              return (
                <tr key={x.id}>
                  <td>
                    <button type="button" className="text-button" onClick={() => setDetails(x)}>
                      <strong>{x.tracking}</strong>
                    </button>
                    <small>{dateLabel(x.dateIn)}</small>
                  </td>
                  <td>
                    <span className="route-inline">
                      {x.origin.slice(0, 3).toUpperCase()} <b>→</b>{" "}
                      {x.destination.slice(0, 3).toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {x.sender}
                    <small>
                      to {x.receiver} · Payer:{" "}
                      {x.paymentResponsibility === "receiver"
                        ? "Receiver"
                        : x.paymentResponsibility === "sender"
                          ? "Sender"
                          : "Unresolved"}
                    </small>
                  </td>
                  <td>
                    {x.weight} kg · {x.contents}
                    <small>{money(x.rate, x.currency)} / kg</small>
                  </td>
                  {financial && (
                    <td>
                      {money(amount, x.currency)}
                      <small>Customer charge</small>
                    </td>
                  )}
                  <td>
                    <Badge
                      tone={
                        x.paymentStatus === "paid"
                          ? "success"
                          : x.paymentStatus === "partial"
                            ? "blue"
                            : "warning"
                      }
                    >
                      {x.paymentStatus === "paid"
                        ? "Paid"
                        : x.paymentStatus === "partial"
                          ? "Part paid"
                          : "Unpaid"}
                    </Badge>
                    <small>
                      {x.paymentStatus === "partial"
                        ? `${money(x.amountPaid || 0, x.currency)} paid · ${money(x.balance || 0, x.currency)} due`
                        : x.paymentStatus === "unpaid"
                          ? `${money(x.balance ?? amount, x.currency)} due`
                          : "Paid in full"}
                    </small>
                  </td>
                  <td>
                    <Badge tone={cargoStatusTone(x.status)}>
                      {cargoStatusLabel(x.status)}
                    </Badge>
                  </td>
                  <td>
                    {new Date(x.updatedAt).toLocaleDateString("en-GB")}
                    <small>
                      {x.statusHistory?.at(-1)?.userName ||
                        data.users.find((u) => u.id === x.updatedBy)?.name ||
                        "Team"}
                    </small>
                  </td>
                  {canWrite && (
                    <td>
                      <div className="row-actions">
                        {canTakePayment && (x.balance ?? amount) > 0 && (
                          <button
                            type="button"
                            className="payment-action"
                            title="Receive payment"
                            onClick={() => setPaying(x)}
                          >
                            Receive Payment
                          </button>
                        )}
                        {actions.map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            onClick={() =>
                              void transitionCargo(x, action.status)
                            }
                          >
                            {action.label}
                          </button>
                        ))}
                        <button
                          className="edit-action"
                          aria-label="Edit"
                          type="button"
                          onClick={() => setEditing(x)}
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        {canCancel && (
                          <button
                            className="delete-action"
                            aria-label="Cancel shipment"
                            type="button"
                            onClick={() => {
                              const reason = window.prompt(
                                "Reason for cancelling this shipment",
                              );
                              if (reason?.trim()) {
                                void transitionCargo(x, "cancelled", reason);
                              }
                            }}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableShell>
        </Panel>
      ) : (
        <Empty
          title="Cargo desk is clear"
          detail="Create the first shipment; both branch operators will see the route when they are part of the handoff."
        />
      )}
      {editing !== undefined && (
        <CargoForm
          current={editing}
          data={data}
          user={user}
          onClose={() => setEditing(undefined)}
          onSave={async (record, initialPayment) => {
            const saved = initialPayment ? true : await save(
              (d) => ({
                ...d,
                cargo: editing
                  ? [...d.cargo.filter((x) => x.id !== editing.id), record]
                  : [record, ...d.cargo],
              }),
              {
                entity: "Cargo",
                detail: `${editing ? "Updated" : "Created"} ${record.tracking} · ${cargoStatusLabel(record.status)}`,
              },
            );
            if (!saved) return;
            if (initialPayment) {
              try {
                const payload = await apiRequest<{ data?: AgencyData }>("/api/entities/cargo/with-payment", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key": initialPayment.idempotencyKey || uid("payment"),
                  },
                  body: JSON.stringify({
                    record,
                    initialPayment,
                    action: { entity: "Cargo", detail: `Created ${record.tracking}` },
                  }),
                });
                if (payload.data) replaceData?.(payload.data);
              } catch (caught) {
                notify(
                  `Cargo and payment were not recorded: ${caught instanceof Error ? caught.message : "unknown error"}`,
                );
                setEditing(undefined);
                return;
              }
            }
            setEditing(undefined);
            notify(
              initialPayment
                ? "Cargo and customer payment recorded"
                : `Shipment ${editing ? "updated" : "created"}`,
            );
          }}
        />
      )}
      {details && (
        <CargoDetails
          cargo={data.cargo.find((item) => item.id === details.id) || details}
          data={data}
          onClose={() => setDetails(null)}
          onReceive={() => {
            const current = data.cargo.find((item) => item.id === details.id) || details;
            setDetails(null);
            setPaying(current);
          }}
        />
      )}
      {paying && (
        <CustomerPaymentForm
          transactionType="cargo"
          transactionId={paying.id}
          label={paying.tracking}
          branchId={String(paying.paidByBranchId || paying.originBranchId || "")}
          currency={paying.currency}
          balance={paying.balance ?? paying.customerCharge ?? paying.weight * paying.rate}
          data={data}
          onClose={() => setPaying(null)}
          onSaved={(next) => {
            replaceData?.(next);
            setPaying(null);
            notify(`Payment recorded for cargo ${paying.tracking}`);
          }}
        />
      )}
    </>
  );
}

function CargoDetails({
  cargo,
  data,
  onClose,
  onReceive,
}: {
  cargo: Cargo;
  data: AgencyData;
  onClose: () => void;
  onReceive: () => void;
}) {
  const charge = cargo.customerCharge ?? cargo.weight * cargo.rate;
  const payments = data.payments
    .filter(
      (payment) =>
        payment.transactionType === "cargo" &&
        payment.transactionId === cargo.id,
    )
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  return (
    <Modal title={`Cargo ${cargo.tracking}`} subtitle="Shipment and payment details." onClose={onClose}>
      <div className="details-sections">
        <section className="panel">
          <p className="eyebrow">Shipment</p>
          <dl className="detail-list">
            <div><dt>Reference</dt><dd>{cargo.tracking}</dd></div>
            <div><dt>Customer</dt><dd>{cargo.sender} to {cargo.receiver}</dd></div>
            <div><dt>Route</dt><dd>{cargo.origin} to {cargo.destination}</dd></div>
            <div><dt>Weight</dt><dd>{cargo.weight} kg</dd></div>
            <div><dt>Rate</dt><dd>{money(cargo.rate, cargo.currency)} / kg</dd></div>
            <div><dt>Cargo charge</dt><dd>{money(charge, cargo.currency)}</dd></div>
            <div><dt>Operational status</dt><dd>{cargoStatusLabel(cargo.status)}</dd></div>
          </dl>
        </section>
        <section className="panel">
          <p className="eyebrow">Payment</p>
          <dl className="detail-list">
            <div><dt>Cargo charge</dt><dd>{money(charge, cargo.currency)}</dd></div>
            <div><dt>Total paid</dt><dd>{money(cargo.amountPaid || 0, cargo.currency)}</dd></div>
            <div><dt>Balance due</dt><dd>{money(cargo.balance ?? charge, cargo.currency)}</dd></div>
            <div><dt>Accounts receivable</dt><dd>{money(cargo.balance ?? charge, cargo.currency)}</dd></div>
            <div><dt>Payment status</dt><dd>{cargo.paymentStatus || "unpaid"}</dd></div>
          </dl>
        </section>
        <section className="panel details-history">
          <p className="eyebrow">Payment history</p>
          {payments.length ? payments.map((payment) => (
            <div className="history-row" key={payment.id}>
              <strong>{money(payment.amount, payment.currency)}</strong>
              <span>{payment.paymentDate} - {payment.paymentMethod} - {payment.reference || "No reference"}</span>
              <small>{payment.status || "active"}</small>
            </div>
          )) : <p>No payments recorded.</p>}
        </section>
      </div>
      <div className="modal-actions">
        <button type="button" className="button ghost" onClick={onClose}>Close</button>
        {(cargo.balance ?? charge) > 0 ? (
          <button type="button" className="button primary" onClick={onReceive}>Receive Payment</button>
        ) : <span className="readonly-value">Paid in full</span>}
      </div>
    </Modal>
  );
}

function CargoForm({
  current,
  data,
  user,
  onClose,
  onSave,
}: {
  current: Cargo | null;
  data: AgencyData;
  user: User;
  onClose: () => void;
  onSave: (
    record: Cargo,
    initialPayment?: InitialCustomerPayment,
  ) => Promise<void>;
}) {
  const originBranches = branchOptions(data, user);
  const destinationBranches = activeBranches(data);
  const initialOriginBranchId =
    current?.originBranchId || originBranches[0]?.id || "";
  const initialDestinationBranchId =
    current?.destinationBranchId ||
    destinationBranches.find((branch) => branch.id !== initialOriginBranchId)
      ?.id ||
    "";
  const roleOffice = branchName(
    data,
    initialOriginBranchId,
    officeForRole(user.role) || "",
  );
  const initialOrigin =
    current?.origin || roleOffice || originBranches[0]?.name || "";
  const initialBranch = branchById(data, initialOriginBranchId);
  const initialCurrency =
    current?.currency ||
    initialBranch?.defaultCurrency ||
    branchCurrencies(initialBranch)[0];
  const initialPaidByBranchId =
    current?.paidByBranchId || initialOriginBranchId;
  const initialPaymentMethod =
    current?.paymentMethod ||
    paymentMethodsFor(data, initialPaidByBranchId, initialCurrency)[0] ||
    ("Bank" as PaymentMethod);
  const defaultRateFor = (
    originBranchId: string,
    destinationBranchId: string,
    currency: Currency,
  ) =>
    data.rates.find(
      (r) =>
        (r.originBranchId === originBranchId ||
          r.origin === branchName(data, originBranchId)) &&
        (r.destinationBranchId === destinationBranchId ||
          r.destination === branchName(data, destinationBranchId)) &&
        r.currency === currency &&
        r.isActive !== false,
    )?.rate;
  const initialRate =
    current?.rate ??
    defaultRateFor(
      initialOriginBranchId,
      initialDestinationBranchId,
      initialCurrency,
    ) ??
    0;
  const [f, setF] = useState({
    originBranchId: initialOriginBranchId,
    destinationBranchId: initialDestinationBranchId,
    origin: initialOrigin,
    dateIn: current?.dateIn || today(),
    sender: current?.sender || "",
    senderPhone: current?.senderPhone || "",
    senderEmail: current?.senderEmail || "",
    receiver: current?.receiver || "",
    receiverPhone: current?.receiverPhone || "",
    paymentResponsibility:
      current?.paymentResponsibility === "receiver" ? "receiver" : "sender",
    contents: current?.contents || "",
    weight: String(current?.weight || ""),
    currency: initialCurrency,
    rate: String(initialRate || ""),
    rateNote: current?.rateNote || "",
    payType: current?.payType || "Collect",
    paymentOption: "later" as "later" | "now" | "partial",
    paymentAmount: "",
    paymentReference: "",
    paymentMethod: initialPaymentMethod,
    paidByBranchId: initialPaidByBranchId,
    paidByOffice:
      current?.paidByOffice || roleOffice || originBranches[0]?.name || "",
    status: current?.status || "received",
    dateDelivered: current?.dateDelivered || "",
    notes: current?.notes || "",
  });
  const defaultRate = defaultRateFor(
    f.originBranchId,
    f.destinationBranchId,
    f.currency as Currency,
  );
  const customRate =
    f.rate !== "" &&
    (defaultRate === undefined || Number(f.rate) !== defaultRate);
  const shipmentValue = (Number(f.weight) || 0) * (Number(f.rate) || 0);
  const applyDefaultRate = () =>
    setF({ ...f, rate: String(defaultRate ?? "") });
  const [busy, setBusy] = useState(false);
  const [rateNoteError, setRateNoteError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.rateNote.trim()) {
      setRateNoteError("Pricing note / flight reference is required.");
      return;
    }
    setRateNoteError("");
    if (
      !f.sender ||
      !f.senderPhone ||
      !f.receiver ||
      (f.paymentResponsibility === "receiver" && !f.receiverPhone) ||
      !f.contents ||
      !f.weight ||
      f.rate === "" ||
      !f.originBranchId ||
      !f.destinationBranchId ||
      f.originBranchId === f.destinationBranchId
    )
      return;
    if (
      !current &&
      f.paymentOption === "partial" &&
      (Number(f.paymentAmount) <= 0 || Number(f.paymentAmount) >= shipmentValue)
    )
      return;
    const originBranch = branchById(data, f.originBranchId);
    const destinationBranch = branchById(data, f.destinationBranchId);
    const paidByBranch = branchById(data, f.paidByBranchId) || originBranch;
    setBusy(true);
    await onSave(
      {
        id: current?.id || uid("cargo"),
        tracking: current?.tracking || "",
        origin: originBranch?.name || f.origin,
        destination: destinationBranch?.name || "",
        originBranchId: f.originBranchId,
        destinationBranchId: f.destinationBranchId,
        dateIn: f.dateIn,
        sender: f.sender,
        senderPhone: f.senderPhone,
        senderEmail: f.senderEmail.trim(),
        receiver: f.receiver,
        receiverPhone: f.receiverPhone,
        paymentResponsibility: f.paymentResponsibility as "sender" | "receiver",
        contents: f.contents,
        weight: Number(f.weight),
        currency: f.currency as Currency,
        rate: Number(f.rate),
        rateNote: f.rateNote.trim(),
        customerCharge: shipmentValue,
        payType: current
          ? (f.payType as Cargo["payType"])
          : f.paymentOption === "now"
            ? "Prepaid"
            : "Collect",
        ...(!current && f.paymentOption !== "later"
          ? {
              paymentMethod: f.paymentMethod as PaymentMethod,
              paidByOffice: paidByBranch?.name || f.paidByOffice,
              paidByBranchId: f.paidByBranchId,
            }
          : {}),
        paid: false,
        paymentDate: "",
        status: f.status as Cargo["status"],
        dateDelivered:
          cargoStatusKey(f.status) === "delivered"
            ? f.dateDelivered || today()
            : f.dateDelivered,
        notes: f.notes,
        createdBy: current?.createdBy || user.id,
        updatedBy: user.id,
        updatedAt: new Date().toISOString(),
      },
      !current && f.paymentOption !== "later"
        ? {
            amount:
              f.paymentOption === "now"
                ? shipmentValue
                : Number(f.paymentAmount),
            branchId: f.paidByBranchId,
            paymentDate: f.dateIn,
            paymentMethod: f.paymentMethod as PaymentMethod,
            reference: f.paymentReference.trim(),
            idempotencyKey: uid("cargo-payment"),
          }
        : undefined,
    );
    setBusy(false);
  };
  return (
    <Modal
      title={current ? `Update ${current.tracking}` : "Create Cargo"}
      subtitle="Record the shipment, customer charge and customer responsible for payment."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Origin branch">
            <BranchSelect
              options={originBranches}
              disabled={user.role === "operator"}
              value={f.originBranchId}
              onChange={(e) => {
                const originBranchId = e.target.value;
                const branch = branchById(data, originBranchId);
                const origin = branch?.name || "";
                const currency = branch?.defaultCurrency || f.currency;
                const destinationBranchId =
                  f.destinationBranchId === originBranchId
                    ? ""
                    : f.destinationBranchId;
                const paymentMethod =
                  paymentMethodsFor(data, originBranchId, currency)[0] ||
                  f.paymentMethod;
                setF({
                  ...f,
                  originBranchId,
                  origin,
                  destinationBranchId,
                  currency,
                  paymentMethod,
                  paidByBranchId: originBranchId,
                  paidByOffice: origin,
                  rate: String(
                    defaultRateFor(
                      originBranchId,
                      destinationBranchId,
                      currency,
                    ) ?? "",
                  ),
                });
              }}
            />
          </Field>
          <Field label="Destination branch">
            <BranchSelect
              options={destinationBranches.filter(
                (branch) => branch.id !== f.originBranchId,
              )}
              value={f.destinationBranchId}
              onChange={(e) =>
                setF({
                  ...f,
                  destinationBranchId: e.target.value,
                  rate: String(
                    defaultRateFor(
                      f.originBranchId,
                      e.target.value,
                      f.currency as Currency,
                    ) ?? "",
                  ),
                })
              }
            />
          </Field>
          <Field label="Date received">
            <input
              required
              type="date"
              value={f.dateIn}
              onChange={(e) => setF({ ...f, dateIn: e.target.value })}
            />
          </Field>
          <Field label="Sender">
            <input
              required
              value={f.sender}
              onChange={(e) => setF({ ...f, sender: e.target.value })}
            />
          </Field>
          <Field label="Sender phone">
            <input
              required
              value={f.senderPhone}
              onChange={(e) => setF({ ...f, senderPhone: e.target.value })}
            />
          </Field>
          <Field label="Sender email (optional, for status updates)">
            <input
              type="email"
              value={f.senderEmail}
              onChange={(e) => setF({ ...f, senderEmail: e.target.value })}
              placeholder="client@example.com"
            />
          </Field>
          <Field label="Receiver">
            <input
              required
              value={f.receiver}
              onChange={(e) => setF({ ...f, receiver: e.target.value })}
            />
          </Field>
          <Field label="Receiver phone">
            <input
              required={f.paymentResponsibility === "receiver"}
              value={f.receiverPhone}
              onChange={(e) => setF({ ...f, receiverPhone: e.target.value })}
            />
          </Field>
          <Field label="Customer responsible for payment">
            <select
              required
              value={f.paymentResponsibility}
              onChange={(e) =>
                setF({
                  ...f,
                  paymentResponsibility: e.target.value as
                    "sender" | "receiver",
                })
              }
            >
              <option value="sender">Sender</option>
              <option value="receiver">Receiver</option>
            </select>
          </Field>
          <Field label="Contents" wide>
            <input
              required
              value={f.contents}
              onChange={(e) => setF({ ...f, contents: e.target.value })}
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              required
              min="0"
              step="0.1"
              type="number"
              value={f.weight}
              onChange={(e) => setF({ ...f, weight: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <select
              value={f.currency}
              onChange={(e) => {
                const currency = e.target.value as Currency;
                const paymentMethod =
                  paymentMethodsFor(data, f.paidByBranchId, currency)[0] ||
                  ("Bank" as PaymentMethod);
                setF({
                  ...f,
                  currency,
                  paymentMethod,
                  rate: String(
                    defaultRateFor(
                      f.originBranchId,
                      f.destinationBranchId,
                      currency,
                    ) ?? "",
                  ),
                });
              }}
            >
              {branchCurrencies(branchById(data, f.originBranchId)).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <section className="cargo-rate-card">
            <div className="cargo-rate-head">
              <div>
                <span>Customer rate for this shipment</span>
                <small>
                  Change this for a particular client or flight. Settings remain
                  unchanged.
                </small>
              </div>
              <b className={customRate ? "custom" : "default"}>
                {customRate
                  ? "Custom rate"
                  : defaultRate !== undefined
                    ? "Office default"
                    : "Shipment rate"}
              </b>
            </div>
            <div className="cargo-rate-grid">
              <Field label={`Rate / kg (${f.currency})`}>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={f.rate}
                  onChange={(e) => setF({ ...f, rate: e.target.value })}
                />
              </Field>
              <Field label="Pricing note / flight reference *">
                <div className="field-control">
                  <input
                    required
                    value={f.rateNote}
                    onInvalid={(e) => {
                      e.preventDefault();
                      setRateNoteError(
                        "Pricing note / flight reference is required.",
                      );
                    }}
                    onChange={(e) => {
                      const rateNote = e.target.value;
                      setF({ ...f, rateNote });
                      if (rateNoteError && rateNote.trim())
                        setRateNoteError("");
                    }}
                    placeholder="e.g. Flight SO-201 or agreed client rate"
                    aria-invalid={Boolean(rateNoteError)}
                    aria-describedby={
                      rateNoteError ? "cargo-rate-note-error" : undefined
                    }
                  />
                  {rateNoteError && (
                    <small
                      id="cargo-rate-note-error"
                      className="field-error"
                      role="alert"
                    >
                      {rateNoteError}
                    </small>
                  )}
                </div>
              </Field>
            </div>
            <div className="cargo-rate-footer">
              <span>
                {defaultRate !== undefined
                  ? `Default: ${money(defaultRate, f.currency as Currency)} / kg`
                  : "No office default is set"}
              </span>
              {defaultRate !== undefined && customRate && (
                <button type="button" onClick={applyDefaultRate}>
                  Use office default
                </button>
              )}
              <strong>
                Cargo Charge: {money(shipmentValue, f.currency as Currency)}
              </strong>
            </div>
          </section>
          <section className="cargo-payment-section">
            <div className="section-heading">
              <span className="eyebrow">Customer payment</span>
            </div>
          {!current && (
            <Field label="Payment choice">
              <select
                value={f.paymentOption}
                onChange={(e) =>
                  setF({
                    ...f,
                    paymentOption: e.target.value as
                      "later" | "now" | "partial",
                  })
                }
              >
                <option value="now">Pay Now</option>
                <option value="partial">Pay Partially</option>
                <option value="later">Pay Later</option>
              </select>
            </Field>
          )}
          {!current && f.paymentOption === "partial" && (
            <Field label={`Amount received (${f.currency})`}>
              <input
                required
                min="0.01"
                max={Math.max(0, shipmentValue - 0.01)}
                step="0.01"
                type="number"
                value={f.paymentAmount}
                onChange={(e) => setF({ ...f, paymentAmount: e.target.value })}
              />
            </Field>
          )}
          {!current && f.paymentOption === "partial" && (
            <Field label="Remaining balance">
              <div className="readonly-value">
                {money(
                  Math.max(0, shipmentValue - (Number(f.paymentAmount) || 0)),
                  f.currency as Currency,
                )}
              </div>
            </Field>
          )}
          {!current && f.paymentOption === "now" && (
            <Field label="Amount">
              <div className="readonly-value">
                {money(shipmentValue, f.currency as Currency)}
              </div>
            </Field>
          )}
          {!current && f.paymentOption === "later" && (
            <>
              <Field label="Amount due">
                <div className="readonly-value">
                  {money(shipmentValue, f.currency as Currency)}
                </div>
              </Field>
              <Field label="Payment status">
                <div className="readonly-value">Unpaid</div>
              </Field>
            </>
          )}
          {!current && f.paymentOption !== "later" && (
            <Field label="Payment branch">
            <select
              value={f.paidByBranchId}
              onChange={(e) => {
                const paidByBranchId = e.target.value;
                const branch = branchById(data, paidByBranchId);
                const paymentMethod =
                  paymentMethodsFor(data, paidByBranchId, f.currency)[0] ||
                  ("Bank" as PaymentMethod);
                setF({
                  ...f,
                  paidByBranchId,
                  paidByOffice: branch?.name || f.paidByOffice,
                  paymentMethod,
                });
              }}
            >
              {destinationBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            </Field>
          )}
          {!current && f.paymentOption !== "later" && (
          <Field label="Payment method">
            <select
              required
              value={f.paymentMethod}
              onChange={(e) =>
                setF({ ...f, paymentMethod: e.target.value as PaymentMethod })
              }
            >
              {paymentMethodsFor(data, f.paidByBranchId, f.currency).map(
                (x) => (
                  <option key={x}>{x}</option>
                ),
              )}
            </select>
          </Field>
          )}
          {!current && f.paymentOption !== "later" && (
            <Field label="Payment reference">
              <input
                value={f.paymentReference}
                onChange={(e) =>
                  setF({ ...f, paymentReference: e.target.value })
                }
                placeholder="Optional bank or mobile reference"
              />
            </Field>
          )}
          </section>
          {current && (
            <Field label="Cargo status">
              <div className="readonly-value">{cargoStatusLabel(f.status)}</div>
            </Field>
          )}
          {cargoStatusKey(f.status) === "delivered" && (
            <Field label="Date delivered">
              <input
                type="date"
                value={f.dateDelivered}
                onChange={(e) => setF({ ...f, dateDelivered: e.target.value })}
              />
            </Field>
          )}
          <Field label="Notes" wide>
            <textarea
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving..." : current ? "Save Changes" : "Create Cargo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Receivables({
  data,
  user,
  notify,
  replaceData,
}: Pick<ModuleProps, "data" | "user" | "notify" | "replaceData">) {
  const availableBranches = branchOptions(data, user);
  const lockedBranchId =
    user.role === "operator" ? String(user.assignedBranchId || "") : "";
  const [filters, setFilters] = useState({
    branchId: lockedBranchId,
    service: "",
    currency: "",
    status: "outstanding",
    aging: "",
    customer: "",
    from: "",
    to: "",
  });
  const [rows, setRows] = useState<Receivable[]>([]);
  const [totals, setTotals] = useState<ReceivableTotal[]>([]);
  const [paying, setPaying] = useState<Receivable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value)
          query.set(
            key,
            key === "status" && value === "outstanding" ? "open" : value,
          );
      });
      try {
        const payload = await apiRequest<{
          rows: Receivable[];
          totals: ReceivableTotal[];
        }>(`/api/receivables?${query.toString()}`, { cache: "no-store" });
        if (!active) return;
        setRows(
          (payload.rows || []).map((row) => ({
            ...row,
            totalPaid: row.totalPaid ?? row.amountPaid ?? 0,
            accountsReceivable:
              row.accountsReceivable ?? row.balanceDue ?? 0,
          })),
        );
        setTotals(
          (payload.totals || []).map((total) => ({
            ...total,
            totalCharges: total.totalCharges ?? total.totalCharge ?? 0,
            totalPaid: total.totalPaid ?? total.amountPaid ?? 0,
            totalOutstanding:
              total.totalOutstanding ?? total.balanceDue ?? 0,
            outstandingRecords:
              total.outstandingRecords ??
              (total.balanceDue > 0 ? total.records : 0),
          })),
        );
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Receivables could not be loaded.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [filters, refresh]);

  const selectedBranch = branchById(data, filters.branchId);
  const currencies = selectedBranch
    ? branchCurrencies(selectedBranch)
    : Array.from(
        new Set(
          availableBranches.flatMap((branch) => branchCurrencies(branch)),
        ),
      );
  const setFilter = (key: keyof typeof filters, value: string) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "branchId" &&
      value &&
      current.currency &&
      !branchCurrencies(branchById(data, value)).includes(
        current.currency as Currency,
      )
        ? { currency: "" }
        : {}),
    }));
  const displayTotals = totals.length
    ? totals
    : (filters.currency ? [filters.currency] : currencies).map((currency) => ({
        currency,
        totalOutstanding: 0,
      }));
  const outstandingRecordCount = totals.reduce(
    (count, total) => count + total.outstandingRecords,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Customer balances"
        title="Accounts Receivable"
        detail="Track customer balances and money still owed to SomWay."
      />
      <div className="receivable-filters">
        <Field label="Branch">
          <select
            disabled={Boolean(lockedBranchId)}
            value={filters.branchId}
            onChange={(event) => setFilter("branchId", event.target.value)}
          >
            {!lockedBranchId && <option value="">All branches</option>}
            {availableBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Service">
          <select
            value={filters.service}
            onChange={(event) => setFilter("service", event.target.value)}
          >
            <option value="">All services</option>
            <option value="ticket">Tickets</option>
            <option value="visa">Visas</option>
            <option value="cargo">Cargo</option>
          </select>
        </Field>
        <Field label="Currency">
          <select
            value={filters.currency}
            onChange={(event) => setFilter("currency", event.target.value)}
          >
            <option value="">All currencies</option>
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </Field>
        <Field label="Payment status">
          <select
            value={filters.status}
            onChange={(event) => setFilter("status", event.target.value)}
          >
            <option value="outstanding">Outstanding</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="all">All records</option>
          </select>
        </Field>
        <Field label="Aging">
          <select
            value={filters.aging}
            onChange={(event) => setFilter("aging", event.target.value)}
          >
            <option value="">All ages</option>
            <option value="current">Current</option>
            <option value="1-30">1-30 days</option>
            <option value="31-60">31-60 days</option>
            <option value="61-90">61-90 days</option>
            <option value="90+">Over 90 days</option>
          </select>
        </Field>
        <Field label="Customer">
          <input
            value={filters.customer}
            onChange={(event) => setFilter("customer", event.target.value)}
            placeholder="Search customer"
          />
        </Field>
        <Field label="From">
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilter("from", event.target.value)}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilter("to", event.target.value)}
          />
        </Field>
      </div>
      {(() => {
        const totals = displayTotals.length
          ? displayTotals
          : [{ currency: "USD", totalOutstanding: 0 }];
        return (
          <section
            className="metrics-grid"
            style={{ gridTemplateColumns: `repeat(${totals.length + 1}, minmax(0, 1fr))` }}
          >
            {totals.map((total, index) => (
              <MetricCard
                key={total.currency}
                icon="money"
                tone={index === 0 ? "blue" : "cyan"}
                label={`Outstanding (${total.currency})`}
                value={money(total.totalOutstanding, total.currency as Currency)}
                foot="Money customers still owe SomWay"
              />
            ))}
            <MetricCard
              icon="receipt"
              tone="violet"
              label="Outstanding Records"
              value={outstandingRecordCount}
              foot={
                outstandingRecordCount === 1
                  ? "1 outstanding record"
                  : "Outstanding customer records"
              }
            />
          </section>
        );
      })()}
      {error ? (
        <Empty title="Receivables unavailable" detail={error} />
      ) : loading ? (
        <Empty
          title="Loading receivables"
          detail="Reading customer balances from MongoDB."
        />
      ) : rows.length ? (
        <TableShell>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Service</th>
              <th>Customer responsible</th>
              <th>Branch</th>
              <th>Date</th>
              <th>Total charge</th>
              <th>Total Paid</th>
              <th>Remaining Balance</th>
              <th>Status</th>
              <th>Aging</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.reference}</strong>
                </td>
                <td>{row.service}</td>
                <td>
                  <strong>{row.customer}</strong>
                  {!row.payerResolved && <small>Needs payer resolution</small>}
                </td>
                <td><BranchName data={data} branch={row.branch} /></td>
                <td>{dateLabel(row.transactionDate)}</td>
                <td>{money(row.totalCharge, row.currency)}</td>
                <td>{money(row.totalPaid, row.currency)}</td>
                <td className={row.balanceDue > 0 ? "negative" : "positive"}>
                  {money(row.balanceDue, row.currency)}
                </td>
                <td>
                  <Badge
                    tone={
                      row.paymentStatus === "paid"
                        ? "success"
                        : row.paymentStatus === "partial"
                          ? "blue"
                          : "warning"
                    }
                  >
                    {row.paymentStatus}
                  </Badge>
                </td>
                <td>
                  {row.ageDays} days -{" "}
                  {row.aging === "current" ? "Current" : `${row.aging} days`}
                </td>
                <td>
                  {row.balanceDue > 0 && row.payerResolved && (
                    <div className="row-actions">
                      <button type="button" onClick={() => setPaying(row)}>
                        Receive Payment
                      </button>
                    </div>
                  )}
                  {row.balanceDue <= 0 && (
                    <span className="paid-in-full">Paid in Full</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : (
        <Empty
          title={
            filters.status === "outstanding"
              ? "No outstanding customer balances"
              : filters.status === "paid"
                ? "No fully paid records match these filters"
                : "No matching customer balances"
          }
          detail="Change the filters to review a different set of customer balances."
        />
      )}
      {paying && (
        <CustomerPaymentForm
          transactionType={paying.transactionType}
          transactionId={paying.transactionId}
          label={paying.reference}
          branchId={paying.branchId}
          currency={paying.currency}
          balance={paying.balanceDue}
          customer={paying.customer}
          service={paying.service}
          totalCharge={paying.totalCharge}
          amountPaid={paying.totalPaid}
          data={data}
          onClose={() => setPaying(null)}
          onSaved={(next) => {
            replaceData?.(next);
            setPaying(null);
            setRefresh((value) => value + 1);
            notify("Customer payment recorded");
          }}
        />
      )}
    </>
  );
}

function Visas({ data, user, save, notify, replaceData, scopeBranchId, focusRef }: ModuleProps) {
  const userBranch = branchForUser(data, user);
  const roleOffice = officeForRole(user.role) || userBranch?.name || null;
  const branches = branchOptions(data, user);
  const canWrite =
    user.role === "owner" ||
    user.role === "operator" ||
    !!officeForRole(user.role);
  const financial = user.role === "owner" || user.role === "consultant";
  // Deleting is owner-only; operators create and correct, never remove.
  const canDelete = user.role === "owner";
  const [query, setQuery] = useState(focusRef || "");
  // Opening a notification lands here with the record reference, so the
  // register searches for it and the row is on screen. This is adjusted
  // while rendering rather than in an effect so the list never paints once
  // with the old query and again with the new one. Only a reference we have
  // not seen before replaces the box, so anything typed since is kept.
  const [seenFocus, setSeenFocus] = useState(focusRef);
  if (focusRef !== seenFocus) {
    setSeenFocus(focusRef);
    if (focusRef) setQuery(focusRef);
  }
  const [office, setOffice] = useState(roleOffice || "All");
  // Follow the global branch scope chosen in the top bar.
  useBranchScope(scopeBranchId, (id) =>
    setOffice(id ? branchName(data, id, "All") : roleOffice || "All"),
  );
  const [editing, setEditing] = useState<Visa | null | undefined>();
  const [deleting, setDeleting] = useState<Visa | null>(null);
  const [paying, setPaying] = useState<Visa | null>(null);
  const rows = data.visas.filter(
    (x) =>
      (office === "All" || x.office === office) &&
      `${x.ref} ${x.applicant} ${x.phone} ${x.destination}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const visaCounts = {
    submitted: rows.filter((visa) => visa.status === "submitted").length,
    approved: rows.filter((visa) => visa.status === "approved").length,
    refused: rows.filter((visa) => visa.status === "refused").length,
    delivered: rows.filter((visa) => visa.status === "delivered").length,
  };
  const approvedVisas = visaCounts.approved + visaCounts.delivered;
  const approvalRate = rows.length ? Math.round((approvedVisas / rows.length) * 100) : 0;
  const updateStatus = async (visa: Visa, status: Visa["status"]) => {
    const normallyAllowed = (visaNextStatuses[visa.status] || []).includes(
      status,
    );
    const correctionReason =
      user.role === "owner" && !normallyAllowed
        ? window.prompt("Reason for correcting this visa status") || ""
        : "";
    if (user.role === "owner" && !normallyAllowed && !correctionReason.trim())
      return;
    const response = await fetch(
      `/api/workflows/visas/${encodeURIComponent(visa.id)}/transition`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, correctionReason }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      notify(payload.error || "Visa progress could not be updated");
      return;
    }
    if (payload.data) replaceData?.(payload.data);
    notify(`${visa.ref} changed to ${serviceStatusLabel(status)}`);
  };
  return (
    <>
      <PageHeader
        eyebrow="Client services"
        title="Visa Applications"
        detail={
          financial
            ? "Track every application, payment and margin."
            : `Work on ${roleOffice} applications without access to agency cost or profit.`
        }
        actions={
          canWrite && (
            <button className="button primary" onClick={() => setEditing(null)}>
              <Icon name="plus" /> New Visa
            </button>
          )
        }
      />
      <div className="content-grid">
        <div className="stack">
          <div className="metrics-grid five">
            <MetricCard icon="passport" label="Total Applications" value={rows.length} tone="blue" foot="Selected branch" />
            <MetricCard icon="file" label="Submitted" value={visaCounts.submitted} tone="violet" foot="Awaiting decision" />
            <MetricCard icon="check" label="Approved" value={approvedVisas} tone="green" foot="Approved or delivered" />
            <MetricCard icon="clock" label="Pending" value={visaCounts.submitted} tone="orange" foot="In progress" />
            <MetricCard icon="alert" label="Refused" value={visaCounts.refused} tone="red" foot="Closed as refused" />
          </div>
          <Toolbar
            query={query}
            setQuery={setQuery}
            office={office}
            setOffice={setOffice}
            branches={branches}
            allowAll={!roleOffice}
          />
        </div>
        <Panel title="Approval Rate">
          <Donut
            total={`${approvalRate}%`}
            centerLabel="Approval Rate"
            segments={[
              { value: rows.length ? (approvedVisas / rows.length) * 100 : 0, color: "#16a34a", label: "Approved", amount: String(approvedVisas) },
              { value: rows.length ? (visaCounts.refused / rows.length) * 100 : 0, color: "#ef4444", label: "Refused", amount: String(visaCounts.refused) },
              { value: rows.length ? (visaCounts.submitted / rows.length) * 100 : 0, color: "#f59e0b", label: "Pending", amount: String(visaCounts.submitted) },
            ]}
          />
        </Panel>
      </div>
      {rows.length ? (
        <Panel title="Visa Register" actions={<StatusBadge tone="blue">Live</StatusBadge>}>
        <TableShell>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Applicant</th>
              <th>Destination</th>
              <th>Office</th>
              {financial && (
                <>
                  <th>Sale / refund</th>
                  <th>Profit / loss</th>
                </>
              )}
              <th>Payment</th>
              <th>Progress</th>
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const profit =
                x.type === "Refund" ? -x.amount : x.amount - x.cost;
              return (
                <tr key={x.id}>
                  <td>
                    <strong>{x.ref}</strong>
                    <small>{dateLabel(x.appDate)}</small>
                  </td>
                  <td>
                    {x.applicant}
                    <small>{x.phone}</small>
                  </td>
                  <td>
                    {x.destination}
                    <small>{x.visaType}</small>
                  </td>
                  <td>
                    <BranchBadge data={data} office={x.office} />
                  </td>
                  {financial && (
                    <>
                      <td>
                        {money(
                          (x.type === "Refund" ? -1 : 1) * x.amount,
                          x.currency,
                        )}
                      </td>
                      <td className={profit < 0 ? "negative" : "positive"}>
                        {money(profit, x.currency)}
                      </td>
                    </>
                  )}
                  <td>
                    <Badge
                      tone={
                        x.type === "Refund"
                          ? x.paymentStatus === "paid"
                            ? "success"
                            : "danger"
                          : x.paymentStatus === "paid"
                            ? "success"
                            : x.paymentStatus === "partial"
                              ? "blue"
                              : "warning"
                      }
                    >
                      {x.type === "Refund"
                        ? x.paymentStatus === "paid"
                          ? "Refunded"
                          : "Refund due"
                        : x.paymentStatus === "paid"
                          ? "Paid"
                          : x.paymentStatus === "partial"
                            ? "Part paid"
                            : "Unpaid"}
                    </Badge>
                    <small>
                      {x.paymentStatus === "partial"
                        ? `${money(x.amountPaid || 0, x.currency)} paid`
                        : x.paymentMethod}
                    </small>
                  </td>
                  <td>
                    {canWrite ? (
                      <select
                        className={`inline-status ${x.status}`}
                        aria-label={`Progress for ${x.ref}`}
                        value={x.status}
                        onChange={(e) =>
                          void updateStatus(x, e.target.value as Visa["status"])
                        }
                      >
                        {[
                          x.status,
                          ...(user.role === "owner"
                            ? ([
                                "submitted",
                                "approved",
                                "refused",
                                "delivered",
                              ] as const)
                            : visaNextStatuses[x.status] || []),
                        ]
                          .filter(
                            (status, index, list) =>
                              list.indexOf(status) === index,
                          )
                          .map((status) => (
                            <option key={status} value={status}>
                              {serviceStatusLabel(status)}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <Badge
                        tone={
                          x.status === "delivered" || x.status === "approved"
                            ? "success"
                            : x.status === "refused"
                              ? "danger"
                              : "blue"
                        }
                      >
                        {serviceStatusLabel(x.status)}
                      </Badge>
                    )}
                  </td>
                  {canWrite && (
                    <td>
                      <Actions
                        onEdit={() => setEditing(x)}
                        onDelete={canDelete ? () => setDeleting(x) : undefined}
                        onPayment={
                          (x.balance ?? x.amount) > 0
                            ? () => setPaying(x)
                            : undefined
                        }
                        paymentLabel={
                          x.type === "Refund"
                            ? "Record refund"
                            : "Record payment"
                        }
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableShell>
        </Panel>
      ) : (
        <Empty
          title="No visa applications"
          detail="Add the first client case to begin tracking progress."
        />
      )}
      {editing !== undefined && (
        <VisaForm
          current={editing}
          data={data}
          user={user}
          onClose={() => setEditing(undefined)}
          onSave={(r) => {
            save(
              (d) => ({
                ...d,
                visas: editing
                  ? [...d.visas.filter((x) => x.id !== editing.id), r]
                  : [r, ...d.visas],
              }),
              {
                entity: "Visa",
                detail: `${editing ? "Updated" : "Created"} ${r.ref}`,
              },
            );
            setEditing(undefined);
            notify(
              `Visa ${r.ref} ${editing ? "updated" : "created"} for ${r.applicant || "applicant"}`,
            );
          }}
        />
      )}
      {paying && (
        <CustomerPaymentForm
          transactionType="visa"
          transactionId={paying.id}
          label={paying.ref}
          branchId={String(paying.branchId || "")}
          currency={paying.currency}
          balance={paying.balance ?? paying.amount}
          isRefund={paying.type === "Refund"}
          data={data}
          onClose={() => setPaying(null)}
          onSaved={(next) => {
            replaceData?.(next);
            setPaying(null);
            notify(
              paying.type === "Refund" ? "Refund recorded" : "Payment recorded",
            );
          }}
        />
      )}
      {deleting && (
        <Confirm
          title="Archive visa case?"
          detail={`${deleting.ref} will leave active registers while its history remains retained.`}
          confirmLabel="Archive Visa"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            save(
              (d) => ({
                ...d,
                visas: d.visas.filter((x) => x.id !== deleting.id),
              }),
              { entity: "Visa", detail: `Archived ${deleting.ref}` },
            );
            setDeleting(null);
            notify("Visa case archived");
          }}
        />
      )}
    </>
  );
}

function VisaForm({
  current,
  data,
  user,
  onClose,
  onSave,
}: {
  current: Visa | null;
  data: AgencyData;
  user: User;
  onClose: () => void;
  onSave: (r: Visa) => void;
}) {
  const branches = branchOptions(data, user);
  const legacyOffice = officeForRole(user.role);
  const initialBranchId =
    current?.branchId ||
    branchIdForOffice(data, current?.office || legacyOffice) ||
    branches[0]?.id ||
    "";
  const initialBranch = branchById(data, initialBranchId);
  const initialCurrency =
    current?.currency ||
    initialBranch?.defaultCurrency ||
    branchCurrencies(initialBranch)[0];
  const initialPaymentMethod =
    current?.paymentMethod ||
    paymentMethodsFor(data, initialBranchId, initialCurrency)[0] ||
    ("Bank" as PaymentMethod);
  const locked = user.role === "operator" || Boolean(legacyOffice);
  const [f, setF] = useState({
    branchId: initialBranchId,
    office:
      current?.office ||
      initialBranch?.name ||
      legacyOffice ||
      ("Nairobi" as Office),
    type: current?.type || "Sale",
    appDate: current?.appDate || today(),
    applicant: current?.applicant || "",
    phone: current?.phone || "",
    email: current?.email || "",
    destination: current?.destination || "",
    visaType: current?.visaType || "",
    currency: initialCurrency,
    amount: String(current?.amount || ""),
    cost: String(current?.cost || ""),
    paymentMethod: initialPaymentMethod,
    notes: current?.notes || "",
  });
  return (
    <Modal title={current ? "Edit Visa" : "Create Visa"} onClose={onClose}>
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: current?.id || uid("visa"),
            ref: current?.ref || "",
            branchId: f.branchId,
            office: f.office as Office,
            type: f.type as Visa["type"],
            appDate: f.appDate,
            applicant: f.applicant,
            phone: f.phone,
            email: f.email.trim(),
            destination: f.destination,
            visaType: f.visaType,
            currency: f.currency as Currency,
            amount: Number(f.amount),
            cost: f.type === "Refund" ? 0 : Number(f.cost) || 0,
            paymentMethod: f.paymentMethod as PaymentMethod,
            paid: false,
            paymentDate: "",
            status: current?.status || "submitted",
            servedBy: user.name,
            notes: f.notes,
            createdBy: current?.createdBy || user.id,
            updatedAt: new Date().toISOString(),
          });
        }}
      >
        <div className="form-grid">
          <Field label="Branch">
            <BranchSelect
              options={branches}
              disabled={locked}
              value={f.branchId}
              onChange={(e) => {
                const branchId = e.target.value;
                const branch = branchById(data, branchId);
                const currency =
                  branch?.defaultCurrency || branchCurrencies(branch)[0];
                const paymentMethod =
                  paymentMethodsFor(data, branchId, currency)[0] ||
                  ("Bank" as PaymentMethod);
                setF({
                  ...f,
                  branchId,
                  office: branch?.name || f.office,
                  currency,
                  paymentMethod,
                });
              }}
            />
          </Field>
          <Field label="Type">
            <select
              value={f.type}
              onChange={(e) => {
                const type = e.target.value as Visa["type"];
                setF({ ...f, type, cost: type === "Refund" ? "" : f.cost });
              }}
            >
              <option>Sale</option>
              <option>Refund</option>
            </select>
          </Field>
          <Field label="Application date">
            <input
              type="date"
              value={f.appDate}
              onChange={(e) => setF({ ...f, appDate: e.target.value })}
            />
          </Field>
          <Field label="Applicant">
            <input
              required
              value={f.applicant}
              onChange={(e) => setF({ ...f, applicant: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              required
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </Field>
          <Field label="Email (for status updates)">
            <input
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              placeholder="client@example.com"
            />
          </Field>
          <Field label="Destination">
            <input
              required
              value={f.destination}
              onChange={(e) => setF({ ...f, destination: e.target.value })}
            />
          </Field>
          <Field label="Visa type">
            <input
              value={f.visaType}
              onChange={(e) => setF({ ...f, visaType: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <select
              value={f.currency}
              onChange={(e) => {
                const currency = e.target.value as Currency;
                const paymentMethod =
                  paymentMethodsFor(data, f.branchId, currency)[0] ||
                  ("Bank" as PaymentMethod);
                setF({ ...f, currency, paymentMethod });
              }}
            >
              {branchCurrencies(branchById(data, f.branchId)).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label={f.type === "Refund" ? "Refund amount" : "Sale amount"}>
            <input
              required
              type="number"
              min="0"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
          {user.role === "owner" && f.type !== "Refund" && (
            <Field label="Agency cost">
              <input
                type="number"
                min="0"
                value={f.cost}
                onChange={(e) => setF({ ...f, cost: e.target.value })}
              />
            </Field>
          )}
          <Field label="Payment method">
            <select
              required
              value={f.paymentMethod}
              onChange={(e) =>
                setF({ ...f, paymentMethod: e.target.value as PaymentMethod })
              }
            >
              {paymentMethodsFor(data, f.branchId, f.currency).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes" wide>
            <textarea
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">
            {current ? "Save Changes" : "Create Visa"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Splits a stored route into its legs so the design's "NBO → DXB" treatment can
 * be drawn. Only unambiguous separators are honoured: a route typed as one word
 * is left exactly as the operator entered it rather than guessed at.
 */
const routeLegs = (value: string) =>
  String(value || "")
    .split(/\s*(?:→|->|—|–|\/|\bto\b)\s*/i)
    .map((leg) => leg.trim())
    .filter(Boolean);

/** A checklist line derived from the day's real records, never hand-entered. */
type ClosingStep = {
  label: string;
  state: "done" | "pending" | "waiting";
  at?: string;
};

/**
 * Two-series bar chart (collections against expenses). Shares BarChart's tick
 * logic so both charts round to the same readable scale.
 */
function GroupedBars({
  labels,
  series,
  axisLabel,
}: {
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  axisLabel?: string;
}) {
  const max = Math.max(...series.flatMap((entry) => entry.values), 1);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const niceMax = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => niceMax * fraction);
  return (
    <div className="grouped-bars">
      <div className="grouped-bars-legend">
        {series.map((entry) => (
          <span key={entry.name}>
            <i style={{ background: entry.color }} />
            {entry.name}
          </span>
        ))}
      </div>
      <div
        className="bar-chart-wrap"
        role="img"
        aria-label={axisLabel || "Collections against expenses"}
      >
        <div className="bar-chart-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{compactTick(tick)}</span>
          ))}
        </div>
        <div className="bar-chart">
          <div className="bar-chart-grid" aria-hidden="true">
            {ticks.map((tick) => (
              <i key={tick} />
            ))}
          </div>
          {labels.map((label, index) => (
            <div className="bar-group" key={`${label}-${index}`}>
              <div className="bar-pair">
                {series.map((entry) => (
                  <i
                    key={entry.name}
                    style={{
                      height: `${Math.max(2, ((entry.values[index] || 0) / niceMax) * 100)}%`,
                      background: entry.color,
                    }}
                  />
                ))}
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyClose({ data, user, notify, scopeBranchId, go }: ModuleProps) {
  const branches = branchOptions(data, user);
  const lockedBranchId =
    user.role === "operator" ? String(user.assignedBranchId || "") : "";
  const [date, setDate] = useState(today());
  const [branchId, setBranchId] = useState(lockedBranchId);
  // Follow the global branch scope chosen in the top bar.
  useBranchScope(scopeBranchId, (id) => setBranchId(id || lockedBranchId));
  const [currency, setCurrency] = useState("");
  const [rows, setRows] = useState<DailySummaryRow[]>([]);
  const [previousRows, setPreviousRows] = useState<DailySummaryRow[]>([]);
  const [openMetric, setOpenMetric] = useState("");
  const [settings, setSettings] = useState({
    timezone: "Africa/Mogadishu",
    businessDayStart: "07:00",
    businessDayEnd: "18:00",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  // The business day before the one on screen, for every "vs Yesterday" figure.
  const previousDate = (() => {
    const stamp = new Date(`${date}T12:00:00Z`);
    if (Number.isNaN(stamp.getTime())) return "";
    stamp.setUTCDate(stamp.getUTCDate() - 1);
    return stamp.toISOString().slice(0, 10);
  })();

  useEffect(() => {
    let active = true;
    const queryFor = (day: string) => {
      const params = new URLSearchParams({ date: day });
      if (branchId) params.set("branchId", branchId);
      if (currency) params.set("currency", currency);
      return params.toString();
    };
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/daily-close/summary?${queryFor(date)}`,
          { cache: "no-store" },
        );
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error || "Daily summary could not be loaded.",
          );
        if (!active) return;
        setRows(payload.rows || []);
        if (payload.settings) setSettings(payload.settings);
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Daily summary could not be loaded.",
          );
      } finally {
        if (active) setLoading(false);
      }
      // The comparison day is a nicety. If it cannot be read the page still
      // renders in full, simply without the "vs Yesterday" percentages.
      if (!previousDate) {
        if (active) setPreviousRows([]);
        return;
      }
      try {
        const response = await fetch(
          `/api/daily-close/summary?${queryFor(previousDate)}`,
          { cache: "no-store" },
        );
        const payload = await response.json();
        if (active) setPreviousRows(response.ok ? payload.rows || [] : []);
      } catch {
        if (active) setPreviousRows([]);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [date, previousDate, branchId, currency, refresh]);

  const selectedBranch = branchById(data, branchId);
  const currencies = selectedBranch
    ? branchCurrencies(selectedBranch)
    : Array.from(
        new Set(branches.flatMap((branch) => branchCurrencies(branch))),
      );
  const currencyCodes = (["KES", "USD"] as Currency[]).filter((code) =>
    rows.some((row) => row.currency === code),
  );
  const totalFor = (
    list: DailySummaryRow[],
    field: keyof DailySummaryRow,
    code: string,
  ) =>
    list.reduce((sum, row) => {
      const value = row[field];
      return row.currency === code && typeof value === "number"
        ? sum + value
        : sum;
    }, 0);
  const metric = (field: keyof DailySummaryRow) =>
    currencyCodes.length ? (
      currencyCodes.map((code) => (
        <strong key={code}>{money(totalFor(rows, field, code), code)}</strong>
      ))
    ) : (
      <strong>No activity</strong>
    );
  // Business-day analytics. Currencies are never summed together, so the charts
  // report the currency with the most activity (or the one being filtered on).
  const analyticsCurrency = ((): Currency => {
    if (currency) return currency as Currency;
    const byCurrency = rows.reduce<Record<string, number>>((totals, row) => {
      totals[row.currency] =
        (totals[row.currency] || 0) + row.revenue + row.moneyReceived;
      return totals;
    }, {});
    const ranked = Object.entries(byCurrency).sort((a, b) => b[1] - a[1]);
    return (
      (ranked[0]?.[0] as Currency) || (rows[0]?.currency as Currency) || "USD"
    );
  })();
  const analyticsRows = rows.filter((row) => row.currency === analyticsCurrency);
  const donutColors = ["#0b66e3", "#00a9c7", "#3bbf63", "#f59e0b", "#7c3aed"];

  // Percentage movement against the same figure yesterday, read in the busiest
  // currency because currencies are never added together.
  const deltaFor = (field: keyof DailySummaryRow) => {
    if (!previousRows.length) return null;
    const before = totalFor(previousRows, field, analyticsCurrency);
    if (!before) return null;
    const now = totalFor(rows, field, analyticsCurrency);
    const percent = ((now - before) / Math.abs(before)) * 100;
    return { percent, up: percent >= 0 };
  };

  const serviceTotals = analyticsRows
    .flatMap((row) => row.revenueByService || [])
    .reduce<Record<string, number>>((totals, entry) => {
      totals[entry.service] = (totals[entry.service] || 0) + entry.revenue;
      return totals;
    }, {});
  const serviceRevenueTotal = Object.values(serviceTotals).reduce(
    (sum, value) => sum + value,
    0,
  );
  const serviceSegments = Object.entries(serviceTotals)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({
      value: serviceRevenueTotal ? (value / serviceRevenueTotal) * 100 : 0,
      color: donutColors[index % donutColors.length],
      label: label.charAt(0).toUpperCase() + label.slice(1),
      amount: money(value, analyticsCurrency),
    }));

  const methodTotals = analyticsRows
    .flatMap((row) => row.paymentsByMethod || [])
    .reduce<Record<string, number>>((totals, entry) => {
      totals[entry.paymentMethod] =
        (totals[entry.paymentMethod] || 0) + entry.received;
      return totals;
    }, {});
  const methodReceivedTotal = Object.values(methodTotals).reduce(
    (sum, value) => sum + value,
    0,
  );
  const methodSegments = Object.entries(methodTotals)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({
      value: methodReceivedTotal ? (value / methodReceivedTotal) * 100 : 0,
      color: donutColors[index % donutColors.length],
      label,
      amount: money(value, analyticsCurrency),
    }));

  // Revenue and profit per branch for the business day, with yesterday's
  // revenue alongside so the movement column is a real comparison. Every branch
  // is listed in its own currency: restricting this to the chart currency hid
  // whole branches, and a single total across currencies would be meaningless.
  const branchPerformance = rows
    .map((row) => ({
      branch: row.branch,
      currency: row.currency,
      revenue: row.revenue,
      profit: row.profit,
      before: previousRows
        .filter(
          (previous) =>
            previous.branch === row.branch &&
            previous.currency === row.currency,
        )
        .reduce((sum, previous) => sum + previous.revenue, 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);
  const performanceTotals = currencyCodes.map((code) => ({
    currency: code,
    revenue: branchPerformance
      .filter((entry) => entry.currency === code)
      .reduce((sum, entry) => sum + entry.revenue, 0),
    profit: branchPerformance
      .filter((entry) => entry.currency === code)
      .reduce((sum, entry) => sum + entry.profit, 0),
  }));

  // With a single branch in view the flow chart compares payment channels;
  // across branches it compares the branches themselves.
  const flowRows = branchId
    ? analyticsRows
        .flatMap((row) => row.paymentsByMethod || [])
        .map((method) => ({
          label: method.paymentMethod,
          collections: method.received,
          expenses: method.expenses + method.supplierPaid,
        }))
    : analyticsRows.map((row) => ({
        label: row.branch,
        collections: row.moneyReceived,
        expenses: row.expenses,
      }));
  const flowHasValues = flowRows.some(
    (row) => row.collections > 0 || row.expenses > 0,
  );

  // Client and route leaders come straight from the day's own transactions.
  const inScope = (recordBranchId?: string | null) =>
    !branchId || String(recordBranchId || "") === branchId;
  const dayTickets = data.tickets.filter(
    (ticket) =>
      ticket.saleDate.slice(0, 10) === date &&
      ticket.currency === analyticsCurrency &&
      inScope(ticket.branchId),
  );
  const dayVisas = data.visas.filter(
    (visa) =>
      visa.appDate.slice(0, 10) === date &&
      visa.currency === analyticsCurrency &&
      inScope(visa.branchId),
  );
  const dayCargo = data.cargo.filter(
    (item) =>
      item.dateIn.slice(0, 10) === date &&
      item.currency === analyticsCurrency &&
      String(item.status || "").toLowerCase() !== "cancelled" &&
      inScope(item.originBranchId),
  );
  const clientRevenue = new Map<string, number>();
  const addClientRevenue = (
    clientId: string | null | undefined,
    amount: number,
  ) => {
    const name = data.clients.find((client) => client.id === clientId)?.name;
    if (!name || !amount) return;
    clientRevenue.set(name, (clientRevenue.get(name) || 0) + amount);
  };
  dayTickets.forEach((ticket) =>
    addClientRevenue(
      ticket.clientId,
      (ticket.type === "Refund" ? -1 : 1) * (ticket.amount || 0),
    ),
  );
  dayVisas.forEach((visa) =>
    addClientRevenue(
      visa.clientId,
      (visa.type === "Refund" ? -1 : 1) * (visa.amount || 0),
    ),
  );
  dayCargo.forEach((item) =>
    addClientRevenue(
      item.payerClientId || item.senderClientId,
      (item.weight || 0) * (item.rate || 0),
    ),
  );
  const clientRevenueTotal = Array.from(clientRevenue.values())
    .filter((value) => value > 0)
    .reduce((sum, value) => sum + value, 0);
  const topClients = Array.from(clientRevenue.entries())
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const routeStats = new Map<string, { bookings: number; amount: number }>();
  dayTickets
    .filter((ticket) => ticket.type !== "Refund")
    .forEach((ticket) => {
      const key = String(ticket.route || "").trim();
      if (!key) return;
      const entry = routeStats.get(key) || { bookings: 0, amount: 0 };
      entry.bookings += 1;
      entry.amount += ticket.amount || 0;
      routeStats.set(key, entry);
    });
  const topRoutes = Array.from(routeStats.entries())
    .sort((a, b) => b[1].bookings - a[1].bookings)
    .slice(0, 5);

  // Closing checklist. Every line is a condition read from real records, so it
  // reports what the day has actually done rather than a list someone ticks.
  const dayCloses = data.closes.filter(
    (close) => close.date.slice(0, 10) === date && inScope(close.branchId),
  );
  const closingSteps: ClosingStep[] = [
    {
      label: "Opening balance carried",
      state: rows.some((row) => row.openingBalance > 0) ? "done" : "waiting",
    },
    {
      label: "Collections recorded",
      state: rows.some((row) => row.moneyReceived > 0) ? "done" : "waiting",
    },
    {
      label: "Expenses recorded",
      state: rows.some((row) => row.expenses > 0) ? "done" : "waiting",
    },
    {
      label: "Receivables collected",
      state: rows.some((row) => row.accountsReceivable > 0) ? "pending" : "done",
    },
    {
      label: "Payables settled",
      state: rows.some((row) => row.accountsPayable > 0) ? "pending" : "done",
    },
    {
      label: "Cash counted",
      state: dayCloses.length ? "done" : "pending",
      at: dayCloses[0]?.closedAt,
    },
    {
      label: "Count reviewed by owner",
      state: !dayCloses.length
        ? "waiting"
        : dayCloses.every((close) => close.reviewed)
          ? "done"
          : "pending",
    },
    {
      label: "Business day closed",
      state:
        rows.length && rows.every((row) => row.state === "closed")
          ? "done"
          : "pending",
    },
  ];
  const stepsDone = closingSteps.filter((step) => step.state === "done").length;

  const clockTime = (value?: string) => {
    if (!value) return "";
    const stamp = new Date(value);
    if (Number.isNaN(stamp.getTime())) return "";
    return stamp
      .toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: settings.timezone,
      })
      .toUpperCase();
  };
  const timeline = data.activities
    .filter((activity) => activity.at.slice(0, 10) === date)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 8);
  // Names the dot colour only. Deliberately not "tone-*": those are global
  // classes that also paint a background, which tinted the whole timeline row.
  const timelineTone = (activity: Activity) => {
    const text = `${activity.action} ${activity.entity}`.toLowerCase();
    if (/payment|collect|receipt/.test(text)) return "green";
    if (/expense|payable|supplier/.test(text)) return "orange";
    if (/delete|void|reopen|cancel/.test(text)) return "red";
    if (/summary|close|balance/.test(text)) return "blue";
    return "violet";
  };

  const states = new Set(rows.map((row) => row.state));
  const stateLabel = states.has("live")
    ? "Live / In Progress"
    : states.has("scheduled")
      ? "Scheduled"
      : "Closed Automatically";
  const correct = async (row: DailySummaryRow, sharedReason?: string) => {
    const reason =
      sharedReason ??
      window.prompt("Reason for recalculating this historical summary");
    if (!reason?.trim()) return false;
    const response = await fetch(
      `/api/daily-close/summary/${encodeURIComponent(row.id)}/correct`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      notify(payload.error || "Daily summary could not be corrected");
      return false;
    }
    if (!sharedReason) {
      setRefresh((value) => value + 1);
      notify("Daily summary corrected with audit history");
    }
    return true;
  };
  // Recalculates every branch and currency on screen under one audit reason.
  const recalculateDay = async () => {
    const closed = rows.filter((row) => row.state === "closed" && row.version);
    if (!closed.length) return;
    const reason = window.prompt("Reason for recalculating this business day");
    if (!reason?.trim()) return;
    let done = 0;
    for (const row of closed) if (await correct(row, reason)) done += 1;
    setRefresh((value) => value + 1);
    notify(
      `Recalculated ${done} of ${closed.length} summaries with audit history`,
    );
  };
  const exportSummary = () => {
    if (!rows.length) return;
    downloadCsv(`macruf-daily-summary-${date}.csv`, [
      [
        "Business date",
        "Branch",
        "Currency",
        "Opening balance",
        "Revenue",
        "Closed amount",
        "Expenses",
        "Direct cost",
        "Profit",
        "Accounts receivable",
        "Accounts payable",
        "Expected closing",
        "Status",
      ],
      ...rows.map((row) => [
        row.businessDate,
        row.branch,
        row.currency,
        row.openingBalance,
        row.revenue,
        row.closedAmount,
        row.expenses,
        row.directCost,
        row.profit,
        row.accountsReceivable,
        row.accountsPayable,
        row.expectedClosing,
        row.state,
      ]),
    ]);
  };

  // Same icon language as the Business Day by Branch rows: money coming in
  // points up, money going out points down, and each metric keeps the colour
  // it has everywhere else in the system.
  const kpiCards = [
    { field: "openingBalance", label: "Opening Balance", icon: "wallet", tone: "blue", foot: "Money held at day start" },
    { field: "revenue", label: "Total Revenue", icon: "trend", tone: "cyan", foot: "Charged today" },
    { field: "closedAmount", label: "Closed Amount", icon: "money", tone: "green", foot: "All money held at close" },
    { field: "expenses", label: "Total Expenses", icon: "download", tone: "orange", foot: "Paid out today" },
    { field: "profit", label: "Total Profit", icon: "trend", tone: "violet", foot: "Revenue less cost" },
    { field: "accountsReceivable", label: "Accounts Receivable", icon: "clock", tone: "red", foot: "Owed by customers" },
    { field: "accountsPayable", label: "Accounts Payable", icon: "briefcase", tone: "pink", foot: "Owed to suppliers" },
    { field: "expectedClosing", label: "Expected Closing", icon: "database", tone: "blue", foot: "After debts settle" },
  ] as const;
  const openCard = kpiCards.find((card) => card.field === openMetric);
  // Panel titles read "(Today)" as the design does, but name the day instead
  // whenever a past business date is being reviewed.
  const dayTag =
    date === today()
      ? "Today"
      : new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });

  return (
    <>
      <PageHeader
        eyebrow="Automatic business-day reporting"
        title="Daily Summary"
        icon="calendar"
        detail={`Business-day reporting and daily closing · ${settings.businessDayStart}–${settings.businessDayEnd} ${settings.timezone}`}
      />
      <div className="ds-layout">
        <div className="ds-main">
          <div className="daily-summary-filters">
            <Field label="Business Date">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field label="Branch">
              <select
                disabled={Boolean(lockedBranchId)}
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.target.value);
                  setCurrency("");
                }}
              >
                {!lockedBranchId && <option value="">All branches</option>}
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                <option value="">All currencies</option>
                {currencies.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </Field>
            <div className="ds-filter-actions">
              <Badge tone={states.has("live") ? "success" : "blue"}>
                {stateLabel}
              </Badge>
              <button
                type="button"
                className="text-button ds-export"
                onClick={exportSummary}
                disabled={!rows.length}
              >
                <Icon name="download" size={16} /> Export Summary
              </button>
            </div>
          </div>
          {error ? (
            <Empty title="Daily summary unavailable" detail={error} />
          ) : loading ? (
            <Empty
              title="Loading daily summary"
              detail="Calculating the selected business day from MongoDB records."
            />
          ) : rows.length ? (
            <>
              <section className="daily-summary-kpis metrics-grid">
                {kpiCards.map((card) => {
                  const delta = deltaFor(card.field);
                  const open = openMetric === card.field;
                  return (
                    <div
                      className={`metric-card card-hover${open ? " is-open" : ""}`}
                      key={card.field}
                    >
                      <div className={`metric-icon tone-${card.tone}`}>
                        <Icon name={card.icon} size={22} />
                      </div>
                      <div className="metric-main">
                        <span className="eyebrow-soft">{card.label}</span>
                        <div className="metric-values">{metric(card.field)}</div>
                        <div className="metric-foot">
                          {delta && (
                            <span
                              className={delta.up ? "positive" : "negative"}
                            >
                              {`${delta.up ? "↑" : "↓"} ${Math.abs(delta.percent).toFixed(1)}%`}
                            </span>
                          )}
                          <span>
                            {delta
                              ? // The comparison is read in one currency, so it
                                // is named whenever the card shows more than one.
                                `vs Yesterday${currencyCodes.length > 1 ? ` (${analyticsCurrency})` : ""}`
                              : card.foot}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ds-kpi-more"
                        aria-expanded={open}
                        aria-label={`${open ? "Hide" : "Show"} ${card.label} by branch`}
                        onClick={() => setOpenMetric(open ? "" : card.field)}
                      >
                        <Icon name="chevron" size={15} />
                      </button>
                    </div>
                  );
                })}
              </section>

              {openCard && (
                <Panel
                  className="ds-kpi-detail"
                  title={`${openCard.label} by branch`}
                  subtitle={`${date} · ${openCard.foot}`}
                  actions={
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setOpenMetric("")}
                    >
                      Hide
                    </button>
                  }
                >
                  <TableShell>
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>Currency</th>
                        <th>{openCard.label}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={`${row.branchId}-${row.currency}-detail`}>
                          <td>
                            <strong><BranchName data={data} branch={row.branch} /></strong>
                          </td>
                          <td>{row.currency}</td>
                          <td>
                            {money(
                              (row[openCard.field] as number) || 0,
                              row.currency,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                </Panel>
              )}

              <div className="ds-charts">
                <Panel
                  title={`Revenue by Service (${dayTag})`}
                  actions={
                    go && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => go("reports")}
                      >
                        View Report
                      </button>
                    )
                  }
                >
                  {serviceSegments.length ? (
                    <Donut
                      total={money(serviceRevenueTotal, analyticsCurrency)}
                      centerLabel="Total Revenue"
                      segments={serviceSegments}
                      detailed
                    />
                  ) : (
                    <Empty
                      title="No service revenue"
                      detail="Service revenue appears once the day records activity."
                    />
                  )}
                </Panel>
                <Panel
                  title="Collections vs Expenses"
                  actions={
                    go && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => go("reports")}
                      >
                        View Report
                      </button>
                    )
                  }
                >
                  {flowHasValues ? (
                    <GroupedBars
                      labels={flowRows.map((row) => row.label)}
                      series={[
                        {
                          name: `Collections (${analyticsCurrency})`,
                          color: "#0b66e3",
                          values: flowRows.map((row) => row.collections),
                        },
                        {
                          name: `Expenses (${analyticsCurrency})`,
                          color: "#f59e0b",
                          values: flowRows.map((row) => row.expenses),
                        },
                      ]}
                      axisLabel={`Collections against expenses in ${analyticsCurrency}`}
                    />
                  ) : (
                    <Empty
                      title="No money movement"
                      detail="Collections and expenses appear here as they are recorded."
                    />
                  )}
                </Panel>
                <Panel
                  title={`Branch Performance (${dayTag})`}
                  actions={
                    go && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => go("reports")}
                      >
                        View Report
                      </button>
                    )
                  }
                >
                  <TableShell>
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>Revenue</th>
                        <th>Profit</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchPerformance.map((entry) => {
                        const move = entry.before
                          ? ((entry.revenue - entry.before) /
                              Math.abs(entry.before)) *
                            100
                          : null;
                        return (
                          <tr key={`${entry.branch}-${entry.currency}`}>
                            <td>
                              <strong>
                                <BranchName data={data} branch={entry.branch} />
                              </strong>
                              <small>{entry.currency}</small>
                            </td>
                            <td>{amount(entry.revenue)}</td>
                            <td className={entry.profit < 0 ? "negative" : ""}>
                              {amount(entry.profit)}
                            </td>
                            <td
                              className={
                                move === null
                                  ? ""
                                  : move >= 0
                                    ? "positive"
                                    : "negative"
                              }
                            >
                              {move === null
                                ? "—"
                                : `${move >= 0 ? "▲" : "▼"} ${Math.abs(move).toFixed(1)}%`}
                            </td>
                          </tr>
                        );
                      })}
                      {performanceTotals.map((total) => (
                        <tr className="ds-total-row" key={total.currency}>
                          <td>Total {total.currency}</td>
                          <td>{amount(total.revenue)}</td>
                          <td>{amount(total.profit)}</td>
                          <td />
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                </Panel>
              </div>

              <div className="ds-charts">
                <Panel
                  title={`Payment Method Breakdown (${dayTag})`}
                >
                  {methodSegments.length ? (
                    <Donut
                      total={money(methodReceivedTotal, analyticsCurrency)}
                      centerLabel="Total Received"
                      segments={methodSegments}
                      detailed
                    />
                  ) : (
                    <Empty
                      title="No payments yet"
                      detail="Collections appear here as payments are recorded."
                    />
                  )}
                </Panel>
                <Panel
                  title="Top Clients (By Revenue)"
                  actions={
                    go && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => go("clients")}
                      >
                        View All
                      </button>
                    )
                  }
                >
                  {topClients.length ? (
                    <div className="ds-rank-list">
                      {topClients.map(([name, value]) => (
                        <div className="ds-rank-row" key={name}>
                          <span className="ds-avatar" aria-hidden="true">
                            {name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part.charAt(0).toUpperCase())
                              .join("")}
                          </span>
                          <span className="ds-rank-name">{name}</span>
                          <b>{money(value, analyticsCurrency)}</b>
                          <em>
                            {clientRevenueTotal
                              ? `${((value / clientRevenueTotal) * 100).toFixed(1)}%`
                              : "—"}
                          </em>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="No client revenue"
                      detail="Clients appear here once the day records a sale against them."
                    />
                  )}
                </Panel>
                <Panel
                  title="Top Routes (By Bookings)"
                  actions={
                    go && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => go("tickets")}
                      >
                        View All
                      </button>
                    )
                  }
                >
                  {topRoutes.length ? (
                    <div className="ds-rank-list">
                      {topRoutes.map(([route, entry]) => (
                        <div className="ds-rank-row" key={route}>
                          <span className="ds-route-icon" aria-hidden="true">
                            <Icon name="route" size={14} />
                          </span>
                          <span className="ds-rank-name">
                            {routeLegs(route).map((leg, index) => (
                              <span key={`${leg}-${index}`}>
                                {index > 0 && (
                                  <i className="ds-route-arrow" aria-hidden="true">
                                    →
                                  </i>
                                )}
                                {leg}
                              </span>
                            ))}
                          </span>
                          <em>
                            {entry.bookings}{" "}
                            {entry.bookings === 1 ? "Booking" : "Bookings"}
                          </em>
                          <b>{money(entry.amount, analyticsCurrency)}</b>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="No routes yet"
                      detail="Routes appear here once tickets are sold on this business day."
                    />
                  )}
                </Panel>
              </div>

              <Panel
                title="Business Day by Branch"
                subtitle="KPI cards for every branch and currency in the selected day"
              >
                <div className="branch-report-group">
                  {Object.values(
                    rows.reduce<Record<string, { branch: string; rows: typeof rows }>>(
                      (groups, row) => {
                        const bucket = (groups[row.branchId] ??= {
                          branch: row.branch,
                          rows: [],
                        });
                        bucket.rows.push(row);
                        return groups;
                      },
                      {},
                    ),
                  ).map((group) => (
                    <div key={group.branch} className="branch-report">
                      <h4 className="branch-report-title">
                        <BranchName data={data} branch={group.branch} />
                      </h4>
                      <div className="service-kpi-grid">
                        {group.rows.map((row) => (
                          <article
                            key={`${row.branchId}-${row.currency}`}
                            className="metric-card card-hover service-kpi"
                          >
                            <div
                              className={`metric-icon tone-${
                                row.profit < 0 ? "red" : "green"
                              }`}
                            >
                              <Icon name="wallet" size={22} />
                            </div>
                            <div className="metric-main">
                              <span className="eyebrow-soft">
                                {row.currency} · Business Day
                              </span>
                              <strong>{money(row.revenue, row.currency)}</strong>
                              <span className="service-kpi-caption">Revenue</span>
                              <dl className="service-kpi-stats">
                                <div>
                                  <dt>Money Received</dt>
                                  <dd className="is-profit">
                                    {money(row.moneyReceived, row.currency)}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Direct Cost</dt>
                                  <dd>{money(row.directCost, row.currency)}</dd>
                                </div>
                                <div>
                                  <dt>Profit</dt>
                                  <dd
                                    className={
                                      row.profit < 0 ? "is-loss" : "is-profit"
                                    }
                                  >
                                    {money(row.profit, row.currency)}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Expenses</dt>
                                  <dd>{money(row.expenses, row.currency)}</dd>
                                </div>
                                <div>
                                  <dt>Customer Debt</dt>
                                  <dd>
                                    {money(
                                      row.accountsReceivable,
                                      row.currency,
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Payables</dt>
                                  <dd>
                                    {money(row.accountsPayable, row.currency)}
                                  </dd>
                                </div>
                              </dl>
                              <div className="service-kpi-footer">
                                <Badge
                                  tone={
                                    row.state === "live" ? "success" : "blue"
                                  }
                                >
                                  {row.state === "closed"
                                    ? "Closed Automatically"
                                    : row.state}
                                </Badge>
                                {user.role === "owner" &&
                                  row.state === "closed" &&
                                  row.version && (
                                    <button
                                      className="text-button"
                                      onClick={() => void correct(row)}
                                    >
                                      Recalculate
                                    </button>
                                  )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <div className="daily-summary-details">
                <Panel
                  title="Revenue by Service"
                  subtitle="KPI cards per branch, currency and service"
                >
                  <div className="branch-report-group">
                    {Object.values(
                      rows.reduce<Record<string, { branch: string; rows: typeof rows }>>(
                        (groups, row) => {
                          const bucket = (groups[row.branchId] ??= {
                            branch: row.branch,
                            rows: [],
                          });
                          bucket.rows.push(row);
                          return groups;
                        },
                        {},
                      ),
                    ).map((group) => (
                      <div key={group.branch} className="branch-report">
                        <h4 className="branch-report-title">
                          <BranchName data={data} branch={group.branch} />
                        </h4>
                        <div className="service-kpi-grid">
                          {group.rows.flatMap((row) =>
                            row.revenueByService.map((service) => (
                              <ServiceKpiCard
                                key={`${row.branchId}-${row.currency}-${service.service}`}
                                currency={row.currency}
                                service={service.service}
                                transactions={service.transactions}
                                revenue={money(service.revenue, row.currency)}
                                directCost={money(
                                  service.directCost,
                                  row.currency,
                                )}
                                profit={money(service.profit, row.currency)}
                                customerDebt={money(
                                  service.accountsReceivable,
                                  row.currency,
                                )}
                              />
                            )),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel
                  title="Payments by Method"
                  subtitle="KPI cards from opening float to closing balance"
                >
                  <div className="branch-report-group">
                    {Object.values(
                      rows.reduce<Record<string, { branch: string; rows: typeof rows }>>(
                        (groups, row) => {
                          const bucket = (groups[row.branchId] ??= {
                            branch: row.branch,
                            rows: [],
                          });
                          bucket.rows.push(row);
                          return groups;
                        },
                        {},
                      ),
                    ).map((group) => (
                      <div key={group.branch} className="branch-report">
                        <h4 className="branch-report-title">
                          <BranchName data={data} branch={group.branch} />
                        </h4>
                        <div className="service-kpi-grid">
                          {group.rows.flatMap((row) =>
                            row.paymentsByMethod.map((method) => (
                              <MethodKpiCard
                                key={`${row.branchId}-${row.currency}-${method.paymentMethodId}`}
                                currency={row.currency}
                                method={method.paymentMethod}
                                closing={money(method.closing, row.currency)}
                                opening={money(method.opening, row.currency)}
                                received={money(method.received, row.currency)}
                                refunds={money(method.refunds, row.currency)}
                                expenses={money(method.expenses, row.currency)}
                                payablesPaid={money(
                                  method.supplierPaid,
                                  row.currency,
                                )}
                              />
                            )),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </>
          ) : (
            <Empty
              title="No daily summary"
              detail="No active branch and currency configuration matches this selection."
            />
          )}
        </div>

        <aside className="ds-rail">
          <section className="panel ds-checklist">
            <div className="panel-head">
              <div>
                <h3>Daily Closing Checklist</h3>
              </div>
              <div>
                <span className="ds-progress-count">
                  {stepsDone} / {closingSteps.length} Completed
                </span>
              </div>
            </div>
            <div
              className="ds-progress"
              role="progressbar"
              aria-valuenow={stepsDone}
              aria-valuemin={0}
              aria-valuemax={closingSteps.length}
            >
              <i style={{ width: `${(stepsDone / closingSteps.length) * 100}%` }} />
            </div>
            <ul className="ds-check-list">
              {closingSteps.map((step) => (
                <li key={step.label} className={`is-${step.state}`}>
                  <span className="ds-check-box" aria-hidden="true">
                    <Icon name="check" size={12} />
                  </span>
                  <span className="ds-check-label">{step.label}</span>
                  {step.at && <time>{clockTime(step.at)}</time>}
                  <span className="ds-check-state" aria-hidden="true">
                    {step.state === "done" ? (
                      <Icon name="check" size={15} />
                    ) : step.state === "pending" ? (
                      <Icon name="clock" size={15} />
                    ) : (
                      <Icon name="more" size={15} />
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="ds-checklist-foot">
              {user.role === "owner" &&
              rows.some((row) => row.state === "closed" && row.version) ? (
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => void recalculateDay()}
                >
                  Recalculate Day
                </button>
              ) : (
                <span>
                  {stepsDone === closingSteps.length
                    ? "Every closing step is complete."
                    : "Outstanding steps clear themselves as the day is recorded."}
                </span>
              )}
            </div>
          </section>

          <section className="panel ds-timeline-panel">
            <div className="panel-head">
              <div>
                <h3>{dayTag === "Today" ? "Today's" : `${dayTag}`} Activity Timeline</h3>
              </div>
              {go && (
                <div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => go("activity")}
                  >
                    View All
                  </button>
                </div>
              )}
            </div>
            {timeline.length ? (
              <ol className="ds-timeline">
                {timeline.map((activity) => (
                  <li
                    key={activity.id}
                    className={`ds-dot-${timelineTone(activity)}`}
                  >
                    <time>{clockTime(activity.at)}</time>
                    <span className="ds-timeline-action">
                      {activity.action}
                    </span>
                    <span className="ds-timeline-actor">
                      {activity.userName || "System"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty
                title="No activity yet"
                detail="Actions recorded on this business day appear here."
              />
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

export function LegacyDailyClose({
  data,
  user,
  save,
  notify,
  replaceData,
}: ModuleProps) {
  const userBranch = branchForUser(data, user);
  const roleOffice = officeForRole(user.role) || userBranch?.name || null;
  const canCreate =
    user.role === "owner" ||
    user.role === "operator" ||
    !!officeForRole(user.role);
  const canReview = user.role === "owner";
  const [editing, setEditing] = useState<DailyClose | null | undefined>();
  const rows = data.closes
    .filter((x) => !roleOffice || x.office === roleOffice)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <PageHeader
        eyebrow="Reconciliation"
        title="Daily close"
        detail={
          roleOffice
            ? `Reconcile ${roleOffice} money by method and currency. You cannot see the other office.`
            : "Review reconciliations across all branches."
        }
        actions={
          canCreate && (
            <button className="button primary" onClick={() => setEditing(null)}>
              <Icon name="plus" /> New Daily Close
            </button>
          )
        }
      />
      {rows.length ? (
        <div className="close-grid">
          {rows.map((x) => {
            const diff =
              x.difference ?? x.actuallyCounted - (x.expectedBalance || 0);
            return (
              <article className="close-card" key={x.id}>
                <header>
                  <div>
                    <BranchBadge data={data} office={x.office} />
                    <h3>{dateLabel(x.date)}</h3>
                    <p>
                      {x.paymentMethod} · {x.currency}
                    </p>
                  </div>
                  <span
                    className={`difference ${Math.abs(diff) < 0.01 ? "balanced" : "off"}`}
                  >
                    {Math.abs(diff) < 0.01
                      ? "Balanced"
                      : `${diff > 0 ? "+" : ""}${money(diff, x.currency)}`}
                  </span>
                </header>
                <div className="close-numbers">
                  <div>
                    <span>Opening</span>
                    <strong>{money(x.openingBalance || 0, x.currency)}</strong>
                  </div>
                  <div>
                    <span>Money in</span>
                    <strong>
                      {money(x.totalCollections || 0, x.currency)}
                    </strong>
                  </div>
                  <div>
                    <span>Expenses + refunds</span>
                    <strong>
                      {money(
                        (x.totalExpenses || 0) + (x.totalRefunds || 0),
                        x.currency,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Counted</span>
                    <strong>{money(x.actuallyCounted, x.currency)}</strong>
                  </div>
                </div>
                <footer>
                  <span>
                    {x.reviewed ? (
                      <>
                        <b>✓</b> Reviewed by {x.reviewedBy}
                      </>
                    ) : (
                      "Awaiting review"
                    )}
                  </span>
                  <div>
                    {canReview && !x.reviewed && (
                      <button
                        className="text-button"
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `/api/daily-close/${x.id}/review`,
                              { method: "POST" },
                            );
                            const payload = await response.json();
                            if (!response.ok) {
                              throw new Error(
                                payload.error ||
                                  "Daily close could not be reviewed",
                              );
                            }
                            replaceData?.(payload.data);
                            notify("Daily close reviewed");
                          } catch (error) {
                            notify(
                              error instanceof Error
                                ? error.message
                                : "Daily close could not be reviewed",
                            );
                          }
                        }}
                      >
                        Mark reviewed
                      </button>
                    )}
                    {canCreate && x.status === "reopened" && (
                      <button
                        className="icon-button"
                        onClick={() => setEditing(x)}
                        title="Edit reopened close"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                    )}
                    {user.role === "owner" && x.status !== "reopened" && (
                      <button
                        className="text-button"
                        onClick={async () => {
                          const reason = window.prompt(
                            "Reason for reopening this daily close",
                          );
                          if (!reason?.trim()) return;
                          try {
                            const response = await fetch(
                              `/api/daily-close/${x.id}/reopen`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ reason }),
                              },
                            );
                            const payload = await response.json();
                            if (!response.ok) {
                              throw new Error(
                                payload.error ||
                                  "Daily close could not be reopened",
                              );
                            }
                            replaceData?.(payload.data);
                            notify("Daily close reopened");
                          } catch (error) {
                            notify(
                              error instanceof Error
                                ? error.message
                                : "Daily close could not be reopened",
                            );
                          }
                        }}
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title="No daily closes"
          detail="Create the first reconciliation for a payment method and currency."
        />
      )}
      {editing !== undefined && (
        <CloseForm
          current={editing}
          data={data}
          user={user}
          onClose={() => setEditing(undefined)}
          onSave={(r) => {
            save(
              (d) => ({
                ...d,
                closes: editing
                  ? [...d.closes.filter((x) => x.id !== editing.id), r]
                  : [r, ...d.closes],
              }),
              {
                entity: "Daily close",
                detail: `${editing ? "Updated" : "Created"} ${r.office} close for ${r.date}`,
              },
            );
            setEditing(undefined);
            notify("Daily close saved");
          }}
        />
      )}
    </>
  );
}
function CloseForm({
  current,
  data,
  user,
  onClose,
  onSave,
}: {
  current: DailyClose | null;
  data: AgencyData;
  user: User;
  onClose: () => void;
  onSave: (r: DailyClose) => void;
}) {
  const branches = branchOptions(data, user);
  const initialBranchId = current?.branchId || branches[0]?.id || "";
  const initialBranch = branchById(data, initialBranchId);
  const initialCurrency =
    current?.currency ||
    initialBranch?.defaultCurrency ||
    branchCurrencies(initialBranch)[0];
  const initialMethod =
    current?.paymentMethod ||
    paymentMethodsFor(data, initialBranchId, initialCurrency)[0] ||
    ("Bank" as PaymentMethod);
  const locked = user.role === "operator";
  const [f, setF] = useState({
    date: current?.date || today(),
    branchId: initialBranchId,
    office: current?.office || initialBranch?.name || "",
    paymentMethod: initialMethod,
    currency: initialCurrency,
    actuallyCounted: String(current?.actuallyCounted || ""),
    notes: current?.notes || "",
  });
  const [metrics, setMetrics] = useState({
    openingBalance: current?.openingBalance || 0,
    totalCollections: current?.totalCollections || 0,
    totalExpenses: current?.totalExpenses || 0,
    totalRefunds: current?.totalRefunds || 0,
    expectedBalance: current?.expectedBalance || 0,
  });
  const [metricsError, setMetricsError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const query = new URLSearchParams({
          branchId: f.branchId,
          currency: f.currency,
          paymentMethod: f.paymentMethod,
          date: f.date,
        });
        const response = await fetch(`/api/daily-close/preview?${query}`);
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error || "Reconciliation could not be calculated",
          );
        if (active) {
          setMetrics(payload.metrics);
          setMetricsError("");
        }
      } catch (error) {
        if (active)
          setMetricsError(
            error instanceof Error
              ? error.message
              : "Reconciliation could not be calculated",
          );
      }
    };
    if (f.branchId && f.currency && f.paymentMethod && f.date) void load();
    return () => {
      active = false;
    };
  }, [f.branchId, f.currency, f.paymentMethod, f.date]);
  const diff = (Number(f.actuallyCounted) || 0) - metrics.expectedBalance;
  return (
    <Modal
      title={current ? "Edit Daily Close" : "Create Daily Close"}
      subtitle="Payments, refunds, and expenses are calculated by the secure ledger."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: current?.id || uid("close"),
            date: f.date,
            branchId: f.branchId,
            office: f.office as Office,
            paymentMethod: f.paymentMethod as PaymentMethod,
            currency: f.currency as Currency,
            actuallyCounted: Number(f.actuallyCounted),
            countedBy: current?.countedBy || user.name,
            checkedBy: current?.checkedBy || "",
            notes: f.notes,
            reviewed: current?.reviewed || false,
            reviewedBy: current?.reviewedBy || "",
          });
        }}
      >
        <div className="form-grid">
          <Field label="Date">
            <input
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <Field label="Branch">
            <BranchSelect
              options={branches}
              disabled={locked}
              value={f.branchId}
              onChange={(e) => {
                const branchId = e.target.value;
                const branch = branchById(data, branchId);
                const currency =
                  branch?.defaultCurrency || branchCurrencies(branch)[0];
                setF({
                  ...f,
                  branchId,
                  office: branch?.name || "",
                  currency,
                  paymentMethod:
                    paymentMethodsFor(data, branchId, currency)[0] ||
                    ("Bank" as PaymentMethod),
                });
              }}
            />
          </Field>
          <Field label="Payment method">
            <select
              value={f.paymentMethod}
              onChange={(e) =>
                setF({ ...f, paymentMethod: e.target.value as PaymentMethod })
              }
            >
              {paymentMethodsFor(data, f.branchId, f.currency).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <select
              value={f.currency}
              onChange={(e) =>
                setF({ ...f, currency: e.target.value as Currency })
              }
            >
              {branchCurrencies(branchById(data, f.branchId)).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
        </div>
        {metricsError && <p className="form-error">{metricsError}</p>}
        <div className="reconcile-panel">
          <div>
            <span>Opening balance</span>
            <strong>
              {money(metrics.openingBalance, f.currency as Currency)}
            </strong>
          </div>
          <div>
            <span>Collections</span>
            <strong>
              {money(metrics.totalCollections, f.currency as Currency)}
            </strong>
          </div>
          <div>
            <span>Refunds</span>
            <strong>
              - {money(metrics.totalRefunds, f.currency as Currency)}
            </strong>
          </div>
          <div>
            <span>Paid expenses</span>
            <strong>
              - {money(metrics.totalExpenses, f.currency as Currency)}
            </strong>
          </div>
          <div>
            <span>Net movement</span>
            <strong>
              {money(
                metrics.totalCollections -
                  metrics.totalRefunds -
                  metrics.totalExpenses,
                f.currency as Currency,
              )}
            </strong>
          </div>
          <div className="should">
            <span>Expected balance</span>
            <strong>
              {money(metrics.expectedBalance, f.currency as Currency)}
            </strong>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Actually counted">
            <input
              required
              type="number"
              step="0.01"
              value={f.actuallyCounted}
              onChange={(e) => setF({ ...f, actuallyCounted: e.target.value })}
            />
          </Field>
          <Field label="Difference">
            <div
              className={`readonly-value ${Math.abs(diff) < 0.01 ? "good" : "bad"}`}
            >
              {money(diff, f.currency as Currency)}
            </div>
          </Field>
          <Field label="Notes" wide>
            <textarea
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={!!metricsError}>
            {current ? "Save Changes" : "Create Daily Close"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Expenses({ data, user, save, notify, scopeBranchId }: ModuleProps) {
  const userBranch = branchForUser(data, user);
  const roleOffice = officeForRole(user.role) || userBranch?.name || null;
  const branches = branchOptions(data, user);
  const canWrite =
    user.role === "owner" ||
    user.role === "operator" ||
    !!officeForRole(user.role);
  const financial = user.role === "owner" || user.role === "consultant";
  // Deleting is owner-only; operators create and correct, never remove.
  const canDelete = user.role === "owner";
  const [editing, setEditing] = useState<Expense | null | undefined>();
  const [query, setQuery] = useState("");
  const [office, setOffice] = useState(roleOffice || "All");
  // Follow the global branch scope chosen in the top bar.
  useBranchScope(scopeBranchId, (id) =>
    setOffice(id ? branchName(data, id, "All") : roleOffice || "All"),
  );
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [currency, setCurrency] = useState("");
  const [status, setStatus] = useState("active");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rows = data.expenses.filter(
    (x) =>
      (office === "All" || x.office === office) &&
      (!category || x.category === category) &&
      (!paymentMethod || x.paymentMethod === paymentMethod) &&
      (!currency || x.currency === currency) &&
      (status === "all" || (x.recordStatus || "active") === status) &&
      (!from || x.date >= from) &&
      (!to || x.date <= to) &&
      `${x.category} ${x.description} ${x.paidBy}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const activeExpenseRows = rows.filter((expense) => (expense.recordStatus || "active") !== "void");
  const categoryTotals = Object.entries(
    activeExpenseRows.reduce<Record<string, number>>((totals, expense) => {
      totals[expense.category || "Other"] = (totals[expense.category || "Other"] || 0) + expense.amount;
      return totals;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const expenseAmountTotal = categoryTotals.reduce((total, entry) => total + entry[1], 0);
  const expensePalette = ["#0b66e3", "#16a34a", "#7c3aed", "#f59e0b", "#2daec4"];
  const expenseSegments = (categoryTotals.length ? categoryTotals.slice(0, 5) : [["No expenses", 0] as [string, number]]).map((entry, index) => ({
    value: expenseAmountTotal ? (entry[1] / expenseAmountTotal) * 100 : 0,
    color: expensePalette[index % expensePalette.length],
    label: entry[0],
    amount: new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(entry[1]),
  }));
  const expenseMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: date.toLocaleString("en", { month: "short" }),
      value: activeExpenseRows.filter((expense) => monthKey(expense.date) === key).reduce((total, expense) => total + expense.amount, 0),
    };
  });
  const expenseByBranch = activeBranches(data).map((branch) => ({
    name: branch.name,
    value: activeExpenseRows.filter((expense) => expense.branchId === branch.id || expense.office === branch.name).reduce((total, expense) => total + expense.amount, 0),
  }));
  const largestBranchExpense = Math.max(...expenseByBranch.map((branch) => branch.value), 1);
  return (
    <>
      <PageHeader
        eyebrow="Money out"
        title="Expenses"
        detail={
          financial
            ? "Review payments out of all branches and their profit-and-loss treatment."
            : `Log and review ${roleOffice} till payments only.`
        }
        actions={
          canWrite && (
            <button className="button primary" onClick={() => setEditing(null)}>
              <Icon name="plus" /> New Expense
            </button>
          )
        }
      />
      <div className="metrics-grid">
        <MetricCard icon="wallet" label="Total Expenses" value={moneyByCurrency(activeExpenseRows, (expense) => expense.currency, (expense) => expense.amount)} tone="blue" foot="Selected filters" />
        <MetricCard icon="check" label="Paid Expenses" value={moneyByCurrency(activeExpenseRows.filter((expense) => expense.paid), (expense) => expense.currency, (expense) => expense.amount)} tone="green" foot="Payment completed" />
        <MetricCard icon="clock" label="Pending Payment" value={moneyByCurrency(activeExpenseRows.filter((expense) => !expense.paid), (expense) => expense.currency, (expense) => expense.amount)} tone="orange" foot="Still outstanding" />
        <MetricCard icon="briefcase" label="Most Used Category" value={categoryTotals[0]?.[0] || "No expenses"} tone="violet" foot={categoryTotals[0] ? new Intl.NumberFormat("en-KE").format(categoryTotals[0][1]) : "No recorded amount"} />
      </div>
      <div className="split-3" style={{ marginTop: 14 }}>
        <Panel title="Expenses by Category"><Donut total={String(activeExpenseRows.length)} centerLabel="Records" segments={expenseSegments} /></Panel>
        <Panel title="Monthly Expense Trend"><BarChart values={expenseMonths.map((item) => item.value)} labels={expenseMonths.map((item) => item.label)} /></Panel>
        <Panel title="Expenses by Branch"><div className="stack">{expenseByBranch.map((branch) => <div key={branch.name}><div className="branch-expense-label"><strong><BranchName data={data} branch={branch.name} /></strong><span>{new Intl.NumberFormat("en-KE").format(branch.value)}</span></div><div className="progress"><i style={{ width: `${(branch.value / largestBranchExpense) * 100}%` }} /></div></div>)}</div></Panel>
      </div>
      <Toolbar
        query={query}
        setQuery={setQuery}
        office={office}
        setOffice={setOffice}
        branches={branches}
        allowAll={!roleOffice}
      />
      <div className="expense-filters">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Expense category"
        >
          <option value="">All categories</option>
          {Array.from(new Set(data.expenses.map((x) => x.category)))
            .filter(Boolean)
            .sort()
            .map((value) => (
              <option key={value}>{value}</option>
            ))}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          aria-label="Payment method"
        >
          <option value="">All payment methods</option>
          {data.paymentMethods
            .filter((method) => method.isActive)
            .map((method) => (
              <option key={method.id}>{method.name}</option>
            ))}
        </select>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          aria-label="Currency"
        >
          <option value="">All currencies</option>
          <option>KES</option>
          <option>USD</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Expense status"
        >
          <option value="active">Active</option>
          <option value="void">Voided</option>
          <option value="all">All statuses</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To date"
        />
      </div>
      {rows.length ? (
        <TableShell>
          <thead>
            <tr>
              <th>Date</th>
              <th>Office</th>
              <th>Category</th>
              <th>Description</th>
              <th>Payment</th>
              <th>Amount</th>
              <th>Status</th>
              {financial && <th>P&amp;L</th>}
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>{dateLabel(x.date)}</td>
                <td>
                  <BranchBadge data={data} office={x.office} />
                </td>
                <td>{x.category}</td>
                <td>
                  {x.description}
                  <small>{x.notes}</small>
                </td>
                <td>
                  {x.paymentMethod}
                  <small>{x.paid ? "Paid" : "Unpaid"}</small>
                </td>
                <td>{money(x.amount, x.currency)}</td>
                <td>
                  <Badge
                    tone={x.recordStatus === "void" ? "danger" : "success"}
                  >
                    {x.recordStatus === "void" ? "Voided" : "Active"}
                  </Badge>
                  {x.voidReason && <small>{x.voidReason}</small>}
                </td>
                {financial && (
                  <td>{x.inProfitLoss ? "Included" : "Excluded"}</td>
                )}
                {canWrite && x.recordStatus !== "void" && (
                  <td>
                    <Actions
                      onEdit={() => setEditing(x)}
                      onDelete={
                        canDelete
                          ? () => {
                              const reason = window.prompt(
                                "Reason for voiding this expense",
                              );
                              if (!reason?.trim()) return;
                              void save(
                                (d) => ({
                                  ...d,
                                  expenses: d.expenses.filter(
                                    (y) => y.id !== x.id,
                                  ),
                                }),
                                {
                                  entity: "Expense",
                                  detail: `Voided ${x.description}: ${reason.trim()}`,
                                },
                              );
                              notify("Expense voided");
                            }
                          : undefined
                      }
                    />
                  </td>
                )}
                {canWrite && x.recordStatus === "void" && <td />}
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : (
        <Empty
          title="No expenses"
          detail="Log money paid out for rent, supplier payments, transport and other costs."
        />
      )}
      {editing !== undefined && (
        <ExpenseForm
          current={editing}
          data={data}
          user={user}
          onClose={() => setEditing(undefined)}
          onSave={(r) => {
            save(
              (d) => ({
                ...d,
                expenses: editing
                  ? [...d.expenses.filter((x) => x.id !== editing.id), r]
                  : [r, ...d.expenses],
              }),
              {
                entity: "Expense",
                detail: `${editing ? "Updated" : "Created"} ${r.description}`,
              },
            );
            setEditing(undefined);
            notify(
              `Expense ${editing ? "updated" : "created"}: ${r.description || "expense"}`,
            );
          }}
        />
      )}
    </>
  );
}
function ExpenseForm({
  current,
  data,
  user,
  onClose,
  onSave,
}: {
  current: Expense | null;
  data: AgencyData;
  user: User;
  onClose: () => void;
  onSave: (r: Expense) => void;
}) {
  const branches = branchOptions(data, user);
  const roleOffice = officeForRole(user.role);
  const initialBranchId =
    current?.branchId ||
    branchIdForOffice(data, current?.office || roleOffice) ||
    branches[0]?.id ||
    "";
  const initialBranch = branchById(data, initialBranchId);
  const initialCurrency =
    current?.currency ||
    initialBranch?.defaultCurrency ||
    branchCurrencies(initialBranch)[0];
  const initialPaymentMethod =
    current?.paymentMethod ||
    paymentMethodsFor(data, initialBranchId, initialCurrency)[0] ||
    ("Bank" as PaymentMethod);
  const locked = user.role === "operator" || Boolean(roleOffice);
  const [f, setF] = useState({
    date: current?.date || today(),
    branchId: initialBranchId,
    office:
      current?.office || initialBranch?.name || roleOffice || ("" as Office),
    category: current?.category || "Other",
    description: current?.description || "",
    currency: initialCurrency,
    amount: String(current?.amount || ""),
    paymentMethod: initialPaymentMethod,
    inProfitLoss: current?.inProfitLoss ?? true,
    notes: current?.notes || "",
  });
  return (
    <Modal
      title={current ? "Edit Expense" : "Create Expense"}
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: current?.id || uid("exp"),
            date: f.date,
            branchId: f.branchId,
            office: f.office as Office,
            category: f.category,
            description: f.description,
            currency: f.currency as Currency,
            amount: Number(f.amount),
            paymentMethod: f.paymentMethod as PaymentMethod,
            inProfitLoss: f.inProfitLoss,
            paid: true,
            paidBy: user.name,
            notes: f.notes,
            createdBy: current?.createdBy || user.id,
          });
        }}
      >
        <div className="form-grid">
          <Field label="Date">
            <input
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <Field label="Branch">
            <BranchSelect
              options={branches}
              disabled={locked}
              value={f.branchId}
              onChange={(e) => {
                const branchId = e.target.value;
                const branch = branchById(data, branchId);
                const currency =
                  branch?.defaultCurrency || branchCurrencies(branch)[0];
                const paymentMethod =
                  paymentMethodsFor(data, branchId, currency)[0] ||
                  ("Bank" as PaymentMethod);
                setF({
                  ...f,
                  branchId,
                  office: branch?.name || "",
                  currency,
                  paymentMethod,
                });
              }}
            />
          </Field>
          <Field label="Category">
            <select
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value })}
            >
              {[
                "Rent",
                "Salaries",
                "Utilities",
                "Licences",
                "Supplier Payment",
                "Transport",
                "Marketing",
                "Bank/Deposit",
                "Owner Drawing",
                "Other",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input
              required
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <select
              value={f.currency}
              onChange={(e) => {
                const currency = e.target.value as Currency;
                setF({
                  ...f,
                  currency,
                  paymentMethod:
                    paymentMethodsFor(data, f.branchId, currency)[0] ||
                    ("Bank" as PaymentMethod),
                });
              }}
            >
              {branchCurrencies(branchById(data, f.branchId)).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Amount">
            <input
              required
              min="0"
              type="number"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
          <Field label="Payment method">
            <select
              value={f.paymentMethod}
              onChange={(e) =>
                setF({ ...f, paymentMethod: e.target.value as PaymentMethod })
              }
            >
              {paymentMethodsFor(data, f.branchId, f.currency).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          {user.role === "owner" && (
            <Field label="Profit & loss">
              <label className="check">
                <input
                  type="checkbox"
                  checked={f.inProfitLoss}
                  onChange={(e) =>
                    setF({ ...f, inProfitLoss: e.target.checked })
                  }
                />
                <span>Include in P&amp;L</span>
              </label>
            </Field>
          )}
          <Field label="Notes" wide>
            <textarea
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">
            {current ? "Save Changes" : "Create Expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Suppliers({ data, user, save, notify, replaceData }: ModuleProps) {
  const canWrite = user.role === "owner";
  const [editing, setEditing] = useState<Supplier | null | undefined>();
  const [paying, setPaying] = useState<Supplier | null>(null);
  const [branchFilter, setBranchFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const bills = data.suppliers.filter(
    (bill) =>
      (!branchFilter || bill.branchId === branchFilter) &&
      (!currencyFilter || bill.currency === currencyFilter) &&
      (statusFilter === "all" ||
        (bill.recordStatus || "active") === statusFilter),
  );
  const paidFor = (bill: Supplier) =>
    data.supplierPayments
      .filter(
        (payment) =>
          payment.supplierBillId === bill.id && payment.status !== "void",
      )
      .reduce((sum, payment) => sum + payment.amount, 0);
  const balanceFor = (bill: Supplier) =>
    Math.max(0, bill.billed - paidFor(bill));
  const totals = (currency: Currency) =>
    data.suppliers
      .filter((x) => x.currency === currency && x.recordStatus !== "cancelled")
      .reduce((sum, bill) => sum + balanceFor(bill), 0);
  return (
    <>
      <PageHeader
        eyebrow="Accounts payable"
        title="Accounts Payable"
        detail="Track amounts billed, paid, due and outstanding to airlines and consolidators."
        actions={
          canWrite && (
            <button className="button primary" onClick={() => setEditing(null)}>
              <Icon name="plus" /> New Payable
            </button>
          )
        }
      />
      <div className="metrics-grid payable-metrics">
        <MetricCard icon="money" label="Outstanding (KES)" value={money(totals("KES"), "KES")} tone="cyan" foot="Current balance" />
        <MetricCard icon="money" label="Outstanding (USD)" value={money(totals("USD"), "USD")} tone="violet" foot="Current balance" />
        <MetricCard icon="receipt" label="Open Bills" value={data.suppliers.filter((x) => x.recordStatus !== "cancelled" && balanceFor(x) > 0).length} tone="orange" foot="Awaiting settlement" />
      </div>
      <Panel className="filter-panel">
      <div className="payable-filters">
        <select
          value={branchFilter}
          onChange={(event) => setBranchFilter(event.target.value)}
          aria-label="Payable branch"
        >
          <option value="">All branches</option>
          {activeBranches(data).map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select
          value={currencyFilter}
          onChange={(event) => setCurrencyFilter(event.target.value)}
          aria-label="Payable currency"
        >
          <option value="">All currencies</option>
          <option>KES</option>
          <option>USD</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Payable status"
        >
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All statuses</option>
        </select>
      </div>
      </Panel>
      {bills.length ? (
        <Panel title="Payables" actions={<StatusBadge tone="blue">Live</StatusBadge>}>
        <TableShell>
          <thead>
            <tr>
              <th>Date</th>
              <th>Branch</th>
              <th>Payable to</th>
              <th>Description</th>
              <th>Due</th>
              <th>Billed</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {bills.map((x) => {
              const paid = paidFor(x);
              const b = balanceFor(x);
              return (
                <tr key={x.id}>
                  <td>{dateLabel(x.date)}</td>
                  <td><BranchName data={data} branch={branchName(data, x.branchId, "Unassigned")} /></td>
                  <td>
                    <strong>{x.supplier}</strong>
                  </td>
                  <td>{x.description}</td>
                  <td>{dateLabel(x.dueDate)}</td>
                  <td>{money(x.billed, x.currency)}</td>
                  <td>{money(paid, x.currency)}</td>
                  <td className={b > 0 ? "negative" : "positive"}>
                    {money(b, x.currency)}
                  </td>
                  <td>
                    <Badge
                      tone={
                        b <= 0 ? "success" : paid > 0 ? "warning" : "danger"
                      }
                    >
                      {b <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid"}
                    </Badge>
                  </td>
                  {canWrite && (
                    <td>
                      <div className="row-actions">
                        {b > 0 && x.recordStatus !== "cancelled" && (
                          <button type="button" onClick={() => setPaying(x)}>
                            Pay
                          </button>
                        )}
                        {x.recordStatus !== "cancelled" && (
                          <Actions
                            onEdit={() => setEditing(x)}
                            onDelete={() => {
                              const reason = window.prompt(
                                "Reason for cancelling this payable",
                              );
                              if (!reason?.trim()) return;
                              void save(
                                (d) => ({
                                  ...d,
                                  suppliers: d.suppliers.filter(
                                    (y) => y.id !== x.id,
                                  ),
                                }),
                                {
                                  entity: "Supplier",
                                  detail: `Cancelled ${x.supplier} bill: ${reason.trim()}`,
                                },
                              );
                              notify("Payable cancelled");
                            }}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableShell>
        </Panel>
      ) : (
        <Empty
          title="No payables"
          detail="Ticket costs and other unpaid obligations will appear here until settled."
        />
      )}
      {editing !== undefined && (
        <SupplierForm
          current={editing}
          data={data}
          user={user}
          onClose={() => setEditing(undefined)}
          onSave={(r) => {
            save(
              (d) => ({
                ...d,
                suppliers: editing
                  ? [...d.suppliers.filter((x) => x.id !== editing.id), r]
                  : [r, ...d.suppliers],
              }),
              {
                entity: "Supplier",
                detail: `${editing ? "Updated" : "Added"} ${r.supplier} bill`,
              },
            );
            setEditing(undefined);
            notify(
              `${r.supplier} bill ${editing ? "updated" : "added"}`,
            );
          }}
        />
      )}
      {paying && (
        <PayablePaymentForm
          bill={paying}
          data={data}
          onClose={() => setPaying(null)}
          onSaved={(next) => replaceData?.(next)}
          notify={notify}
        />
      )}
    </>
  );
}
function SupplierForm({
  current,
  data,
  user,
  onClose,
  onSave,
}: {
  current: Supplier | null;
  data: AgencyData;
  user: User;
  onClose: () => void;
  onSave: (r: Supplier) => void;
}) {
  const branches = branchOptions(data, user);
  const [f, setF] = useState({
    date: current?.date || today(),
    supplier: current?.supplier || "",
    branchId: current?.branchId || branches[0]?.id || "",
    reference: current?.reference || "",
    description: current?.description || "",
    currency: current?.currency || ("USD" as Currency),
    billed: String(current?.billed || ""),
    paid: String(current?.paid || ""),
    dueDate: current?.dueDate || "",
    notes: current?.notes || "",
  });
  return (
    <Modal
      title={current ? "Edit Payable" : "Create Payable"}
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: current?.id || uid("sup"),
            date: f.date,
            branchId: f.branchId,
            reference: f.reference.trim(),
            supplier: f.supplier,
            description: f.description,
            currency: f.currency as Currency,
            billed: Number(f.billed),
            paid: Number(f.paid) || 0,
            dueDate: f.dueDate,
            notes: f.notes,
          });
        }}
      >
        <div className="form-grid">
          <Field label="Branch">
            <BranchSelect
              options={branches}
              required
              value={f.branchId}
              onChange={(event) => {
                const branchId = event.target.value;
                const branch = branchById(data, branchId);
                setF({
                  ...f,
                  branchId,
                  currency:
                    branch?.defaultCurrency || branchCurrencies(branch)[0],
                });
              }}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <Field label="Payable to / provider">
            <input
              required
              value={f.supplier}
              onChange={(e) => setF({ ...f, supplier: e.target.value })}
            />
          </Field>
          <Field label="Bill reference">
            <input
              value={f.reference}
              onChange={(event) =>
                setF({ ...f, reference: event.target.value })
              }
            />
          </Field>
          <Field label="Description / reference" wide>
            <input
              required
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <select
              value={f.currency}
              onChange={(e) =>
                setF({ ...f, currency: e.target.value as Currency })
              }
            >
              {branchCurrencies(branchById(data, f.branchId)).map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </Field>
          <Field label="Amount owed">
            <input
              required
              type="number"
              min="0"
              value={f.billed}
              onChange={(e) => setF({ ...f, billed: e.target.value })}
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={f.dueDate}
              onChange={(e) => setF({ ...f, dueDate: e.target.value })}
            />
          </Field>
          <Field label="Notes" wide>
            <textarea
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">
            {current ? "Save Changes" : "Create Payable"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function clientStats(data: AgencyData, client: Client) {
  const ids = [client.id].filter(Boolean).map(String);
  const phoneKeys = [client.normalizedPhone, client.phone]
    .filter(Boolean)
    .map(String);
  const tickets = data.tickets.filter(
    (x) =>
      (x.clientId && ids.includes(String(x.clientId))) ||
      phoneKeys.includes(String(x.normalizedPhone || x.phone)),
  );
  const cargo = data.cargo.filter(
    (x) =>
      (x.senderClientId && ids.includes(String(x.senderClientId))) ||
      (x.receiverClientId && ids.includes(String(x.receiverClientId))) ||
      phoneKeys.includes(String(x.senderNormalizedPhone || x.senderPhone)) ||
      phoneKeys.includes(String(x.receiverNormalizedPhone || x.receiverPhone)),
  );
  const visas = data.visas.filter(
    (x) =>
      (x.clientId && ids.includes(String(x.clientId))) ||
      phoneKeys.includes(String(x.normalizedPhone || x.phone)),
  );
  const spend = (c: Currency) =>
    tickets.filter((x) => x.currency === c).reduce((s, x) => s + x.amount, 0) +
    cargo
      .filter((x) => x.currency === c)
      .reduce((s, x) => s + x.weight * x.rate, 0) +
    visas.filter((x) => x.currency === c).reduce((s, x) => s + x.amount, 0);
  const dates = [
    ...tickets.map((x) => x.saleDate),
    ...cargo.map((x) => x.dateIn),
    ...visas.map((x) => x.appDate),
  ].sort();
  return {
    tickets: tickets.length,
    cargo: cargo.length,
    visas: visas.length,
    spendKES: spend("KES"),
    spendUSD: spend("USD"),
    last: dates.at(-1) || "",
  };
}
function PayablePaymentForm({
  bill,
  data,
  onClose,
  onSaved,
  notify,
}: {
  bill: Supplier;
  data: AgencyData;
  onClose: () => void;
  onSaved: (data: AgencyData) => void;
  notify: (message: string) => void;
}) {
  const alreadyPaid = data.supplierPayments
    .filter(
      (payment) =>
        payment.supplierBillId === bill.id && payment.status !== "void",
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
  const balance = Math.max(0, bill.billed - alreadyPaid);
  const methods = paymentMethodsFor(data, bill.branchId || "", bill.currency);
  const [form, setForm] = useState({
    amount: String(balance || ""),
    paymentDate: today(),
    paymentMethod: methods[0] || ("Bank" as PaymentMethod),
    reference: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/payments/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierBillId: bill.id,
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        reference: form.reference,
        notes: form.notes,
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok)
      return notify(result.error || "Payable payment could not be recorded");
    onSaved(result.data);
    notify("Payable payment recorded");
    onClose();
  };
  return (
    <Modal
      title="Record Payable Payment"
      subtitle={`${bill.supplier} · Remaining ${money(balance, bill.currency)}`}
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Amount paid">
            <input
              required
              min="0.01"
              max={balance}
              step="0.01"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Payment date">
            <input
              required
              type="date"
              value={form.paymentDate}
              onChange={(e) =>
                setForm({ ...form, paymentDate: e.target.value })
              }
            />
          </Field>
          <Field label="Payment method">
            <select
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({
                  ...form,
                  paymentMethod: e.target.value as PaymentMethod,
                })
              }
            >
              {methods.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </Field>
          <Field label="Reference">
            <input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Bank or mobile reference"
            />
          </Field>
          <Field label="Notes" wide>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={
              busy || Number(form.amount) <= 0 || Number(form.amount) > balance
            }
            className="button primary"
          >
            {busy ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Clients({ data, user, save, notify }: ModuleProps) {
  const financial = user.role === "owner" || user.role === "consultant";
  const canWrite = user.role !== "consultant";
  // Deleting is owner-only; operators create and correct, never remove.
  const canDelete = user.role === "owner";
  const [editing, setEditing] = useState<Client | null | undefined>();
  const [viewing, setViewing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [history, setHistory] = useState<{
    tickets: Ticket[];
    visas: Visa[];
    cargo: Cargo[];
  } | null>(null);
  const [query, setQuery] = useState("");
  const rows = data.clients.filter((x) =>
    `${x.name} ${x.phone} ${x.normalizedPhone || ""} ${x.email || ""} ${x.type}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const clientSummaries = rows.map((client) => clientStats(data, client));
  const activeClientCount = clientSummaries.filter((summary) => summary.last).length;
  const corporateCount = rows.filter((client) => client.type === "Corporate").length;
  const individualCount = rows.length - corporateCount;
  const lifetimeKes = clientSummaries.reduce((total, summary) => total + summary.spendKES, 0);
  const lifetimeUsd = clientSummaries.reduce((total, summary) => total + summary.spendUSD, 0);
  const openBalances = history && viewing
    ? [
        ...history.tickets
          .filter((item) => item.type !== "Refund")
          .map((item) => ({ currency: item.currency, balance: item.balance || 0 })),
        ...history.visas
          .filter((item) => item.type !== "Refund")
          .map((item) => ({ currency: item.currency, balance: item.balance || 0 })),
        ...history.cargo
          .filter(
            (item) => String(item.payerClientId || "") === String(viewing.id),
          )
          .map((item) => ({ currency: item.currency, balance: item.balance || 0 })),
      ].reduce<Record<string, number>>((totals, item) => {
        totals[item.currency] =
          (totals[item.currency] || 0) + Math.max(0, item.balance);
        return totals;
      }, {})
    : {};
  const openClient = async (client: Client) => {
    setViewing(client);
    setHistory(null);
    const response = await fetch(
      `/api/clients/${encodeURIComponent(client.id)}/history`,
      { cache: "no-store" },
    );
    const payload = await response.json();
    if (response.ok)
      setHistory({
        tickets: payload.tickets || [],
        visas: payload.visas || [],
        cargo: payload.cargo || [],
      });
    else notify(payload.error || "Client history could not be loaded");
  };
  const download = () => {
    const headers = [
      "Client name",
      "Phone",
      "Email",
      "Home office",
      "Type",
      "Tickets",
      "Cargo",
      "Visas",
      "Last activity",
      ...(financial ? ["Spend KES", "Spend USD"] : []),
    ];
    const exportRows = data.clients.map((client) => {
      const stats = clientStats(data, client);
      return [
        client.name,
        client.phone,
        client.email || "",
        client.homeOffice,
        client.type,
        stats.tickets,
        stats.cargo,
        stats.visas,
        dateLabel(stats.last),
        ...(financial ? [stats.spendKES, stats.spendUSD] : []),
      ];
    });
    downloadCsv(`macruf-clients-${today()}.csv`, [headers, ...exportRows]);
    notify("Client list downloaded");
  };
  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Clients Registry"
        detail={
          financial
            ? "Clients are added automatically from tickets, cargo and visas; download the full relationship record anytime."
            : "Clients are added automatically from service records. Agency-wide spend remains protected."
        }
        actions={
          <div className="button-row">
            <button className="button secondary" onClick={download}>
              Download clients
            </button>
            {canWrite && (
              <button
                className="button primary"
                onClick={() => setEditing(null)}
              >
                <Icon name="plus" /> New Client
              </button>
            )}
          </div>
        }
      />
      <div className="toolbar">
        <label className="search-box">
          <Icon name="search" size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
          />
        </label>
      </div>
      <div className="metrics-grid five">
        <MetricCard icon="users" label="Total Clients" value={rows.length} tone="blue" foot="Current directory" />
        <MetricCard icon="user" label="Active Clients" value={activeClientCount} tone="green" foot="With service activity" />
        <MetricCard icon="building" label="Corporate Clients" value={`${corporateCount} (${rows.length ? Math.round((corporateCount / rows.length) * 100) : 0}%)`} tone="violet" foot="Registered companies" />
        <MetricCard icon="user" label="Individual Clients" value={`${individualCount} (${rows.length ? Math.round((individualCount / rows.length) * 100) : 0}%)`} tone="orange" foot="Personal accounts" />
        <MetricCard icon="wallet" label="Lifetime Spend" value={`${money(lifetimeKes, "KES")} / ${money(lifetimeUsd, "USD")}`} tone="cyan" foot="All services" />
      </div>
      {rows.length ? (
        <Panel title="Client Directory" actions={<StatusBadge tone="blue">Live</StatusBadge>}>
        <TableShell>
          <thead>
            <tr>
              <th>Client</th>
              <th>Home office</th>
              <th>Type</th>
              <th>Tickets</th>
              <th>Cargo</th>
              <th>Visas</th>
              {financial && (
                <>
                  <th>Spend KES</th>
                  <th>Spend USD</th>
                </>
              )}
              <th>Last activity</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const s = clientStats(data, x);
              return (
                <tr key={x.id}>
                  <td>
                    <strong>{x.name}</strong>
                    <small>
                      {x.phone}
                      {x.normalizedPhone ? ` · ${x.normalizedPhone}` : ""}
                      {x.email ? ` · ${x.email}` : ""}
                    </small>
                  </td>
                  <td>
                    <BranchBadge data={data} office={x.homeOffice} />
                  </td>
                  <td>{x.type}</td>
                  <td>{s.tickets}</td>
                  <td>{s.cargo}</td>
                  <td>{s.visas}</td>
                  {financial && (
                    <>
                      <td>{money(s.spendKES, "KES")}</td>
                      <td>{money(s.spendUSD, "USD")}</td>
                    </>
                  )}
                  <td>{dateLabel(s.last)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        aria-label="View client"
                        onClick={() => void openClient(x)}
                      >
                        <Icon name="eye" size={16} />
                      </button>
                      {canWrite && (
                        <>
                          <button
                            aria-label="Edit"
                            onClick={() => setEditing(x)}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          {canDelete && (
                            <button
                              aria-label="Delete"
                              onClick={() => setDeleting(x)}
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
        </Panel>
      ) : (
        <Empty
          title="No clients yet"
          detail="Create a ticket, cargo shipment or visa case with a phone number; the client will appear here automatically."
        />
      )}
      {editing !== undefined && (
        <ClientForm
          current={editing}
          data={data}
          user={user}
          onClose={() => setEditing(undefined)}
          onSave={(r) => {
            save(
              (d) => ({
                ...d,
                clients: editing
                  ? [...d.clients.filter((x) => x.id !== editing.id), r]
                  : [r, ...d.clients],
              }),
              {
                entity: "Client",
                detail: `${editing ? "Updated" : "Added"} ${r.name}`,
              },
            );
            setEditing(undefined);
            notify(`Client ${r.name} ${editing ? "updated" : "added"}`);
          }}
        />
      )}
      {viewing && (
        <Modal
          title={viewing.name}
          subtitle={`${viewing.phone}${viewing.email ? ` · ${viewing.email}` : ""} · ${viewing.preferredLanguage === "en" ? "English" : "Somali"}`}
          onClose={() => setViewing(null)}
        >
          {history ? (
            <div>
              <section className="mini-kpis">
                <div>
                  <span>Tickets</span>
                  <strong>{history.tickets.length}</strong>
                </div>
                <div>
                  <span>Visas</span>
                  <strong>{history.visas.length}</strong>
                </div>
                <div>
                  <span>Cargo</span>
                  <strong>{history.cargo.length}</strong>
                </div>
                {financial &&
                  Object.entries(openBalances).map(([currency, balance]) => (
                    <div key={currency}>
                      <span>{currency} Outstanding</span>
                      <strong>{money(balance, currency as Currency)}</strong>
                    </div>
                  ))}
              </section>
              <TableShell>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Branch/route</th>
                    <th>Status</th>
                    {financial && <th>Remaining Balance</th>}
                  </tr>
                </thead>
                <tbody>
                  {history.tickets.map((x) => (
                    <tr key={x.id}>
                      <td>Ticket</td>
                      <td>{x.ref}</td>
                      <td>{dateLabel(x.saleDate)}</td>
                      <td>
                        <BranchBadge data={data} office={x.office} />
                      </td>
                      <td>{x.type}</td>
                      {financial && (
                        <td>{money(x.balance || 0, x.currency)}</td>
                      )}
                    </tr>
                  ))}
                  {history.visas.map((x) => (
                    <tr key={x.id}>
                      <td>Visa</td>
                      <td>{x.ref}</td>
                      <td>{dateLabel(x.appDate)}</td>
                      <td>
                        <BranchBadge data={data} office={x.office} />
                      </td>
                      <td>{x.status}</td>
                      {financial && (
                        <td>{money(x.balance || 0, x.currency)}</td>
                      )}
                    </tr>
                  ))}
                  {history.cargo.map((x) => (
                    <tr key={x.id}>
                      <td>Cargo</td>
                      <td>{x.tracking}</td>
                      <td>{dateLabel(x.dateIn)}</td>
                      <td>
                        {x.origin} to {x.destination}
                      </td>
                      <td>{x.status}</td>
                      {financial && (
                        <td>{money(x.balance || 0, x.currency)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
          ) : (
            <p>Loading activity...</p>
          )}
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Delete client?"
          detail={`${deleting.name} will be removed from the client registry. This action cannot be undone.`}
          confirmLabel="Delete Client"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            save(
              (d) => ({
                ...d,
                clients: d.clients.filter((x) => x.id !== deleting.id),
              }),
              {
                entity: "Client",
                detail: `Deleted ${deleting.name}`,
              },
            );
            setDeleting(null);
            notify("Client deleted");
          }}
        />
      )}
    </>
  );
}
function ClientForm({
  current,
  data,
  user,
  onClose,
  onSave,
}: {
  current: Client | null;
  data: AgencyData;
  user: User;
  onClose: () => void;
  onSave: (r: Client) => void;
}) {
  const branches = branchOptions(data, user);
  const initialBranchId =
    current?.homeBranchId ||
    branchIdForOffice(data, current?.homeOffice) ||
    branches[0]?.id ||
    "";
  const [f, setF] = useState({
    name: current?.name || "",
    phone: current?.phone || "",
    email: current?.email || "",
    homeBranchId: initialBranchId,
    homeOffice:
      current?.homeOffice ||
      branchName(data, initialBranchId, "") ||
      ("" as Office),
    preferredLanguage: (current?.preferredLanguage || "so") as "so" | "en",
    type: current?.type || "Individual",
    notes: current?.notes || "",
  });
  return (
    <Modal
      title={current ? "Edit Client" : "Create Client"}
      subtitle="Phone is the matching key for activity; email enables status notifications."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: current?.id || uid("client"),
            name: f.name,
            phone: f.phone,
            email: f.email.trim(),
            homeBranchId: f.homeBranchId,
            homeOffice: f.homeOffice as Office,
            preferredLanguage: f.preferredLanguage,
            type: f.type as Client["type"],
            notes: f.notes,
          });
        }}
      >
        <div className="form-grid">
          <Field label="Client name">
            <input
              required
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </Field>
          <Field label="Phone number">
            <input
              required
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              placeholder="client@example.com"
            />
          </Field>
          <Field label="Home branch">
            <BranchSelect
              options={branches}
              value={f.homeBranchId}
              disabled={user.role === "operator"}
              onChange={(e) => {
                const homeBranchId = e.target.value;
                setF({
                  ...f,
                  homeBranchId,
                  homeOffice: branchName(data, homeBranchId, ""),
                });
              }}
            />
          </Field>
          <Field label="Preferred language">
            <select
              value={f.preferredLanguage}
              onChange={(e) =>
                setF({ ...f, preferredLanguage: e.target.value as "so" | "en" })
              }
            >
              <option value="so">Somali</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Client type">
            <select
              value={f.type}
              onChange={(e) =>
                setF({ ...f, type: e.target.value as Client["type"] })
              }
            >
              <option>Trader</option>
              <option>Diaspora</option>
              <option>Corporate</option>
              <option>Individual</option>
            </select>
          </Field>
          <Field label="Notes" wide>
            <textarea
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">
            {current ? "Save Changes" : "Create Client"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Receipt({ data }: { data: AgencyData }) {
  const [ref, setRef] = useState("");
  const ticket = data.tickets.find(
    (x) => x.ref.toLowerCase() === ref.trim().toLowerCase(),
  );
  const visa = data.visas.find(
    (x) => x.ref.toLowerCase() === ref.trim().toLowerCase(),
  );
  const cargo = data.cargo.find(
    (x) => x.tracking.toLowerCase() === ref.trim().toLowerCase(),
  );
  const item = ticket
    ? {
        ref: ticket.ref,
        date: ticket.saleDate,
        client: ticket.passenger,
        description: `Flight ${ticket.route}${ticket.airlinePnr ? ` · ${ticket.airlinePnr}` : ""}`,
        amount: ticket.amount,
        cost: ticket.cost,
        profit: ticket.amount - ticket.cost,
        currency: ticket.currency,
        method: ticket.paymentMethod,
        paymentStatus: ticket.paymentStatus || (ticket.paid ? "paid" : "unpaid"),
        amountPaid: ticket.amountPaid || 0,
        balance: ticket.balance ?? Math.max(0, ticket.amount - (ticket.amountPaid || 0)),
        branch: ticket.office,
        status: ticket.status || "booked",
        served: ticket.servedBy,
        notes: ticket.notes,
      }
    : visa
      ? {
          ref: visa.ref,
          date: visa.appDate,
          client: visa.applicant,
          description: `${visa.visaType} visa · ${visa.destination}`,
          amount: visa.amount,
          cost: visa.cost,
          profit: visa.amount - visa.cost,
          currency: visa.currency,
          method: visa.paymentMethod,
          paymentStatus: visa.paymentStatus || (visa.paid ? "paid" : "unpaid"),
          amountPaid: visa.amountPaid || 0,
          balance: visa.balance ?? Math.max(0, visa.amount - (visa.amountPaid || 0)),
          branch: visa.office,
          status: visa.status,
          served: visa.servedBy,
          notes: visa.notes,
        }
      : cargo
        ? {
            ref: cargo.tracking,
            date: cargo.dateIn,
            client: cargo.sender,
            description: `Cargo ${cargo.origin} → ${cargo.destination} · ${cargo.weight} kg @ ${money(cargo.rate, cargo.currency)} / kg`,
            amount: cargo.customerCharge ?? cargo.weight * cargo.rate,
            cost: cargo.cost,
            profit:
              (cargo.customerCharge ?? cargo.weight * cargo.rate) -
              (cargo.cost || 0),
            currency: cargo.currency,
            method: cargo.paymentMethod,
            paymentStatus: cargo.paymentStatus || (cargo.paid ? "paid" : "unpaid"),
            amountPaid: cargo.amountPaid || 0,
            balance:
              cargo.balance ??
              Math.max(
                0,
                (cargo.customerCharge ?? cargo.weight * cargo.rate) -
                  (cargo.amountPaid || 0),
              ),
            branch: cargo.paidByOffice,
            status: cargoStatusLabel(cargo.status),
            served:
              data.users.find((u) => u.id === cargo.createdBy)?.name ||
              "Agency team",
            notes: cargo.notes,
          }
        : null;
  /**
   * The receipt PDF is the receipt itself, not a transcription of it. The
   * hand-rolled PDF writer used elsewhere can only place Helvetica text, so
   * it produced a plain list with no logo, flag, colour or alignment. Printing
   * the styled card instead means the saved PDF is exactly what is on screen.
   * The document title becomes the suggested filename in the save dialog.
   */
  const download = () => {
    if (!item) return;
    const previousTitle = document.title;
    document.title = `receipt-${item.ref}`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
    // Safari and some Android browsers never fire afterprint.
    setTimeout(restore, 60000);
  };
  const downloadTextCopy = () => {
    if (!item) return;
    downloadPdf(`receipt-${item.ref}.pdf`, data.agencyName, [
      `OFFICIAL RECEIPT - ${item.ref}`,
      "",
      `Date: ${dateLabel(item.date)}`,
      `Client: ${item.client}`,
      `Service: ${item.description}`,
      `Branch: ${item.branch}`,
      `Sale price: ${money(item.amount, item.currency)}`,
      ...(item.cost !== undefined
        ? [`Agency cost: ${money(item.cost, item.currency)}`]
        : []),
      `Profit: ${money(item.profit, item.currency)}`,
      `Payment status: ${item.paymentStatus}`,
      `Payment method: ${item.method}`,
      `Paid: ${money(item.amountPaid, item.currency)}`,
      `Balance: ${money(item.balance, item.currency)}`,
      `Service status: ${item.status}`,
      ...(item.notes ? [`Notes: ${item.notes}`] : []),
      "",
      `Served by: ${item.served}`,
      "Thank you for your business.",
    ]);
  };
  return (
    <>
      <PageHeader
        eyebrow="Client document"
        title="Receipt Builder"
        detail="Find any ticket, visa or cargo transaction, then print it or download a PDF receipt."
      />
      <div className="receipt-layout">
        <section className="panel lookup-panel">
          <h2>Find a transaction</h2>
          <p>References are generated when records are created.</p>
          <label className="lookup-input">
            <Icon name="search" />
            <input
              autoFocus
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="TKT-N-… / VIS-M-… / NBO-…"
            />
          </label>
          {ref && !item && (
            <p className="form-error">No matching record found.</p>
          )}
          <div className="lookup-help">
            <strong>Accepted records</strong>
            <span>Ticket booking reference</span>
            <span>Visa application reference</span>
            <span>Cargo tracking number</span>
          </div>
        </section>
        <section className={`receipt-card ${item ? "ready" : "empty-receipt"}`}>
          {item ? (
            <>
              <header>
                <BrandLogo className="receipt-brand-logo" />
                <div>
                  <h2>{data.agencyName}</h2>
                  <p>Nairobi · Mogadishu</p>
                </div>
                <Badge tone="success">Receipt</Badge>
              </header>
              <div className="receipt-ref">
                <span>Receipt number</span>
                <strong>{item.ref}</strong>
              </div>
              <dl>
                <div>
                  <dt>Date</dt>
                  <dd>{dateLabel(item.date)}</dd>
                </div>
                <div>
                  <dt>Client</dt>
                  <dd>{item.client}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{item.description}</dd>
                </div>
                <div>
                  <dt>Branch</dt>
                  <dd>
                    <BranchName data={data} branch={item.branch} />
                  </dd>
                </div>
                <div>
                  <dt>Paid via</dt>
                  <dd>{item.method}</dd>
                </div>
                <div>
                  <dt>Payment status</dt>
                  <dd>{item.paymentStatus}</dd>
                </div>
                <div>
                  <dt>Service status</dt>
                  <dd>{item.status}</dd>
                </div>
              </dl>
              <div className="receipt-total">
                <span>Sale price</span>
                <strong>{money(item.amount, item.currency)}</strong>
              </div>
              <div className="receipt-finance-grid">
                {item.cost !== undefined && (
                  <div>
                    <span>Agency cost</span>
                    <strong>{money(item.cost, item.currency)}</strong>
                  </div>
                )}
                <div>
                  <span>Profit</span>
                  <strong className={item.profit < 0 ? "negative" : "positive"}>
                    {money(item.profit, item.currency)}
                  </strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>{money(item.amountPaid, item.currency)}</strong>
                </div>
                <div>
                  <span>Balance</span>
                  <strong>{money(item.balance, item.currency)}</strong>
                </div>
              </div>
              {item.notes && <p className="receipt-notes">{item.notes}</p>}
              <footer>
                <p>Thank you for your business.</p>
                <span>Served by {item.served}</span>
              </footer>
              <div className="receipt-actions print-hide">
                <button
                  className="button ghost"
                  onClick={downloadTextCopy}
                  title="Plain-text copy for systems that cannot open a styled PDF"
                >
                  <Icon name="file" /> Text copy
                </button>
                <button className="button primary" onClick={download}>
                  <Icon name="receipt" /> Download PDF
                </button>
              </div>
            </>
          ) : (
            <>
              <Icon name="receipt" size={42} />
              <h3>Your receipt will appear here</h3>
              <p>Search for a valid transaction reference to generate it.</p>
            </>
          )}
        </section>
      </div>
    </>
  );
}

function Tracking({
  data,
  user,
  notify,
}: {
  data: AgencyData;
  user: User;
  notify: (message: string) => void;
}) {
  const [kind, setKind] = useState<"cargo" | "visa">("cargo");
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);
  const cargo =
    kind === "cargo"
      ? data.cargo.find(
          (x) => x.tracking.toLowerCase() === q.trim().toLowerCase(),
        )
      : undefined;
  const visa =
    kind === "visa"
      ? data.visas.find((x) => x.ref.toLowerCase() === q.trim().toLowerCase())
      : undefined;
  const item = cargo || visa;
  const canShare = user.role !== "consultant";
  const switchKind = (next: "cargo" | "visa") => {
    setKind(next);
    setQ("");
  };
  const download = () => {
    if (cargo)
      downloadPdf(`cargo-status-${cargo.tracking}.pdf`, BRAND_NAME, [
        "CARGO STATUS UPDATE",
        "",
        `Tracking number: ${cargo.tracking}`,
        `Current status: ${cargo.status}`,
        `Route: ${cargo.origin} to ${cargo.destination}`,
        `Date received: ${dateLabel(cargo.dateIn)}`,
        `Sender: ${cargo.sender}`,
        `Receiver: ${cargo.receiver}`,
        `Contents: ${cargo.contents}`,
        `Weight: ${cargo.weight} kg`,
        cargo.dateDelivered
          ? `Date delivered: ${dateLabel(cargo.dateDelivered)}`
          : "",
        "",
        `Generated: ${new Date().toLocaleString("en-GB")}`,
        "WhatsApp: +252 61 563 3609",
        "Email: Macruuftravelcargo@gmail.com",
      ]);
    if (visa)
      downloadPdf(`visa-status-${visa.ref}.pdf`, BRAND_NAME, [
        "VISA APPLICATION STATUS UPDATE",
        "",
        `Application reference: ${visa.ref}`,
        `Current status: ${visa.status}`,
        `Applicant: ${visa.applicant}`,
        `Destination: ${visa.destination}`,
        `Application type: ${visa.visaType || "Visa application"}`,
        `Application date: ${dateLabel(visa.appDate)}`,
        `Office: ${visa.office}`,
        "",
        `Generated: ${new Date().toLocaleString("en-GB")}`,
        "WhatsApp: +252 61 563 3609",
        "Email: Macruuftravelcargo@gmail.com",
      ]);
  };
  const email = async () => {
    if (!item) return;
    setSending(true);
    const response = await fetch("/api/notifications/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id: item.id }),
    });
    const result = await response.json();
    setSending(false);
    notify(
      response.ok
        ? `Status emailed to ${result.recipient}`
        : result.error || "Status email could not be sent",
    );
  };
  const emailAddress = cargo?.senderEmail || visa?.email || "";
  return (
    <>
      <PageHeader
        eyebrow="Customer status centre"
        title="Cargo & Visa Tracking"
        detail="Find a live record, download a customer-ready PDF or email the latest status when an address is recorded."
      />
      <div className="status-kind-tabs">
        <button
          className={kind === "cargo" ? "active" : ""}
          onClick={() => switchKind("cargo")}
        >
          <Icon name="cargo" /> Cargo shipment
        </button>
        <button
          className={kind === "visa" ? "active" : ""}
          onClick={() => switchKind("visa")}
        >
          <Icon name="visa" /> Visa application
        </button>
      </div>
      <section className="tracking-card">
        <div className="tracking-search">
          <Icon name="search" size={22} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              kind === "cargo"
                ? "Enter NBO-… or MOG-…"
                : "Enter VIS-N-… or VIS-M-…"
            }
          />
        </div>
        {item ? (
          <div className="tracking-result">
            <header>
              <div>
                <p className="eyebrow">
                  {kind === "cargo"
                    ? "Tracking number"
                    : "Application reference"}
                </p>
                <h2>{cargo?.tracking || visa?.ref}</h2>
                <span>
                  {cargo
                    ? `${cargo.origin} → ${cargo.destination}`
                    : `${visa?.destination} · ${visa?.visaType || "Visa application"}`}
                </span>
              </div>
              <Badge
                tone={
                  cargo?.status === "Delivered" ||
                  visa?.status === "delivered" ||
                  visa?.status === "approved"
                    ? "success"
                    : cargo?.status === "Claim" || visa?.status === "refused"
                      ? "danger"
                      : cargo?.status === "Arrived"
                        ? "warning"
                        : "blue"
                }
              >
                {cargo?.status || serviceStatusLabel(visa?.status || "")}
              </Badge>
            </header>
            {cargo && (
              <>
                <div className="status-track">
                  {["In Transit", "Arrived", "Delivered"].map(
                    (stage, index) => {
                      const active =
                        cargo.status !== "Claim" &&
                        index <=
                          ["In Transit", "Arrived", "Delivered"].indexOf(
                            cargo.status,
                          );
                      return (
                        <div key={stage} className={active ? "active" : ""}>
                          <i>{active ? "✓" : index + 1}</i>
                          <span>{stage}</span>
                        </div>
                      );
                    },
                  )}
                </div>
                {cargo.status === "Claim" && (
                  <div className="claim-alert">
                    <strong>Claim opened</strong>
                    <span>Please contact the agency office for an update.</span>
                  </div>
                )}
                <div className="tracking-details">
                  <div>
                    <span>Received</span>
                    <strong>{dateLabel(cargo.dateIn)}</strong>
                  </div>
                  <div>
                    <span>Sender</span>
                    <strong>{cargo.sender}</strong>
                  </div>
                  <div>
                    <span>Receiver</span>
                    <strong>{cargo.receiver}</strong>
                  </div>
                  <div>
                    <span>Contents</span>
                    <strong>{cargo.contents}</strong>
                  </div>
                  <div>
                    <span>Weight</span>
                    <strong>{cargo.weight} kg</strong>
                  </div>
                  <div>
                    <span>Delivered</span>
                    <strong>{dateLabel(cargo.dateDelivered)}</strong>
                  </div>
                </div>
              </>
            )}
            {visa && (
              <>
                <div className="status-track visa-status-track">
                  {(["submitted", "approved", "delivered"] as const).map(
                    (stage, index) => {
                      const active =
                        visa.status !== "refused" &&
                        index <=
                          ["submitted", "approved", "delivered"].indexOf(
                            visa.status as
                              "submitted" | "approved" | "delivered",
                          );
                      return (
                        <div key={stage} className={active ? "active" : ""}>
                          <i>{active ? "✓" : index + 1}</i>
                          <span>{serviceStatusLabel(stage)}</span>
                        </div>
                      );
                    },
                  )}
                </div>
                {visa.status === "refused" && (
                  <div className="claim-alert">
                    <strong>Application refused</strong>
                    <span>
                      Contact the agency office for guidance on the recorded
                      decision.
                    </span>
                  </div>
                )}
                <div className="tracking-details">
                  <div>
                    <span>Application date</span>
                    <strong>{dateLabel(visa.appDate)}</strong>
                  </div>
                  <div>
                    <span>Applicant</span>
                    <strong>{visa.applicant}</strong>
                  </div>
                  <div>
                    <span>Destination</span>
                    <strong>{visa.destination}</strong>
                  </div>
                  <div>
                    <span>Application type</span>
                    <strong>{visa.visaType || "Visa application"}</strong>
                  </div>
                  <div>
                    <span>Office</span>
                    <strong>
                      <BranchName data={data} branch={visa.office} />
                    </strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{visa.email || "Not recorded"}</strong>
                  </div>
                </div>
              </>
            )}{" "}
            {canShare && (
              <div className="status-share-actions">
                <button className="button secondary" onClick={download}>
                  <Icon name="receipt" /> Download status PDF
                </button>
                <button
                  className="button primary"
                  disabled={!emailAddress || sending}
                  onClick={() => void email()}
                >
                  <Icon name="mail" />{" "}
                  {sending
                    ? "Sending…"
                    : emailAddress
                      ? "Email customer"
                      : "Add customer email first"}
                </button>
              </div>
            )}
          </div>
        ) : q ? (
          <Empty
            title={`${kind === "cargo" ? "Shipment" : "Visa application"} not found`}
            detail={`Check the ${kind === "cargo" ? "tracking number" : "application reference"} and try again.`}
          />
        ) : (
          <div className="tracking-placeholder">
            <div className="status-placeholder-icons">
              <span>
                <Icon name="cargo" />
              </span>
              <i />
              <span>
                <Icon name="visa" />
              </span>
            </div>
            <h3>One status centre, two services</h3>
            <p>
              Choose cargo or visa, then enter the reference generated by the
              system.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

export function LegacyReports({ data, user }: { data: AgencyData; user: User }) {
  const [from, setFrom] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [to, setTo] = useState(today());
  const [branchId, setBranchId] = useState("");
  const [currency, setCurrency] = useState<"" | Currency>("");
  const [trendCurrency, setTrendCurrency] = useState<"" | Currency>("");
  const [report, setReport] = useState<FinanceReport | null>(null);
  const branches = activeBranches(data);
  const selectedBranch = branchId
    ? branches.find((branch) => branch.id === branchId)
    : null;
  const rows = report?.rows || [];
  const availableCurrencies = (
    selectedBranch
      ? branchCurrencies(selectedBranch)
      : Array.from(new Set(rows.map((row) => row.currency)))
  ) as Currency[];
  useEffect(() => {
    let active = true;
    void fetch(
      `/api/reports/finance?branchId=${encodeURIComponent(branchId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error || "Financial report could not be loaded.",
          );
        if (active) setReport(payload);
      })
      .catch(() => active && setReport({ rows: [], totals: [], trend: [] }));
    return () => {
      active = false;
    };
  }, [branchId, from, to]);
  const currencyRows = (
    selectedBranch
      ? branchCurrencies(selectedBranch).map(
          (currency) =>
            rows.find((row) => row.currency === currency) || {
              branchId: selectedBranch.id,
              branch: selectedBranch.name,
              currency,
              revenue: 0,
              directCost: 0,
              grossProfit: 0,
              collections: 0,
              expenses: 0,
              outstanding: 0,
              supplierExposure: 0,
              services: { ticket: 0, visa: 0, cargo: 0 },
              serviceGrossProfit: { ticket: 0, visa: 0, cargo: 0 },
              paymentMethods: {},
            },
        )
      : rows
  ).filter((row) => !currency || row.currency === currency);
  const totals = report?.totals || [];
  const methodRows = currencyRows.flatMap((row) =>
    Object.entries(row.paymentMethods).map(([method, amount]) => ({
      ...row,
      method,
      amount,
    })),
  );
  const serviceRows = currencyRows.flatMap((row) =>
    (["ticket", "cargo", "visa"] as const).map((service) => ({
      ...row,
      service,
      revenue: row.services[service] || 0,
      grossProfit: row.serviceGrossProfit?.[service] || 0,
    })),
  );
  const titleScope = selectedBranch ? selectedBranch.name : "All Branches";
  const trendCurrencies = selectedBranch
    ? branchCurrencies(selectedBranch)
    : availableCurrencies;
  const activeTrendCurrency = trendCurrencies.find((item) =>
    (report?.trend || []).some((month) =>
      month.rows.some((row) => row.currency === item && row.revenue !== 0),
    ),
  );
  const chartCurrency =
    currency ||
    (trendCurrency && trendCurrencies.includes(trendCurrency)
      ? trendCurrency
      : activeTrendCurrency || trendCurrencies[0]);
  const maxTrend = Math.max(
    1,
    ...(report?.trend || []).flatMap((month) =>
      month.rows
        .filter((row) => row.currency === chartCurrency)
        .map((row) => row.revenue),
    ),
  );
  const download = () =>
    downloadPdf(
      `macruf-financial-report-${titleScope.replace(/\W+/g, "-").toLowerCase()}-${from}-to-${to}.pdf`,
      `${data.agencyName} - Financial Report`,
      [
        `Scope: ${titleScope}`,
        `Reporting period: ${dateLabel(from)} to ${dateLabel(to)}`,
        `Generated: ${new Date().toLocaleString("en-GB")}`,
        "",
        "BRANCH & CURRENCY PERFORMANCE",
        ...currencyRows.map(
          (row) =>
            `${row.branch} | ${row.currency} | Revenue ${money(row.revenue, row.currency)} | Collections ${money(row.collections, row.currency)} | Direct Cost ${money(row.directCost, row.currency)} | Gross Profit ${money(row.grossProfit, row.currency)} | Outstanding Debt ${money(row.outstanding, row.currency)} | Accounts Payable ${money(row.supplierExposure, row.currency)}`,
        ),
        "",
        "AGENCY CONSOLIDATED SUMMARY",
        ...totals.map(
          (row) =>
            `${row.currency} | Revenue ${money(row.revenue, row.currency)} | Collections ${money(row.collections, row.currency)} | Gross Profit ${money(row.grossProfit, row.currency)}`,
        ),
        "",
        "COLLECTIONS BY PAYMENT METHOD",
        ...(methodRows.length
          ? methodRows.map(
              (row) =>
                `${row.branch} | ${row.currency} | ${row.method} | ${money(row.amount, row.currency)}`,
            )
          : ["No payment ledger collections in this period."]),
      ],
    );
  return (
    <>
      <PageHeader
        eyebrow="Protected financial view"
        title="Financial Reports"
        detail="Agency and branch performance, revenue, collections, profit and outstanding balances."
        actions={
          <div className="report-actions">
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setCurrency("");
              }}
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "" | Currency)}
            >
              <option value="">All Currencies</option>
              {availableCurrencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="date-range">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span>to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            {user.role === "owner" && (
              <button className="button primary" onClick={download}>
                Download PDF report
              </button>
            )}
          </div>
        }
      />
      {!selectedBranch && (
        <section className="mini-kpis">
          {totals.map((row) => (
            <div key={row.currency}>
              <span>Agency {row.currency}</span>
              <strong>{money(row.revenue, row.currency)}</strong>
              <small>Collections {money(row.collections, row.currency)}</small>
            </div>
          ))}
        </section>
      )}
      {selectedBranch && (
        <section className="report-summary">
          {(
            ["revenue", "collections", "grossProfit", "outstanding"] as const
          ).map((metric) => (
            <article className="report-summary-card" key={metric}>
              <span className={`metric-icon tone-${metricLook(metric).tone}`}>
                <Icon name={metricLook(metric).icon} size={18} />
              </span>
              <span className="report-summary-label">
                {metric === "grossProfit"
                  ? "Gross Profit"
                  : metric === "outstanding"
                    ? "Outstanding Debt"
                    : metric[0].toUpperCase() + metric.slice(1)}
              </span>
              {currencyRows.map((row) => (
                <strong
                  key={row.currency}
                  className={
                    metric === "grossProfit" && row[metric] < 0
                      ? "negative"
                      : ""
                  }
                >
                  {money(row[metric], row.currency)}
                </strong>
              ))}
            </article>
          ))}
        </section>
      )}
      <section className="report-grid">
        <article className="panel span-2">
          <div className="panel-head">
            <div>
              <p className="eyebrow">
                {selectedBranch
                  ? "Currency performance"
                  : "Branch & currency performance"}
              </p>
              <h2>{titleScope}</h2>
            </div>
          </div>
          {currencyRows.length ? (
            <TableShell>
              <thead>
                <tr>
                  {!selectedBranch && <th>Branch</th>}
                  <th>Currency</th>
                  <th>Revenue</th>
                  <th>Collections</th>
                  <th>Direct cost</th>
                  <th>Gross profit</th>
                  <th>Expenses</th>
                  <th>Outstanding debt</th>
                  {!selectedBranch && <th>Accounts payable</th>}
                </tr>
              </thead>
              <tbody>
                {currencyRows.map((row) => (
                  <tr key={`${row.branchId}-${row.currency}`}>
                    {!selectedBranch && (
                      <td>
                        <strong><BranchName data={data} branch={row.branch} /></strong>
                      </td>
                    )}
                    <td>
                      <Badge tone={row.currency === "USD" ? "blue" : "success"}>
                        {row.currency}
                      </Badge>
                    </td>
                    <td>{money(row.revenue, row.currency)}</td>
                    <td>{money(row.collections, row.currency)}</td>
                    <td>{money(row.directCost, row.currency)}</td>
                    <td
                      className={row.grossProfit < 0 ? "negative" : "positive"}
                    >
                      {money(row.grossProfit, row.currency)}
                    </td>
                    <td>{money(row.expenses, row.currency)}</td>
                    <td>{money(row.outstanding, row.currency)}</td>
                    {!selectedBranch && (
                      <td>{money(row.supplierExposure, row.currency)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <Empty
              title="No configured rows"
              detail="There are no currencies available for this selection."
            />
          )}
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Revenue by service</p>
              <h2>Revenue breakdown</h2>
            </div>
          </div>
          <div className="report-table">
            <div className="report-row header">
              <span>
                {selectedBranch ? "Service" : "Branch / currency / service"}
              </span>
              <span>Revenue</span>
            </div>
            {serviceRows.map((row) => (
              <div
                className="report-row"
                key={`${row.branchId}-${row.currency}-${row.service}`}
              >
                <strong>
                  {selectedBranch ? (
                    row.service[0].toUpperCase() + row.service.slice(1)
                  ) : (
                    <>
                      <BranchName data={data} branch={row.branch} /> ·{" "}
                      {row.currency} ·{" "}
                      {row.service[0].toUpperCase() + row.service.slice(1)}
                    </>
                  )}
                </strong>
                <span>{money(row.revenue, row.currency)}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Collections</p>
              <h2>Collections by Payment Method</h2>
            </div>
          </div>
          <div className="report-table">
            <div className="report-row header">
              <span>
                {selectedBranch ? "Method" : "Branch / currency / method"}
              </span>
              <span>Collections</span>
            </div>
            {methodRows.length ? (
              methodRows.map((row) => (
                <div
                  className="report-row"
                  key={`${row.branchId}-${row.currency}-${row.method}`}
                >
                  <strong>
                    {selectedBranch ? (
                      row.method
                    ) : (
                      <>
                        <BranchName data={data} branch={row.branch} /> ·{" "}
                        {row.currency} · {row.method}
                      </>
                    )}
                  </strong>
                  <span>{money(row.amount, row.currency)}</span>
                </div>
              ))
            ) : (
              <p className="panel-copy">
                No collections recorded for this period.
              </p>
            )}
          </div>
        </article>
        <article className="panel span-2">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Revenue trend</p>
              <h2>
                {titleScope} · {chartCurrency} Revenue Trend
              </h2>
            </div>
            {!currency && trendCurrencies.length > 1 && (
              <select
                className="trend-select"
                value={chartCurrency}
                onChange={(e) => setTrendCurrency(e.target.value as Currency)}
              >
                {trendCurrencies.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            )}
          </div>
          {(report?.trend || []).some((month) =>
            month.rows.some(
              (row) => row.currency === chartCurrency && row.revenue !== 0,
            ),
          ) ? (
            <div className="bar-chart">
              {(report?.trend || []).map((month) => {
                const value = month.rows
                  .filter((row) => row.currency === chartCurrency)
                  .reduce((sum, row) => sum + row.revenue, 0);
                return (
                  <div key={month.label}>
                    <span>
                      {value
                        ? new Intl.NumberFormat("en", {
                            notation: "compact",
                          }).format(value)
                        : "0"}
                    </span>
                    <i
                      style={{
                        height: `${Math.max(4, (value / maxTrend) * 100)}%`,
                      }}
                    />
                    <small>{month.label}</small>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="panel-copy compact-empty">
              No revenue recorded for this period.
            </p>
          )}
        </article>
      </section>
    </>
  );
}

function Reports({ data, user, scopeBranchId }: { data: AgencyData; user: User; scopeBranchId?: string }) {
  const [from, setFrom] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [to, setTo] = useState(today());
  const [branchId, setBranchId] = useState("");
  // Follow the global branch scope chosen in the top bar.
  useBranchScope(scopeBranchId, (id) => setBranchId(id));
  const [currency, setCurrency] = useState<"" | Currency>("");
  const [trendCurrency, setTrendCurrency] = useState<"" | Currency>("");
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const branches = activeBranches(data);
  const selectedBranch = branches.find((branch) => branch.id === branchId);

  useEffect(() => {
    let active = true;
    void fetch(
      `/api/reports/finance?branchId=${encodeURIComponent(branchId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error || "Financial report could not be loaded.",
          );
        if (active) setReport(payload);
      })
      .catch(() => active && setReport({ rows: [], totals: [], trend: [] }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [branchId, from, to]);

  const availableCurrencies = (
    selectedBranch
      ? branchCurrencies(selectedBranch)
      : Array.from(
          new Set((report?.rows || []).map((row) => row.currency)),
        )
  ) as Currency[];
  const rows = (report?.rows || []).filter(
    (row) => !currency || row.currency === currency,
  );
  const titleScope = selectedBranch?.name || "All Branches";
  const serviceRows = rows.flatMap((row) =>
    (["ticket", "cargo", "visa"] as const)
      .map((service) => {
        const detail = row.serviceDetails?.[service];
        return detail
          ? {
              branchId: row.branchId,
              branch: row.branch,
              currency: row.currency,
              service,
              ...detail,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  );
  const serviceGroups = rows
    .map((row) => ({
      branchId: row.branchId,
      branch: row.branch,
      currency: row.currency,
      services: serviceRows.filter(
        (service) =>
          service.branchId === row.branchId &&
          service.currency === row.currency,
      ),
    }))
    .filter((group) => group.services.length > 0);
  const methodRows = rows.flatMap((row) =>
    Object.entries(row.paymentMethodDetails || {}).map(([method, detail]) => ({
      branchId: row.branchId,
      branch: row.branch,
      currency: row.currency,
      method,
      ...detail,
    })),
  );

  // Service performance summary, one metric row per currency. Refunds and net
  // received come from the payment-method ledger so the cards reconcile with
  // the ledger table below rather than being computed a second way.
  const performanceSummary = (report?.totals || [])
    .filter((total) => !currency || total.currency === currency)
    .map((total) => {
      const ledger = methodRows.filter((row) => row.currency === total.currency);
      const refunds = ledger.reduce((sum, row) => sum + (row.refunds || 0), 0);
      const netReceived = ledger.reduce(
        (sum, row) => sum + (row.netReceived ?? row.received ?? 0),
        0,
      );
      return {
        currency: total.currency as Currency,
        customerCharges: total.customerCharges,
        paymentsReceived: total.paymentsReceived,
        directCost: total.directCost,
        profit: total.profit,
        refunds,
        netReceived,
      };
    });

  const trendCurrencies = selectedBranch
    ? branchCurrencies(selectedBranch)
    : availableCurrencies;
  const chartCurrency = (
    currency ||
    (trendCurrency && trendCurrencies.includes(trendCurrency)
      ? trendCurrency
      : trendCurrencies.find((item) =>
          (report?.trend || []).some((month) =>
            month.rows.some(
              (row) => row.currency === item && row.revenue !== 0,
            ),
          ),
        ) ||
        trendCurrencies[0] ||
        "USD")
  ) as Currency;
  const trendValues = (report?.trend || []).map((month) => ({
    label: month.label,
    paymentsReceived: month.rows
      .filter((row) => row.currency === chartCurrency)
      .reduce((sum, row) => sum + row.paymentsReceived, 0),
    profit: month.rows
      .filter((row) => row.currency === chartCurrency)
      .reduce((sum, row) => sum + row.profit, 0),
  }));
  const maxTrend = Math.max(
    1,
    ...trendValues.flatMap((item) => [
      Math.abs(item.paymentsReceived),
      Math.abs(item.profit),
    ]),
  );
  const download = () =>
    downloadPdf(
      `macruf-financial-report-${titleScope.replace(/\W+/g, "-").toLowerCase()}-${from}-to-${to}.pdf`,
      `${data.agencyName} - Financial Report`,
      [
        `Scope: ${titleScope}`,
        `Currency: ${currency || "All currencies (reported separately)"}`,
        `Reporting period: ${dateLabel(from)} to ${dateLabel(to)}`,
        `Generated: ${new Date().toLocaleString("en-GB")}`,
        "",
        "SERVICE PERFORMANCE",
        ...serviceRows.map(
          (row) =>
            `${row.branch} | ${row.currency} | ${row.service} | ${row.transactions} transactions | Customer Charges ${money(row.customerCharges, row.currency)} | Payments Received ${money(row.paymentsReceived, row.currency)} | Direct Cost ${money(row.directCost, row.currency)} | Profit ${money(row.profit, row.currency)}`,
        ),
        "",
        "PAYMENTS RECEIVED BY METHOD",
        ...(methodRows.length
          ? methodRows.map(
              (row) =>
                `${row.branch} | ${row.currency} | ${row.method} | Received ${money(row.received, row.currency)} | Refunds ${money(row.refunds, row.currency)} | Net ${money(row.netReceived, row.currency)}`,
            )
          : ["No ledger payments in this period."]),
      ],
    );

  return (
    <>
      <PageHeader
        eyebrow="Protected financial view"
        title="Financial Reports"
        detail={`${titleScope} / ${currency || "all currencies separately"} / ${dateLabel(from)} to ${dateLabel(to)}`}
        actions={
          <div className="report-actions">
            <select
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value);
                setCurrency("");
              }}
              aria-label="Report branch"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <select
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value as "" | Currency)
              }
              aria-label="Report currency"
            >
              <option value="">All Currencies</option>
              {availableCurrencies.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="date-range">
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
                aria-label="Report start date"
              />
              <span>to</span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
                aria-label="Report end date"
              />
            </div>
            {user.role === "owner" && (
              <button className="button primary" onClick={download}>
                Download PDF report
              </button>
            )}
          </div>
        }
      />
      {performanceSummary.map((summary) => (
        <section key={`summary-${summary.currency}`} className="report-summary-block">
          <p className="eyebrow">
            Service performance summary{performanceSummary.length > 1 ? ` · ${summary.currency}` : ""}
          </p>
          <div className="metrics-grid six">
            <MetricCard icon="receipt" tone="blue" label="Customer Charges" value={money(summary.customerCharges, summary.currency)} foot="Billed to customers" />
            <MetricCard icon="money" tone="green" label="Payments Received" value={money(summary.paymentsReceived, summary.currency)} foot="Collected in period" />
            <MetricCard icon="expense" tone="orange" label="Direct Cost" value={money(summary.directCost, summary.currency)} foot="Cost of service" />
            <MetricCard icon="report" tone="violet" label="Profit" value={money(summary.profit, summary.currency)} foot="Charges less cost" />
            <MetricCard icon="logout" tone="pink" label="Refunds" value={money(summary.refunds, summary.currency)} foot="Returned to customers" />
            <MetricCard icon="wallet" tone="cyan" label="Net Revenue" value={money(summary.netReceived, summary.currency)} foot="Received less refunds" />
          </div>
        </section>
      ))}

      <section className="service-performance-section">
        <header className="service-performance-header">
          <p className="eyebrow">Service performance</p>
          <h2>Charges, payments and profit by service</h2>
        </header>
        {serviceGroups.length ? (
          <div className="service-performance-groups">
            {serviceGroups.map((group) => {
              const groupTotals = group.services.reduce(
                (summary, service) => ({
                  customerCharges:
                    summary.customerCharges + service.customerCharges,
                  paymentsReceived:
                    summary.paymentsReceived + service.paymentsReceived,
                  directCost: summary.directCost + service.directCost,
                  profit: summary.profit + service.profit,
                }),
                {
                  customerCharges: 0,
                  paymentsReceived: 0,
                  directCost: 0,
                  profit: 0,
                },
              );
              return (
                <article
                  className="service-performance-group"
                  key={`${group.branchId}-${group.currency}`}
                >
                  <div className="service-group-heading">
                    <h3>
                      <BranchName data={data} branch={group.branch} />
                    </h3>
                    <Badge
                      tone={group.currency === "USD" ? "blue" : "success"}
                    >
                      {group.currency}
                    </Badge>
                  </div>
                  <div className="service-group-summary">
                    {(
                      [
                        ["Customer Charges", "customerCharges"],
                        ["Payments Received", "paymentsReceived"],
                        ["Direct Cost", "directCost"],
                        ["Profit", "profit"],
                      ] as const
                    ).map(([label, metric]) => (
                      <div key={metric}>
                        <span className={`metric-icon tone-${metricLook(metric).tone}`}>
                          <Icon name={metricLook(metric).icon} size={17} />
                        </span>
                        <span className="service-metric-label">{label}</span>
                        <strong
                          className={
                            metric === "profit" && groupTotals[metric] < 0
                              ? "negative"
                              : ""
                          }
                        >
                          {money(groupTotals[metric], group.currency)}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <TableShell>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Transactions</th>
                        <th>Customer Charges</th>
                        <th>Payments Received</th>
                        <th>Direct Cost</th>
                        <th>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.services.map((service) => (
                        <tr key={service.service}>
                          <td>
                            <strong>
                              {service.service[0].toUpperCase() +
                                service.service.slice(1)}
                            </strong>
                          </td>
                          <td>{service.transactions}</td>
                          <td>
                            {money(service.customerCharges, group.currency)}
                          </td>
                          <td>
                            {money(service.paymentsReceived, group.currency)}
                          </td>
                          <td>{money(service.directCost, group.currency)}</td>
                          <td
                            className={
                              service.profit < 0 ? "negative" : "positive"
                            }
                          >
                            {money(service.profit, group.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty
            title={loading ? "Loading financial activity" : "No financial activity"}
            detail={
              loading
                ? "The payment ledger and service records are being reconciled."
                : `No financial activity for ${titleScope}${currency ? ` in ${currency}` : ""} during this period.`
            }
          />
        )}
      </section>
      <section className="report-grid">
        <article className="panel span-2">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Payments received by method</p>
              <h2>Ledger receipts and refunds</h2>
            </div>
          </div>
          {methodRows.length ? (
            <TableShell>
              <thead>
                <tr>
                  {!selectedBranch && <th>Branch</th>}
                  <th>Currency</th>
                  <th>Method</th>
                  <th>Transactions</th>
                  <th>Received</th>
                  <th>Refunds</th>
                  <th>Net received</th>
                </tr>
              </thead>
              <tbody>
                {methodRows.map((row) => (
                  <tr key={`${row.branchId}-${row.currency}-${row.method}`}>
                    {!selectedBranch && <td><BranchName data={data} branch={row.branch} /></td>}
                    <td>{row.currency}</td>
                    <td>
                      <strong>{row.method}</strong>
                    </td>
                    <td>{row.transactions}</td>
                    <td>{money(row.received, row.currency)}</td>
                    <td className={row.refunds ? "negative" : ""}>
                      {money(row.refunds, row.currency)}
                    </td>
                    <td>{money(row.netReceived, row.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <Empty
              title="No payments received"
              detail="Payments and refunds recorded in the ledger will appear here."
            />
          )}
        </article>
        <article className="panel span-2">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Six-month trend</p>
              <h2>
                {titleScope} / {chartCurrency} payments received and profit
              </h2>
            </div>
            {!currency && trendCurrencies.length > 1 && (
              <select
                className="trend-select"
                value={chartCurrency}
                onChange={(event) =>
                  setTrendCurrency(event.target.value as Currency)
                }
              >
                {trendCurrencies.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            )}
          </div>
          {trendValues.some(
            (item) => item.paymentsReceived !== 0 || item.profit !== 0,
          ) ? (
            <div className="trend-comparison">
              <div className="trend-legend">
                <span><i className="revenue" />Payments received</span>
                <span><i className="profit" />Profit</span>
              </div>
              <div className="bar-chart dual-bar-chart">
                {trendValues.map((item) => (
                  <div key={item.label}>
                    <span>
                      {new Intl.NumberFormat("en", {
                        notation: "compact",
                      }).format(item.paymentsReceived)}
                    </span>
                    <div className="dual-bars">
                      <i
                        className="revenue-bar"
                        style={{
                          height: `${Math.max(4, (Math.abs(item.paymentsReceived) / maxTrend) * 100)}%`,
                        }}
                      />
                      <i
                        className={`profit-bar ${item.profit < 0 ? "negative" : ""}`}
                        style={{
                          height: `${Math.max(4, (Math.abs(item.profit) / maxTrend) * 100)}%`,
                        }}
                      />
                    </div>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty
              title="No payment trend"
              detail="Six-month payments and profit will appear after ledger payments are recorded."
            />
          )}
        </article>
      </section>
    </>
  );
}

function Team({ data, user, notify }: ModuleProps) {
  const [members, setMembers] = useState<User[]>(data.users);
  const [adding, setAdding] = useState(false);
  const [credentials, setCredentials] = useState<{
    name: string;
    username: string;
    password: string;
    loginUrl: string;
  } | null>(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    void fetch("/api/admin/users").then(async (response) => {
      const payload = await response.json();
      if (response.ok) setMembers(payload.users);
    });
  }, []);
  const update = async (payload: Record<string, unknown>) => {
    setBusy(String(payload.id || "new"));
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok)
      return notify(result.error || "Account could not be updated");
    setMembers((current) =>
      current.map((item) => (item.id === result.user.id ? result.user : item)),
    );
    if (result.temporaryPassword)
      setCredentials({
        name: result.user.name,
        username: result.user.username,
        password: result.temporaryPassword,
        loginUrl: result.user.loginUrl,
      });
  };
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    notify(`${label} copied`);
  };
  return (
    <>
      <PageHeader
        eyebrow="Owner administration"
        title="Team & Role Access"
        detail="Generate staff usernames, temporary passwords and dedicated access links. Accounts work across browsers."
        actions={
          <button className="button primary" onClick={() => setAdding(true)}>
            <Icon name="plus" /> New Staff
          </button>
        }
      />
      <section className="permission-grid">
        <div>
          <Badge tone="success">Owner</Badge>
          <strong>Full control</strong>
          <p>All branches, all financials, staff, settings, edit and delete.</p>
        </div>
        <div>
          <Badge tone="blue">Operator</Badge>
          <strong>Branch operations</strong>
          <p>
            Tickets, visas, close, expenses and cargo for one assigned branch.
            No agency financials.
          </p>
        </div>
      </section>
      <div className="team-list">
        {members.map((x) => (
          <article key={x.id}>
            <div className="user-avatar large">
              {x.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <strong>
                {x.name}
                {x.id === user.id && <small> You</small>}
              </strong>
              <span>{x.username}</span>
            </div>
            <Badge tone={x.active ? "success" : "neutral"}>
              {x.active ? "Active" : "Suspended"}
            </Badge>
            <span className="role-name">
              {roleLabel[x.role]}
              {x.assignedBranchId
                ? ` · ${branchName(data, x.assignedBranchId)}`
                : ""}
            </span>
            {x.id !== user.id && (
              <div className="team-actions">
                <button
                  className={x.active ? "delete-action" : "edit-action"}
                  disabled={busy === x.id}
                  onClick={() => void update({ id: x.id, active: !x.active })}
                >
                  {x.active ? "Suspend" : "Activate"}
                </button>
                <button
                  className="edit-action"
                  disabled={busy === x.id}
                  onClick={() => void update({ id: x.id, resetPassword: true })}
                >
                  Reset password
                </button>
                {x.loginUrl && (
                  <button
                    className="edit-action"
                    onClick={() => void copy(x.loginUrl!, "Login link")}
                  >
                    Copy link
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      {adding && (
        <UserForm
          branches={activeBranches(data)}
          onClose={() => setAdding(false)}
          onSave={async (form) => {
            setBusy("new");
            const response = await fetch("/api/admin/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            const result = await response.json();
            setBusy("");
            if (!response.ok)
              return notify(
                result.error || "Staff access could not be created",
              );
            setMembers((current) => [...current, result.user]);
            setAdding(false);
            setCredentials({
              name: result.user.name,
              username: result.user.username,
              password: result.temporaryPassword,
              loginUrl: result.user.loginUrl,
            });
          }}
        />
      )}
      {credentials && (
        <Modal
          title="Staff access generated"
          subtitle="Share these details privately. The password is shown only now."
          onClose={() => setCredentials(null)}
        >
          <div className="credential-card">
            <p>
              <span>Team member</span>
              <strong>{credentials.name}</strong>
            </p>
            <p>
              <span>Username</span>
              <strong>{credentials.username}</strong>
              <button
                onClick={() => void copy(credentials.username, "Username")}
              >
                Copy
              </button>
            </p>
            <p>
              <span>Temporary password</span>
              <strong>{credentials.password}</strong>
              <button
                onClick={() => void copy(credentials.password, "Password")}
              >
                Copy
              </button>
            </p>
            <p>
              <span>Dedicated login link</span>
              <strong className="credential-link">
                {credentials.loginUrl}
              </strong>
              <button
                onClick={() => void copy(credentials.loginUrl, "Login link")}
              >
                Copy
              </button>
            </p>
          </div>
          <div className="modal-actions">
            <button
              className="button primary"
              onClick={() => setCredentials(null)}
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function UserForm({
  branches,
  onClose,
  onSave,
}: {
  branches: Branch[];
  onClose: () => void;
  onSave: (f: {
    name: string;
    username: string;
    password: string;
    role: Role;
    assignedBranchId?: string;
  }) => void;
}) {
  const [f, setF] = useState({
    name: "",
    username: "",
    password: "",
    role: "operator" as Role,
    assignedBranchId: branches[0]?.id || "",
  });
  return (
    <Modal
      title="Create Staff"
      subtitle="Leave username and password blank to generate both automatically."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(f);
        }}
      >
        <div className="form-grid">
          <Field label="Full name">
            <input
              required
              autoFocus
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </Field>
          <Field label="Role">
            <select
              value={f.role}
              onChange={(e) => setF({ ...f, role: e.target.value as Role })}
            >
              <option value="operator">Operator</option>
              <option value="owner">Owner</option>
            </select>
          </Field>
          {f.role === "operator" && (
            <Field label="Assigned branch">
              <BranchSelect
                options={branches}
                required
                value={f.assignedBranchId}
                onChange={(e) =>
                  setF({ ...f, assignedBranchId: e.target.value })
                }
              />
            </Field>
          )}
          <Field label="Username (optional)">
            <input
              value={f.username}
              onChange={(e) => setF({ ...f, username: e.target.value })}
              placeholder="Generated from the name"
            />
          </Field>
          <Field label="Password (optional)">
            <PasswordInput
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
              placeholder="Secure password generated"
            />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={
              !f.name.trim() || (f.role === "operator" && !f.assignedBranchId)
            }
            className="button primary"
          >
            Create Staff
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BranchManager({
  data,
  notify,
}: {
  data: AgencyData;
  notify: (s: string) => void;
}) {
  const [branches, setBranches] = useState<Branch[]>(data.branches);
  const [editing, setEditing] = useState<Branch | null | undefined>();
  const [form, setForm] = useState({
    name: "",
    code: "",
    city: "",
    country: "",
    defaultCurrency: "USD" as Currency,
    allowedCurrencies: ["USD"] as Currency[],
    phone: "",
    email: "",
    address: "",
  });
  const start = (branch?: Branch) => {
    setEditing(branch || null);
    setForm(
      branch
        ? {
            name: branch.name,
            code: branch.code,
            city: branch.city,
            country: branch.country,
            defaultCurrency: branch.defaultCurrency,
            allowedCurrencies: branchCurrencies(branch),
            phone: branch.phone || "",
            email: branch.email || "",
            address: branch.address || "",
          }
        : {
            name: "",
            code: "",
            city: "",
            country: "",
            defaultCurrency: "USD",
            allowedCurrencies: ["USD"] as Currency[],
            phone: "",
            email: "",
            address: "",
          },
    );
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const response = await fetch(
      editing ? "/api/branches/" + editing.id : "/api/branches",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const result = await response.json();
    if (!response.ok)
      return notify(result.error || "Branch could not be saved");
    setBranches((current) =>
      editing
        ? current.map((branch) =>
            branch.id === result.branch.id ? result.branch : branch,
          )
        : [...current, result.branch],
    );
    setEditing(undefined);
    notify("Branch saved");
  };
  const deactivate = async (branch: Branch) => {
    const response = await fetch("/api/branches/" + branch.id + "/deactivate", {
      method: "PATCH",
    });
    const result = await response.json();
    if (!response.ok)
      return notify(result.error || "Branch could not be deactivated");
    setBranches((current) =>
      current.map((item) => (item.id === branch.id ? result.branch : item)),
    );
    notify("Branch deactivated");
  };
  return (
    <article className="panel span-2">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Branches</p>
          <h2>Branch management</h2>
        </div>
        <button className="button secondary" onClick={() => start()}>
          <Icon name="plus" /> Add Branch
        </button>
      </div>
      {editing !== undefined && (
        <form className="modal-form" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Code">
              <input
                required
                maxLength={6}
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
              />
            </Field>
            <Field label="City">
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
            <Field label="Country">
              <input
                required
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </Field>
            <Field label="Default currency">
              <select
                value={form.defaultCurrency}
                onChange={(e) =>
                  setForm((current) => {
                    const defaultCurrency = e.target.value as Currency;
                    return {
                      ...current,
                      defaultCurrency,
                      allowedCurrencies: current.allowedCurrencies.includes(
                        defaultCurrency,
                      )
                        ? current.allowedCurrencies
                        : [...current.allowedCurrencies, defaultCurrency],
                    };
                  })
                }
              >
                <option>KES</option>
                <option>USD</option>
              </select>
            </Field>
            <Field label="Allowed currencies" wide>
              <div
                className="currency-checks"
                role="group"
                aria-label="Allowed currencies"
              >
                {(["KES", "USD"] as Currency[]).map((currency) => {
                  const checked = form.allowedCurrencies.includes(currency);
                  return (
                    <label className="check" key={currency}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={currency === form.defaultCurrency}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            allowedCurrencies: checked
                              ? current.allowedCurrencies.filter(
                                  (item) => item !== currency,
                                )
                              : [...current.allowedCurrencies, currency],
                          }))
                        }
                      />
                      <span>{currency}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Address">
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </button>
            <button className="button primary">Save Branch</button>
          </div>
        </form>
      )}
      {/* A branch row carries seven pieces of information, so it cannot use
          the four-column `.setting-list` grid the rate and balance lists
          share. Grouped into identity / status / actions instead. */}
      <div className="setting-list branch-settings-list">
        {branches.map((branch) => (
          <div key={branch.id}>
            <BranchFlag country={branch.country} />
            <div className="branch-row-main">
              <strong>{branch.name}</strong>
              <span>
                {branch.code} · {branch.city}, {branch.country} ·{" "}
                {branchCurrencies(branch).join(" + ")}
              </span>
            </div>
            <Badge tone={branch.isActive ? "success" : "neutral"}>
              {branch.isActive ? "Active" : "Inactive"}
            </Badge>
            <div className="branch-row-actions">
              <button className="edit-action" onClick={() => start(branch)}>
                Edit
              </button>
              {branch.isActive && (
                <button
                  className="delete-action"
                  onClick={() => void deactivate(branch)}
                >
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function BackupPanel({
  notify,
  replaceData,
}: {
  notify: (message: string) => void;
  replaceData?: (data: AgencyData) => void;
}) {
  const [backup, setBackup] = useState<unknown>();
  const [fileName, setFileName] = useState("");
  const [validation, setValidation] = useState<{
    digest: string;
    createdAt: string;
    counts: Record<string, number>;
  }>();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const downloadBackup = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/backups/export", {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Backup could not be created.");
      }
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `macruf-business-backup-${today()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      notify("Protected backup downloaded");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Backup failed");
    } finally {
      setBusy(false);
    }
  };

  const chooseBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      setBackup(parsed);
      setFileName(file.name);
      setValidation(undefined);
      setConfirmation("");
      notify("Backup file loaded. Check it before restoring.");
    } catch {
      setBackup(undefined);
      setFileName("");
      notify("Choose a valid SomWay JSON backup file.");
    }
  };

  const validateBackup = async () => {
    if (!backup) return;
    setBusy(true);
    try {
      const response = await fetch("/api/backups/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Backup is invalid.");
      setValidation(payload.summary);
      setConfirmation("");
      notify("Backup checks passed");
    } catch (error) {
      setValidation(undefined);
      notify(error instanceof Error ? error.message : "Backup check failed");
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!backup || !validation) return;
    setBusy(true);
    try {
      const response = await fetch("/api/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backup,
          validationDigest: validation.digest,
          confirmation,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Restore failed.");
      replaceData?.(payload.data);
      setBackup(undefined);
      setFileName("");
      setValidation(undefined);
      setConfirmation("");
      notify("Business data restored successfully");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  const expectedConfirmation = validation
    ? `RESTORE ${validation.digest.slice(0, 12)}`
    : "";
  const recordCount = validation
    ? Object.values(validation.counts).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Data protection</p>
          <h2>Backup &amp; recovery</h2>
        </div>
      </div>
      <p className="panel-copy">
        Download business records and configuration. Staff passwords and active
        sessions are never included.
      </p>
      <div className="button-row">
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void downloadBackup()}
        >
          Download backup
        </button>
        <label className="button ghost file-button">
          Choose backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={chooseBackup}
          />
        </label>
      </div>
      {fileName && (
        <div className="backup-check">
          <strong>{fileName}</strong>
          {!validation ? (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void validateBackup()}
            >
              Check backup
            </button>
          ) : (
            <>
              <span>
                {recordCount.toLocaleString()} records, created{" "}
                {dateLabel(validation.createdAt)}
              </span>
              <input
                aria-label="Restore confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={expectedConfirmation}
              />
              <button
                className="button danger"
                disabled={busy || confirmation !== expectedConfirmation}
                onClick={() => void restoreBackup()}
              >
                Restore checked backup
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

function BusinessHoursPanel({ notify }: { notify: (message: string) => void }) {
  const [form, setForm] = useState({
    timezone: "Africa/Mogadishu",
    businessDayStart: "07:00",
    businessDayEnd: "18:00",
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (active && response.ok && payload.settings)
        setForm({
          timezone: payload.settings.timezone,
          businessDayStart: payload.settings.businessDayStart,
          businessDayEnd: payload.settings.businessDayEnd,
        });
    };
    void load();
    return () => {
      active = false;
    };
  }, []);
  const saveHours = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Business hours could not be saved");
      notify("Business hours updated");
    } catch (caught) {
      notify(
        caught instanceof Error
          ? caught.message
          : "Business hours could not be saved",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Business day</p>
          <h2>Daily Summary hours</h2>
        </div>
      </div>
      <div className="form-grid compact-form">
        <Field label="Timezone" wide>
          <select
            value={form.timezone}
            onChange={(event) =>
              setForm({ ...form, timezone: event.target.value })
            }
          >
            <option value="Africa/Mogadishu">Africa/Mogadishu</option>
            <option value="Africa/Nairobi">Africa/Nairobi</option>
          </select>
        </Field>
        <Field label="Day starts">
          <input
            type="time"
            value={form.businessDayStart}
            onChange={(event) =>
              setForm({ ...form, businessDayStart: event.target.value })
            }
          />
        </Field>
        <Field label="Day ends">
          <input
            type="time"
            value={form.businessDayEnd}
            onChange={(event) =>
              setForm({ ...form, businessDayEnd: event.target.value })
            }
          />
        </Field>
      </div>
      <div className="button-row">
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void saveHours()}
        >
          Save business hours
        </button>
      </div>
    </article>
  );
}

function Settings({ data, save, notify, replaceData }: ModuleProps) {
  const [agency, setAgency] = useState(data.agencyName);
  const settingsBranches = activeBranches(data);
  const initialSettingsBranch = settingsBranches[0];
  const initialSettingsCurrency =
    initialSettingsBranch?.defaultCurrency ||
    branchCurrencies(initialSettingsBranch)[0];
  const [rateForm, setRateForm] = useState({
    originBranchId: initialSettingsBranch?.id || "",
    destinationBranchId: settingsBranches[1]?.id || "",
    currency: initialSettingsCurrency,
    rate: "",
  });
  const [balance, setBalance] = useState({
    branchId: initialSettingsBranch?.id || "",
    method:
      paymentMethodsFor(
        data,
        initialSettingsBranch?.id || "",
        initialSettingsCurrency,
      )[0] || ("Bank" as PaymentMethod),
    currency: initialSettingsCurrency,
    amount: "",
  });
  return (
    <>
      <PageHeader
        eyebrow="Owner administration"
        title="Agency Settings"
        detail="Set cargo rates, opening balances, naming and agency data portability."
      />
      <section className="settings-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Identity</p>
              <h2>Agency name</h2>
            </div>
          </div>
          <div className="inline-form">
            <input value={agency} onChange={(e) => setAgency(e.target.value)} />
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  const response = await fetch("/api/admin/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ agencyName: agency }),
                  });
                  const payload = await response.json();
                  if (!response.ok) {
                    throw new Error(
                      payload.error || "Agency name could not be updated",
                    );
                  }
                  replaceData?.(payload.data);
                  notify("Agency name updated");
                } catch (error) {
                  notify(
                    error instanceof Error
                      ? error.message
                      : "Agency name could not be updated",
                  );
                }
              }}
            >
              Save
            </button>
          </div>
        </article>
        <OwnerSecurity notify={notify} />
        <BusinessHoursPanel notify={notify} />
        <BranchManager data={data} notify={notify} />
        <BackupPanel notify={notify} replaceData={replaceData} />
        <article className="panel span-2">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Cargo pricing</p>
              <h2>Rate per kilogram</h2>
            </div>
          </div>
          <div className="settings-entry">
            <BranchSelect
              options={settingsBranches}
              value={rateForm.originBranchId}
              onChange={(e) => {
                const originBranchId = e.target.value;
                const origin = branchById(data, originBranchId);
                const destinationBranchId =
                  rateForm.destinationBranchId === originBranchId
                    ? settingsBranches.find(
                        (branch) => branch.id !== originBranchId,
                      )?.id || ""
                    : rateForm.destinationBranchId;
                setRateForm({
                  ...rateForm,
                  originBranchId,
                  destinationBranchId,
                  currency:
                    origin?.defaultCurrency || branchCurrencies(origin)[0],
                });
              }}
            />
            <select
              value={rateForm.destinationBranchId}
              onChange={(e) =>
                setRateForm({
                  ...rateForm,
                  destinationBranchId: e.target.value,
                })
              }
            >
              {settingsBranches
                .filter((branch) => branch.id !== rateForm.originBranchId)
                .map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
            </select>
            <select
              value={rateForm.currency}
              onChange={(e) =>
                setRateForm({
                  ...rateForm,
                  currency: e.target.value as Currency,
                })
              }
            >
              {branchCurrencies(branchById(data, rateForm.originBranchId)).map(
                (currency) => (
                  <option key={currency}>{currency}</option>
                ),
              )}
            </select>
            <input
              type="number"
              placeholder="Rate / kg"
              value={rateForm.rate}
              onChange={(e) =>
                setRateForm({ ...rateForm, rate: e.target.value })
              }
            />
            <button
              className="button primary"
              disabled={
                !rateForm.originBranchId ||
                !rateForm.destinationBranchId ||
                rateForm.originBranchId === rateForm.destinationBranchId ||
                Number(rateForm.rate) <= 0
              }
              onClick={() => {
                const origin = branchById(data, rateForm.originBranchId);
                const destination = branchById(
                  data,
                  rateForm.destinationBranchId,
                );
                if (!origin || !destination) return;
                const record: Rate = {
                  id: `rate-${origin.id}-${destination.id}-${rateForm.currency}`,
                  origin: origin.name,
                  destination: destination.name,
                  originBranchId: origin.id,
                  destinationBranchId: destination.id,
                  currency: rateForm.currency,
                  rate: Number(rateForm.rate),
                };
                save(
                  (d) => ({
                    ...d,
                    rates: [
                      ...d.rates.filter((x) => x.id !== record.id),
                      record,
                    ],
                  }),
                  {
                    entity: "Settings",
                    detail: `Updated ${record.origin} to ${record.destination} ${record.currency} cargo rate`,
                  },
                );
                notify("Cargo rate saved");
              }}
            >
              Save rate
            </button>
          </div>
          <div className="setting-list">
            {data.rates.map((x) => (
              <div key={x.id}>
                <strong>
                  {x.origin} → {x.destination}
                </strong>
                <span>{x.currency}</span>
                <b>{money(x.rate, x.currency)} / kg</b>
                <button
                  onClick={() =>
                    save((d) => ({
                      ...d,
                      rates: d.rates.filter((y) => y.id !== x.id),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </article>
        <article className="panel span-2">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Daily close</p>
              <h2>Starting balances</h2>
            </div>
          </div>
          <div className="settings-entry">
            <BranchSelect
              options={settingsBranches}
              value={balance.branchId}
              onChange={(e) => {
                const branchId = e.target.value;
                const branch = branchById(data, branchId);
                const currency =
                  branch?.defaultCurrency || branchCurrencies(branch)[0];
                setBalance({
                  ...balance,
                  branchId,
                  currency,
                  method:
                    paymentMethodsFor(data, branchId, currency)[0] ||
                    ("Bank" as PaymentMethod),
                });
              }}
            />
            <select
              value={balance.method}
              onChange={(e) =>
                setBalance({
                  ...balance,
                  method: e.target.value as PaymentMethod,
                })
              }
            >
              {paymentMethodsFor(data, balance.branchId, balance.currency).map(
                (x) => (
                  <option key={x}>{x}</option>
                ),
              )}
            </select>
            <select
              value={balance.currency}
              onChange={(e) => {
                const currency = e.target.value as Currency;
                setBalance({
                  ...balance,
                  currency,
                  method:
                    paymentMethodsFor(data, balance.branchId, currency)[0] ||
                    ("Bank" as PaymentMethod),
                });
              }}
            >
              {branchCurrencies(branchById(data, balance.branchId)).map(
                (currency) => (
                  <option key={currency}>{currency}</option>
                ),
              )}
            </select>
            <input
              type="number"
              placeholder="Opening float"
              value={balance.amount}
              onChange={(e) =>
                setBalance({ ...balance, amount: e.target.value })
              }
            />
            <button
              className="button secondary"
              disabled={!balance.branchId || Number(balance.amount) < 0}
              onClick={() => {
                const branch = branchById(data, balance.branchId);
                if (!branch) return;
                const record: StartingBalance = {
                  id: `balance-${branch.id}-${balance.method}-${balance.currency}`,
                  branchId: branch.id,
                  office: branch.name,
                  method: balance.method,
                  currency: balance.currency,
                  amount: Number(balance.amount),
                };
                save(
                  (d) => ({
                    ...d,
                    startingBalances: [
                      ...d.startingBalances.filter((x) => x.id !== record.id),
                      record,
                    ],
                  }),
                  {
                    entity: "Settings",
                    detail: `Updated ${record.office} ${record.method} starting balance`,
                  },
                );
                notify("Starting balance saved");
              }}
            >
              Save balance
            </button>
          </div>
          <div className="setting-list">
            {data.startingBalances.map((x) => (
              <div key={x.id}>
                <strong>
                  <BranchName data={data} branch={x.office} /> · {x.method}
                </strong>
                <span>{x.currency}</span>
                <b>{money(x.amount, x.currency)}</b>
                <button
                  onClick={() =>
                    save((d) => ({
                      ...d,
                      startingBalances: d.startingBalances.filter(
                        (y) => y.id !== x.id,
                      ),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function OwnerSecurity({ notify }: { notify: (message: string) => void }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 10)
      return setError("Use at least 10 characters for the new password.");
    if (form.next !== form.confirm)
      return setError("New passwords do not match.");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Password could not be changed.");
      setForm({ current: "", next: "", confirm: "" });
      notify("Owner password updated");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Password could not be changed.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Owner security</p>
          <h2>Change password</h2>
        </div>
      </div>
      <form className="security-form" onSubmit={submit}>
        <PasswordInput
          required
          autoComplete="current-password"
          placeholder="Current password"
          value={form.current}
          onChange={(e) => setForm({ ...form, current: e.target.value })}
        />
        <PasswordInput
          required
          minLength={10}
          autoComplete="new-password"
          placeholder="New password"
          value={form.next}
          onChange={(e) => setForm({ ...form, next: e.target.value })}
        />
        <PasswordInput
          required
          minLength={10}
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />
        {error && <p className="form-error">{error}</p>}
        <button disabled={busy} className="button secondary" type="submit">
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </article>
  );
}
function ActivityLog({ data }: { data: AgencyData }) {
  const todayActivities = data.activities.filter((activity) => activity.at.slice(0, 10) === today());
  const activityCount = (pattern: RegExp) => todayActivities.filter((activity) => pattern.test(`${activity.action} ${activity.detail}`)).length;
  return (
    <>
      <PageHeader
        eyebrow="Accountability"
        title="Activity Log"
        detail="A shared audit trail of creates, updates, reviews and deletions."
      />
      <div className="metrics-grid five">
        <MetricCard icon="trend" label="Total Actions Today" value={todayActivities.length} tone="blue" foot="Audit events" />
        <MetricCard icon="user" label="Sign-ins" value={activityCount(/sign.?in|login/i)} tone="cyan" foot="Successful access" />
        <MetricCard icon="edit" label="Updates" value={activityCount(/update|change|review|reopen/i)} tone="violet" foot="Record changes" />
        <MetricCard icon="trash" label="Deletions" value={activityCount(/delete|archive|void/i)} tone="orange" foot="Removed or voided" />
        <MetricCard icon="alert" label="System Alerts" value={activityCount(/alert|failed|error|blocked/i)} tone="red" foot="Requires attention" />
      </div>
      {data.activities.length ? (
        <Panel title="Audit Events" actions={<StatusBadge tone="blue">Secured</StatusBadge>}>
        <div className="activity-list">
          {data.activities.map((x) => (
            <article key={x.id}>
              <i />
              <div>
                <strong>{x.detail}</strong>
                <span>
                  {x.userName} · {x.entity}
                </span>
              </div>
              <time>
                {new Date(x.at).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </article>
          ))}
        </div>
        </Panel>
      ) : (
        <Empty
          title="No activity yet"
          detail="Actions taken by the team will appear here."
        />
      )}
    </>
  );
}
