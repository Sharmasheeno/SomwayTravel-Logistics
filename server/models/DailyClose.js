import mongoose from "mongoose";

const dailyCloseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    date: { type: String, default: "" },
    office: { type: String, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    paymentMethod: { type: String, enum: ["Cash", "M-Pesa", "Bank", "EVC Plus"], required: true },
    paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", default: null },
    currency: { type: String, enum: ["KES", "USD"], required: true },
    actuallyCounted: { type: Number, default: 0 },
    countedBy: { type: String, default: "" },
    checkedBy: { type: String, default: "" },
    notes: { type: String, default: "" },
    reviewed: { type: Boolean, default: false },
    reviewedBy: { type: String, default: "" },
  },
  { strict: true }
);

dailyCloseSchema.index({ branchId: 1, date: 1, currency: 1, paymentMethodId: 1 }, { unique: true, partialFilterExpression: { branchId: { $type: "objectId" }, paymentMethodId: { $type: "objectId" } } });

const DailyClose = mongoose.models.DailyClose || mongoose.model("DailyClose", dailyCloseSchema);

export default DailyClose;
