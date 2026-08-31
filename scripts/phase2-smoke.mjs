import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDatabase from "../server/config/db.js";
import Branch from "../server/models/Branch.js";
import User from "../server/models/User.js";
import Ticket from "../server/models/Ticket.js";
import Cargo from "../server/models/Cargo.js";
import Session from "../server/models/Session.js";

dotenv.config();

const base = process.env.PHASE2_API_BASE || "http://127.0.0.1:5056";
const password = "Phase2Smoke!2026";
const stamp = Date.now().toString(36);
const ownerEmail = `phase2.owner.${stamp}@macruf.test`;
const operatorEmail = `phase2.operator.${stamp}@macruf.test`;

const request = async (path, options = {}, cookie = "") => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  return { response, payload, cookie: response.headers.get("set-cookie")?.split(";")[0] || cookie };
};

const assertPass = (condition, label) => {
  if (!condition) throw new Error(`${label} FAIL`);
  console.log(`${label} PASS`);
};

const cleanup = async () => {
  await Ticket.deleteMany({ id: /^phase2-/ });
  await Cargo.deleteMany({ id: /^phase2-/ });
  await User.deleteMany({ email: { $in: [ownerEmail, operatorEmail] } });
  await Branch.deleteOne({ code: "HGA" });
  await Session.deleteMany({});
};

await connectDatabase();
await cleanup();
await User.create({ name: "Phase 2 Owner", email: ownerEmail, password, role: "owner", isOwner: true, active: true });
await mongoose.disconnect();

try {
  let login = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: ownerEmail, password }) });
  assertPass(login.response.ok, "1 owner login");
  const ownerCookie = login.cookie;

  let branches = await request("/api/branches", {}, ownerCookie);
  assertPass(branches.response.ok && branches.payload.branches.length >= 2, "2 owner lists branches");

  const hgaBody = { name: "Hargeisa Office", code: "HGA", city: "Hargeisa", country: "Somalia", defaultCurrency: "USD" };
  const hga = await request("/api/branches", { method: "POST", body: JSON.stringify(hgaBody) }, ownerCookie);
  assertPass(hga.response.status === 201 && hga.payload.branch.code === "HGA", "3 owner creates Hargeisa");

  const userCreate = await request("/api/admin/users", { method: "POST", body: JSON.stringify({ name: "Test Hargeisa Operator", username: operatorEmail, password, role: "operator", assignedBranchId: hga.payload.branch.id }) }, ownerCookie);
  assertPass(userCreate.response.status === 201 && userCreate.payload.user.role === "operator" && userCreate.payload.user.assignedBranchId === hga.payload.branch.id, "4 owner creates Hargeisa operator");

  login = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: operatorEmail, password }) });
  assertPass(login.response.ok, "5 operator login");
  const operatorCookie = login.cookie;

  const operatorBranches = await request("/api/branches", {}, operatorCookie);
  assertPass(operatorBranches.response.ok && operatorBranches.payload.branches.every((branch) => branch.code === "HGA"), "6 operator branch context is Hargeisa only");

  const blockedBranch = await request("/api/branches", { method: "POST", body: JSON.stringify({ name: "Blocked", code: "BLK", city: "Blocked", country: "Somalia", defaultCurrency: "USD" }) }, operatorCookie);
  assertPass(blockedBranch.response.status === 403, "7 operator cannot create branch");

  branches = await request("/api/branches", {}, ownerCookie);
  const nairobi = branches.payload.branches.find((branch) => branch.code === "NBO");
  const ticket = await request("/api/entities/tickets", { method: "POST", body: JSON.stringify({ record: { id: "phase2-ticket", ref: "TKT-HGA-SMOKE", office: "Nairobi Office", branchId: nairobi.id, type: "Sale", saleDate: "2026-08-30", passenger: "Payload Tamper", phone: "+252610000002", route: "HGA-NBO", currency: "USD", amount: 1, paymentMethod: "Cash" } }) }, operatorCookie);
  assertPass(ticket.response.ok && ticket.payload.data.tickets[0].branchId === hga.payload.branch.id, "8 operator ticket is forced to Hargeisa");

  const cargo = await request("/api/entities/cargo", { method: "POST", body: JSON.stringify({ record: { id: "phase2-cargo", tracking: "HGA-SMOKE", origin: "Hargeisa Office", destination: "Nairobi Office", originBranchId: hga.payload.branch.id, destinationBranchId: nairobi.id, dateIn: "2026-08-30", sender: "Sender", senderPhone: "+252610000003", receiver: "Receiver", contents: "Docs", weight: 1, currency: "USD", rate: 1, payType: "Prepaid", paymentMethod: "Cash", paidByOffice: "Hargeisa Office", paidByBranchId: hga.payload.branch.id } }) }, operatorCookie);
  assertPass(cargo.response.ok && cargo.payload.data.cargo.some((item) => item.originBranchId === hga.payload.branch.id && item.destinationBranchId === nairobi.id), "9 Hargeisa to Nairobi cargo route");

  const ownerData = await request("/api/data", {}, ownerCookie);
  assertPass(ownerData.response.ok && ownerData.payload.data.branches.some((branch) => branch.code === "HGA"), "10 owner sees all branches");
} finally {
  await connectDatabase();
  await cleanup();
  await mongoose.disconnect();
  console.log("cleanup PASS");
}
