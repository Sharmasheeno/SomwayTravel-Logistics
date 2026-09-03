import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    transactionType: { type: String, enum: ["ticket", "visa", "cargo"], required: true, index: true },
    transactionId: { type: String, required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    flow: { type: String, enum: ["inbound", "outbound"], default: "inbound", index: true },
    currency: { type: String, enum: ["KES", "USD"], required: true },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
    paymentMethod: { type: String, default: "" },
    paymentDate: { type: String, required: true },
    reference: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    receivedByUserId: { type: String, default: "" },
    migrationKey: { type: String, default: "", index: true },
    idempotencyKey: { type: String, trim: true },
    status: { type: String, enum: ["active", "void"], default: "active", index: true },
    voidedAt: { type: String, default: "" },
    voidedByUserId: { type: String, default: "" },
    voidReason: { type: String, default: "" },
  },
  { timestamps: true }
);

paymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
paymentSchema.index({ transactionType: 1, transactionId: 1, status: 1, paymentDate: 1 });
paymentSchema.index({ branchId: 1, currency: 1, paymentMethodId: 1, paymentDate: 1, status: 1 });

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
