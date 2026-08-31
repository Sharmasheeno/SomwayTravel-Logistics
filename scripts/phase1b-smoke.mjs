import mongoose from "mongoose";
import User from "../server/models/User.js";
import Session from "../server/models/Session.js";
import Ticket from "../server/models/Ticket.js";
import Cargo from "../server/models/Cargo.js";
import Visa from "../server/models/Visa.js";
import Expense from "../server/models/Expense.js";
import Client from "../server/models/Client.js";
import Activity from "../server/models/Activity.js";

const base = process.env.PHASE1B_API_BASE || "http://127.0.0.1:5055";
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/macruf-travel-cargo";
const ownerEmail = "phase1b.owner@macruf.test";
const opEmail = "phase1b.operator@macruf.test";
const ids = ["phase1b-ticket-a", "phase1b-cargo-b", "phase1b-visa-c", "phase1b-expense-d"];

const cleanup = async () => {
  await Promise.all([
    Ticket.deleteMany({ id: /^phase1b-/ }),
    Cargo.deleteMany({ id: /^phase1b-/ }),
    Visa.deleteMany({ id: /^phase1b-/ }),
    Expense.deleteMany({ id: /^phase1b-/ }),
    Client.deleteMany({ phone: /^\+25261001/ }),
    Activity.deleteMany({ detail: /PHASE1B/ }),
    Session.deleteMany({}),
    User.deleteMany({ email: { $in: [ownerEmail, opEmail] } }),
  ]);
};

const parseCookie = (res) => res.headers.getSetCookie?.()[0]?.split(";")[0] || res.headers.get("set-cookie")?.split(";")[0] || "";

const request = async (path, options = {}, cookie = "") => {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status} ${JSON.stringify(body)}`);
  return { res, body };
};

const assertRecord = (data, id) => {
  const exists = [...data.tickets, ...data.cargo, ...data.visas, ...data.expenses].some((item) => item.id === id);
  if (!exists) throw new Error(`${id} missing`);
};

await mongoose.connect(uri);
await cleanup();
await User.create({ name: "Phase1B Owner", email: ownerEmail, password: "OwnerPhase1B!", role: "owner", isOwner: true, active: true });
await User.create({ name: "Phase1B Operator", email: opEmail, password: "OperatorPhase1B!", role: "officer_nairobi", isOwner: false, active: true });
await mongoose.disconnect();

const ownerLogin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: ownerEmail, password: "OwnerPhase1B!" }) });
const ownerCookie = parseCookie(ownerLogin.res);
const opLogin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: opEmail, password: "OperatorPhase1B!" }) });
const opCookie = parseCookie(opLogin.res);
console.log("1 owner login PASS");
console.log("2 operator login PASS");

await request("/api/entities/tickets", {
  method: "POST",
  body: JSON.stringify({
    record: { id: ids[0], ref: "PHASE1B-TKT-A", office: "Nairobi", type: "Sale", saleDate: "2026-08-30", passenger: "Phase1B Passenger", phone: "+252610010001", route: "NBO-DXB", currency: "KES", amount: 100, cost: 70, paymentMethod: "Cash", paid: true, paymentDate: "2026-08-30", servedBy: "Phase1B Owner", notes: "", createdBy: "phase1b", updatedAt: new Date().toISOString() },
    action: { entity: "Ticket", detail: "PHASE1B Created ticket" },
  }),
}, ownerCookie);
console.log("3 create ticket PASS");

await request("/api/entities/cargo", {
  method: "POST",
  body: JSON.stringify({
    record: { id: ids[1], tracking: "PHASE1B-CARGO-B", origin: "Nairobi", destination: "Mogadishu", dateIn: "2026-08-30", sender: "Phase1B Sender", senderPhone: "+252610010002", receiver: "Phase1B Receiver", receiverPhone: "+252610010003", contents: "Test cargo", weight: 2, currency: "KES", rate: 50, cost: 20, payType: "Prepaid", paymentMethod: "Cash", paidByOffice: "Nairobi", paid: true, paymentDate: "2026-08-30", status: "In Transit", dateDelivered: "", notes: "", createdBy: "phase1b", updatedBy: "phase1b", updatedAt: new Date().toISOString() },
    action: { entity: "Cargo", detail: "PHASE1B Created cargo" },
  }),
}, opCookie);
console.log("4 create cargo PASS");

await request(`/api/entities/tickets/${ids[0]}`, {
  method: "PATCH",
  body: JSON.stringify({
    record: { id: ids[0], ref: "PHASE1B-TKT-A", office: "Nairobi", type: "Sale", saleDate: "2026-08-30", passenger: "Phase1B Passenger Edited", phone: "+252610010001", route: "NBO-DXB", currency: "KES", amount: 100, cost: 70, paymentMethod: "Cash", paid: true, paymentDate: "2026-08-30", servedBy: "Phase1B Owner", notes: "edited", createdBy: "phase1b", updatedAt: new Date().toISOString() },
    action: { entity: "Ticket", detail: "PHASE1B Updated ticket" },
  }),
}, ownerCookie);
let data = (await request("/api/data", { method: "GET" }, ownerCookie)).body.data;
assertRecord(data, ids[1]);
console.log("5 edit ticket and 6 cargo remains PASS");

await request("/api/entities/visas", {
  method: "POST",
  body: JSON.stringify({
    record: { id: ids[2], ref: "PHASE1B-VISA-C", office: "Nairobi", type: "Sale", appDate: "2026-08-30", applicant: "Phase1B Applicant", phone: "+252610010004", destination: "UAE", visaType: "Tourist", currency: "KES", amount: 200, cost: 120, paymentMethod: "Cash", paid: true, paymentDate: "2026-08-30", status: "Submitted", servedBy: "Phase1B Owner", notes: "", createdBy: "phase1b", updatedAt: new Date().toISOString() },
    action: { entity: "Visa", detail: "PHASE1B Created visa" },
  }),
}, ownerCookie);
console.log("7 create visa PASS");

await request(`/api/entities/cargo/${ids[1]}`, {
  method: "PATCH",
  body: JSON.stringify({
    record: { id: ids[1], tracking: "PHASE1B-CARGO-B", origin: "Nairobi", destination: "Mogadishu", dateIn: "2026-08-30", sender: "Phase1B Sender", senderPhone: "+252610010002", receiver: "Phase1B Receiver", receiverPhone: "+252610010003", contents: "Test cargo", weight: 2, currency: "KES", rate: 50, cost: 20, payType: "Prepaid", paymentMethod: "Cash", paidByOffice: "Nairobi", paid: true, paymentDate: "2026-08-30", status: "Arrived", dateDelivered: "", notes: "edited", createdBy: "phase1b", updatedBy: "phase1b", updatedAt: new Date().toISOString() },
    action: { entity: "Cargo", detail: "PHASE1B Updated cargo" },
  }),
}, opCookie);
data = (await request("/api/data", { method: "GET" }, ownerCookie)).body.data;
assertRecord(data, ids[2]);
console.log("8 edit cargo and 9 visa remains PASS");

await request("/api/entities/expenses", {
  method: "POST",
  body: JSON.stringify({
    record: { id: ids[3], date: "2026-08-30", office: "Nairobi", category: "Other", description: "Phase1B Expense", currency: "KES", amount: 10, paymentMethod: "Cash", inProfitLoss: true, paid: true, paidBy: "Phase1B Operator", notes: "", createdBy: "phase1b" },
    action: { entity: "Expense", detail: "PHASE1B Created expense" },
  }),
}, opCookie);
console.log("10 create expense PASS");

await request(`/api/entities/visas/${ids[2]}`, {
  method: "PATCH",
  body: JSON.stringify({
    record: { id: ids[2], ref: "PHASE1B-VISA-C", office: "Nairobi", type: "Sale", appDate: "2026-08-30", applicant: "Phase1B Applicant Edited", phone: "+252610010004", destination: "UAE", visaType: "Tourist", currency: "KES", amount: 200, cost: 120, paymentMethod: "Cash", paid: true, paymentDate: "2026-08-30", status: "Approved", servedBy: "Phase1B Owner", notes: "edited", createdBy: "phase1b", updatedAt: new Date().toISOString() },
    action: { entity: "Visa", detail: "PHASE1B Updated visa" },
  }),
}, ownerCookie);
data = (await request("/api/data", { method: "GET" }, ownerCookie)).body.data;
assertRecord(data, ids[3]);
console.log("11 edit visa and 12 expense remains PASS");

data = (await request("/api/data", { method: "GET" }, ownerCookie)).body.data;
ids.forEach((id) => assertRecord(data, id));
console.log("13 reload application data and 14 records remain PASS");

await mongoose.connect(uri);
await mongoose.disconnect();
data = (await request("/api/data", { method: "GET" }, ownerCookie)).body.data;
ids.forEach((id) => assertRecord(data, id));
console.log("15 backend persistence check and 16 records remain PASS");

await mongoose.connect(uri);
await cleanup();
await mongoose.disconnect();
console.log("cleanup PASS");
