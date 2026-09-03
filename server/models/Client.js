import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    normalizedPhone: { type: String, default: "", index: true },
    phoneIsValid: { type: Boolean, default: false },
    email: { type: String, default: "" },
    homeOffice: { type: String, required: true },
    homeBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    preferredLanguage: { type: String, enum: ["so", "en"], default: "so" },
    isActive: { type: Boolean, default: true },
    archivedAt: { type: String, default: "" },
    archivedByUserId: { type: String, default: "" },
    archiveReason: { type: String, default: "" },
    type: { type: String, enum: ["Trader", "Diaspora", "Corporate", "Individual"], default: "Individual" },
    notes: { type: String, default: "" },
  },
  { strict: true, timestamps: true }
);

const Client = mongoose.models.Client || mongoose.model("Client", clientSchema);

export default Client;
