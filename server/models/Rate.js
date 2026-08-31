import mongoose from "mongoose";

const rateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    originBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    destinationBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    currency: { type: String, enum: ["KES", "USD"], required: true },
    rate: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { strict: true }
);

const Rate = mongoose.models.Rate || mongoose.model("Rate", rateSchema);

export default Rate;
