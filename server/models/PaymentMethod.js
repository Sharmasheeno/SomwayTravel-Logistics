import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    type: { type: String, enum: ["cash", "mobile_money", "bank", "other"], default: "other" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PaymentMethod = mongoose.models.PaymentMethod || mongoose.model("PaymentMethod", paymentMethodSchema);

export default PaymentMethod;
