import mongoose from "mongoose";

const referenceCounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

const ReferenceCounter =
  mongoose.models.ReferenceCounter ||
  mongoose.model("ReferenceCounter", referenceCounterSchema);

export default ReferenceCounter;
