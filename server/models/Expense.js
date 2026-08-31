import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    date: { type: String, default: "" },
    office: { type: String, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    category: { type: String, default: "" },
    description: { type: String, default: "" },
    currency: { type: String, enum: ["KES", "USD"], required: true },
    amount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["Cash", "M-Pesa", "Bank", "EVC Plus"], required: true },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    inProfitLoss: { type: Boolean, default: true },
    paid: { type: Boolean, default: false },
    paidBy: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdBy: { type: String, default: "" },
  },
  { strict: true }
);

const Expense = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);

export default Expense;
