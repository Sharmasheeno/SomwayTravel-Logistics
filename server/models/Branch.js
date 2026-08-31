import mongoose from "mongoose";

export const BRANCH_CODE_PATTERN = /^[A-Z0-9]{2,6}$/;

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
      match: BRANCH_CODE_PATTERN,
    },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    defaultCurrency: { type: String, enum: ["KES", "USD"], required: true },
    allowedCurrencies: {
      type: [String],
      enum: ["KES", "USD"],
      default: function defaultAllowedCurrencies() {
        return this.defaultCurrency ? [this.defaultCurrency] : [];
      },
    },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    address: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Branch = mongoose.models.Branch || mongoose.model("Branch", branchSchema);

export default Branch;
