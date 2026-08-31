import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDatabase from "../server/config/db.js";
import Branch from "../server/models/Branch.js";
import User from "../server/models/User.js";
import Cargo from "../server/models/Cargo.js";
import Client from "../server/models/Client.js";
import Session from "../server/models/Session.js";

dotenv.config();

const base = process.env.PHASE4_API_BASE || "http://127.0.0.1:5058";
const password = "Phase4Smoke!2026";
const stamp = Date.now().toString(36);
const ownerEmail = `phase4.owner.${stamp}@macruf.test`;
const nboEmail = `phase4.nbo.${stamp}@macruf.test`;
const mogEmail = `phase4.mog.${stamp}@macruf.test`;
const hgaEmail = `phase4.hga.${stamp}@macruf.test`;

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
  await Cargo.deleteMany({ id: /^phase4-/ });
  await Client.deleteMany({ normalizedPhone: { $in: ["+252612349901", "+252612349902", "+254712349901", "+254712349902"] } });
  await User.deleteMany({ email: { $in: [ownerEmail, nboEmail, mogEmail, hgaEmail] } });
  await Branch.deleteOne({ code: "H4A" });
  await Session.deleteMany({});
};

await connectDatabase();
await cleanup();
const nbo = await Branch.findOne({ code: "NBO" });
const mog = await Branch.findOne({ code: "MOG" });
let hga = await Branch.findOne({ code: "H4A" });
if (!hga) hga = await Branch.create({ name: "Phase 4 Hargeisa Office", code: "H4A", city: "Hargeisa", country: "Somalia", defaultCurrency: "USD", isActive: true });
await User.create({ name: "Phase 4 Owner", email: ownerEmail, password, role: "owner", isOwner: true, active: true });
await User.create({ name: "Phase 4 Nairobi Operator", email: nboEmail, password, role: "operator", assignedBranchId: nbo._id, active: true });
await User.create({ name: "Phase 4 Mogadishu Operator", email: mogEmail, password, role: "operator", assignedBranchId: mog._id, active: true });
await User.create({ name: "Phase 4 Hargeisa Operator", email: hgaEmail, password, role: "operator", assignedBranchId: hga._id, active: true });
await mongoose.disconnect();

try {
  const ownerLogin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: ownerEmail, password }) });
  assertPass(ownerLogin.response.ok, "1 owner login");
  const nboLogin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: nboEmail, password }) });
  assertPass(nboLogin.response.ok, "2 Nairobi operator login");
  const mogLogin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: mogEmail, password }) });
  assertPass(mogLogin.response.ok, "3 Mogadishu operator login");
  const hgaLogin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: hgaEmail, password }) });
  assertPass(hgaLogin.response.ok, "4 Hargeisa operator login");

  const ownerCookie = ownerLogin.cookie;
  const nboCookie = nboLogin.cookie;
  const mogCookie = mogLogin.cookie;
  const hgaCookie = hgaLogin.cookie;

  const branches = await request("/api/branches", {}, ownerCookie);
  const nboBranch = branches.payload.branches.find((branch) => branch.code === "NBO");
  const mogBranch = branches.payload.branches.find((branch) => branch.code === "MOG");
  const hgaBranch = branches.payload.branches.find((branch) => branch.code === "H4A");

  const created = await request("/api/entities/cargo", { method: "POST", body: JSON.stringify({ record: { id: "phase4-nbo-mog", tracking: "P4-NBO-MOG", origin: nboBranch.name, destination: mogBranch.name, originBranchId: nboBranch.id, destinationBranchId: mogBranch.id, dateIn: "2026-08-30", sender: "Phase Four Sender", senderPhone: "+254712349901", receiver: "Phase Four Receiver", receiverPhone: "+252612349901", contents: "Docs", weight: 1, currency: "USD", rate: 1, payType: "Prepaid", paymentMethod: "Cash", paidByOffice: nboBranch.name, paidByBranchId: nboBranch.id, status: "delivered" } }) }, nboCookie);
  assertPass(created.response.ok && created.payload.data.cargo.some((item) => item.id === "phase4-nbo-mog" && item.status === "received"), "5 create starts Received");

  const dispatch = await request("/api/cargo/phase4-nbo-mog/transition", { method: "POST", body: JSON.stringify({ status: "in_transit" }) }, nboCookie);
  assertPass(dispatch.response.ok && dispatch.payload.data.cargo.some((item) => item.id === "phase4-nbo-mog" && item.status === "in_transit"), "6 origin dispatch");
  const badDispatch = await request("/api/cargo/phase4-nbo-mog/transition", { method: "POST", body: JSON.stringify({ status: "arrived" }) }, nboCookie);
  assertPass(badDispatch.response.status === 403, "7 origin cannot mark destination arrival");
  const incoming = await request("/api/data", {}, mogCookie);
  assertPass(incoming.payload.data.cargo.some((item) => item.id === "phase4-nbo-mog"), "8 destination sees incoming");
  const arrived = await request("/api/cargo/phase4-nbo-mog/transition", { method: "POST", body: JSON.stringify({ status: "arrived" }) }, mogCookie);
  assertPass(arrived.response.ok, "9 destination marks arrived");
  const ready = await request("/api/cargo/phase4-nbo-mog/transition", { method: "POST", body: JSON.stringify({ status: "ready_for_collection" }) }, mogCookie);
  assertPass(ready.response.ok, "10 destination marks ready");
  const delivered = await request("/api/cargo/phase4-nbo-mog/transition", { method: "POST", body: JSON.stringify({ status: "delivered" }) }, mogCookie);
  assertPass(delivered.response.ok && delivered.payload.data.cargo.some((item) => item.id === "phase4-nbo-mog" && item.status === "delivered" && item.statusHistory.length >= 4), "11 delivered persists with history");

  const publicTrack = await request("/api/public/track?kind=cargo&reference=P4-NBO-MOG");
  assertPass(publicTrack.response.ok && publicTrack.payload.record.status === "Delivered" && Array.isArray(publicTrack.payload.record.timeline), "12 public tracking uses safe timeline");

  const hgaCreated = await request("/api/entities/cargo", { method: "POST", body: JSON.stringify({ record: { id: "phase4-hga-nbo", tracking: "P4-HGA-NBO", origin: hgaBranch.name, destination: nboBranch.name, originBranchId: hgaBranch.id, destinationBranchId: nboBranch.id, dateIn: "2026-08-30", sender: "Phase Four HGA", senderPhone: "+252612349902", receiver: "Phase Four NBO", receiverPhone: "+254712349902", contents: "Docs", weight: 1, currency: "USD", rate: 1, payType: "Prepaid", paymentMethod: "Cash", paidByOffice: hgaBranch.name, paidByBranchId: hgaBranch.id } }) }, hgaCookie);
  assertPass(hgaCreated.response.ok, "13 Hargeisa creates cargo");
  assertPass((await request("/api/cargo/phase4-hga-nbo/transition", { method: "POST", body: JSON.stringify({ status: "in_transit" }) }, hgaCookie)).response.ok, "14 Hargeisa dispatches");
  assertPass((await request("/api/cargo/phase4-hga-nbo/transition", { method: "POST", body: JSON.stringify({ status: "arrived" }) }, nboCookie)).response.ok, "15 Nairobi receives Hargeisa cargo");

  const nboToHga = await request("/api/entities/cargo", { method: "POST", body: JSON.stringify({ record: { id: "phase4-nbo-hga", tracking: "P4-NBO-HGA", origin: nboBranch.name, destination: hgaBranch.name, originBranchId: nboBranch.id, destinationBranchId: hgaBranch.id, dateIn: "2026-08-30", sender: "Phase Four NBO", senderPhone: "+254712349902", receiver: "Phase Four HGA", receiverPhone: "+252612349902", contents: "Docs", weight: 1, currency: "USD", rate: 1, payType: "Prepaid", paymentMethod: "Cash", paidByOffice: nboBranch.name, paidByBranchId: nboBranch.id } }) }, nboCookie);
  assertPass(nboToHga.response.ok, "16 Nairobi creates Hargeisa cargo");
  assertPass((await request("/api/cargo/phase4-nbo-hga/transition", { method: "POST", body: JSON.stringify({ status: "in_transit" }) }, nboCookie)).response.ok, "17 Nairobi dispatches to Hargeisa");
  assertPass((await request("/api/cargo/phase4-nbo-hga/transition", { method: "POST", body: JSON.stringify({ status: "arrived" }) }, hgaCookie)).response.ok, "18 Hargeisa receives Nairobi cargo");
} finally {
  await connectDatabase();
  await cleanup();
  await mongoose.disconnect();
  console.log("cleanup PASS");
}
