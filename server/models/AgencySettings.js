import mongoose from "mongoose";

const agencySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "singleton" },
    agencyName: { type: String, default: "Macruf Travel and Cargo Agency" },
  },
  { strict: true }
);

const AgencySettings = mongoose.models.AgencySettings || mongoose.model("AgencySettings", agencySettingsSchema);

export default AgencySettings;
