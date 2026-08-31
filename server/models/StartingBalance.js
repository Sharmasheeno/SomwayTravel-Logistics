import mongoose from "mongoose";

const startingBalanceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    office: { type: String, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    method: { type: String, enum: ["Cash", "M-Pesa", "Bank", "EVC Plus"], required: true },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    currency: { type: String, enum: ["KES", "USD"], required: true },
    amount: { type: Number, default: 0 },
  },
  { strict: true }
);

const StartingBalance = mongoose.models.StartingBalance || mongoose.model("StartingBalance", startingBalanceSchema);

export default StartingBalance;
