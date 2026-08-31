import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    date: { type: String, default: "" },
    supplierId: { type: String, default: "" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    reference: { type: String, default: "" },
    supplier: { type: String, default: "" },
    description: { type: String, default: "" },
    currency: { type: String, enum: ["KES", "USD"], required: true },
    billed: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    dueDate: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { strict: true }
);

const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema);

export default Supplier;
