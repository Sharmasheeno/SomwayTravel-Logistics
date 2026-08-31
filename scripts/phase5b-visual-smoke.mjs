import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Branch from "../server/models/Branch.js";
import Payment from "../server/models/Payment.js";
import PaymentMethod from "../server/models/PaymentMethod.js";
import Session from "../server/models/Session.js";
import Ticket from "../server/models/Ticket.js";
import User from "../server/models/User.js";
import Visa from "../server/models/Visa.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/macruf-travel-cargo";

await mongoose.connect(uri);

if (process.argv.includes("--cleanup")) {
  const smokeUser = await User.findOne({ email: "phase5b-smoke-owner@example.com" });
  await Promise.all([
    Ticket.deleteMany({ id: /^p5b-/ }),
    Visa.deleteMany({ id: /^p5b-/ }),
    Payment.deleteMany({ id: /^p5b-/ }),
    smokeUser ? Session.deleteMany({ userId: smokeUser._id }) : Promise.resolve(),
    User.deleteOne({ email: "phase5b-smoke-owner@example.com" }),
  ]);
  console.log("phase5b visual smoke cleanup complete");
  await mongoose.disconnect();
  process.exit(0);
}

const [nbo, mog, cash, mpesa, evc] = await Promise.all([
  Branch.findOne({ code: "NBO" }),
  Branch.findOne({ code: "MOG" }),
  PaymentMethod.findOne({ code: "cash" }),
  PaymentMethod.findOne({ code: "mpesa" }),
  PaymentMethod.findOne({ code: "evc_plus" }),
]);

if (!nbo || !mog || !cash || !mpesa || !evc) {
  throw new Error("Phase 5B smoke requires migrated branches and payment methods.");
}

await User.findOneAndUpdate(
  { email: "phase5b-smoke-owner@example.com" },
  {
    $set: {
      name: "Phase5B Smoke Owner",
      email: "phase5b-smoke-owner@example.com",
      password: await bcrypt.hash("Phase5BSmoke123!", 10),
      role: "owner",
      isOwner: true,
      active: true,
    },
  },
  { upsert: true, setDefaultsOnInsert: true }
);

await Promise.all([
  Ticket.deleteMany({ id: /^p5b-/ }),
  Visa.deleteMany({ id: /^p5b-/ }),
  Payment.deleteMany({ id: /^p5b-/ }),
]);

await Ticket.insertMany([
  { id: "p5b-nbo-kes", ref: "P5B-NBO-KES", office: nbo.name, branchId: nbo._id, type: "Sale", saleDate: "2026-08-15", passenger: "Smoke A", phone: "+254700000101", currency: "KES", amount: 10000, cost: 7000, paymentMethod: "Cash", paymentMethodId: cash._id, paid: false },
  { id: "p5b-mog-usd", ref: "P5B-MOG-USD", office: mog.name, branchId: mog._id, type: "Sale", saleDate: "2026-08-15", passenger: "Smoke B", phone: "+252610000101", currency: "USD", amount: 200, cost: 120, paymentMethod: "EVC Plus", paymentMethodId: evc._id, paid: false },
]);

await Visa.create({ id: "p5b-nbo-usd", ref: "P5B-VISA-USD", office: nbo.name, branchId: nbo._id, type: "Sale", appDate: "2026-08-15", applicant: "Smoke C", phone: "+254700000102", destination: "UAE", visaType: "Visit", currency: "USD", amount: 100, cost: 40, paymentMethod: "Cash", paymentMethodId: cash._id, paid: false, status: "Submitted" });

await Payment.insertMany([
  { id: "p5b-pay-cash", branchId: nbo._id, transactionType: "ticket", transactionId: "p5b-nbo-kes", amount: 1000, currency: "KES", paymentMethodId: cash._id, paymentMethod: "Cash", paymentDate: "2026-08-15", status: "active" },
  { id: "p5b-pay-mpesa", branchId: nbo._id, transactionType: "ticket", transactionId: "p5b-nbo-kes", amount: 2000, currency: "KES", paymentMethodId: mpesa._id, paymentMethod: "M-Pesa", paymentDate: "2026-08-15", status: "active" },
  { id: "p5b-pay-usd", branchId: nbo._id, transactionType: "visa", transactionId: "p5b-nbo-usd", amount: 50, currency: "USD", paymentMethodId: cash._id, paymentMethod: "Cash", paymentDate: "2026-08-15", status: "active" },
  { id: "p5b-pay-evc", branchId: mog._id, transactionType: "ticket", transactionId: "p5b-mog-usd", amount: 100, currency: "USD", paymentMethodId: evc._id, paymentMethod: "EVC Plus", paymentDate: "2026-08-15", status: "active" },
]);

console.log(JSON.stringify({ username: "phase5b-smoke-owner@example.com", password: "Phase5BSmoke123!", nbo: nbo._id.toString(), mog: mog._id.toString() }, null, 2));
await mongoose.disconnect();
