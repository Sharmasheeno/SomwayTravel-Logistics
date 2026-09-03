import mongoose from "mongoose";

const dailySummarySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    branch: { type: String, required: true },
    businessDate: { type: String, required: true, index: true },
    currency: { type: String, enum: ["KES", "USD"], required: true },
    timezone: { type: String, required: true },
    businessDayStart: { type: String, required: true },
    businessDayEnd: { type: String, required: true },
    openingBalance: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    moneyReceived: { type: Number, default: 0 },
    /** Opening float adjusted by today's movement in receivables and payables. */
    closedAmount: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    accountsPayable: { type: Number, default: 0 },
    accountsReceivable: { type: Number, default: 0 },
    directCost: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    expectedClosing: { type: Number, default: 0 },
    revenueByService: { type: [mongoose.Schema.Types.Mixed], default: [] },
    paymentsByMethod: { type: [mongoose.Schema.Types.Mixed], default: [] },
    expensesByCategory: { type: [mongoose.Schema.Types.Mixed], default: [] },
    status: {
      type: String,
      enum: ["closed", "corrected"],
      default: "closed",
      index: true,
    },
    systemGenerated: { type: Boolean, default: true },
    calculatedAt: { type: String, required: true },
    closedAt: { type: String, required: true },
    version: { type: Number, default: 1, min: 1 },
    correctionHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { strict: true, timestamps: true },
);

dailySummarySchema.index(
  { branchId: 1, businessDate: 1, currency: 1 },
  { unique: true },
);

const DailySummary =
  mongoose.models.DailySummary ||
  mongoose.model("DailySummary", dailySummarySchema);

export default DailySummary;
