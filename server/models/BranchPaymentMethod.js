import mongoose from "mongoose";

const branchPaymentMethodSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", required: true, index: true },
    allowedCurrencies: { type: [String], enum: ["KES", "USD"], default: [] },
    isActive: { type: Boolean, default: true },
    countsAsPhysicalCash: { type: Boolean, default: false },
  },
  { timestamps: true }
);

branchPaymentMethodSchema.index({ branchId: 1, paymentMethodId: 1 }, { unique: true });

const BranchPaymentMethod = mongoose.models.BranchPaymentMethod || mongoose.model("BranchPaymentMethod", branchPaymentMethodSchema);

export default BranchPaymentMethod;
