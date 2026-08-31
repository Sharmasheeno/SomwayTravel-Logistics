import mongoose from "mongoose";

const supplierPaymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    supplierBillId: { type: String, required: true, index: true },
    supplierId: { type: String, default: "" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["KES", "USD"], required: true },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
    paymentMethod: { type: String, default: "" },
    paymentDate: { type: String, required: true },
    reference: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    paidByUserId: { type: String, default: "" },
    migrationKey: { type: String, default: "", index: true },
    status: { type: String, enum: ["active", "void"], default: "active", index: true },
    voidedAt: { type: String, default: "" },
    voidedByUserId: { type: String, default: "" },
    voidReason: { type: String, default: "" },
  },
  { timestamps: true }
);

const SupplierPayment = mongoose.models.SupplierPayment || mongoose.model("SupplierPayment", supplierPaymentSchema);

export default SupplierPayment;
