import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ref: { type: String, required: true },
    office: { type: String, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", index: true, default: null },
    type: { type: String, enum: ["Sale", "Refund"], required: true },
    saleDate: { type: String, default: "" },
    passenger: { type: String, default: "" },
    phone: { type: String, default: "" },
    normalizedPhone: { type: String, default: "" },
    route: { type: String, default: "" },
    airlinePnr: { type: String, default: "" },
    travelDate: { type: String, default: "" },
    currency: { type: String, enum: ["KES", "USD"], required: true },
    amount: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["Cash", "M-Pesa", "Bank", "EVC Plus"], required: true },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    paid: { type: Boolean, default: false },
    paymentDate: { type: String, default: "" },
    servedBy: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { strict: true }
);

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);

export default Ticket;
