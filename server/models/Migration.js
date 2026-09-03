import mongoose from "mongoose";

const migrationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  status: { type: String, enum: ["running", "succeeded", "failed"], required: true, index: true },
  startedAt: { type: Date, required: true },
  appliedAt: { type: Date, default: null },
  lockExpiresAt: { type: Date, required: true },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  error: { type: String, default: "" },
}, { timestamps: true });

const Migration = mongoose.models.Migration || mongoose.model("Migration", migrationSchema);
export default Migration;
