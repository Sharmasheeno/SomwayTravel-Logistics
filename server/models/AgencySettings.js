import mongoose from "mongoose";

const agencySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "singleton" },
    agencyName: { type: String, default: "SomWay Travel & Logistics" },
    timezone: { type: String, default: "Africa/Mogadishu" },
    businessDayStart: { type: String, default: "07:00" },
    businessDayEnd: { type: String, default: "18:00" },
  },
  { strict: true },
);

const AgencySettings =
  mongoose.models.AgencySettings ||
  mongoose.model("AgencySettings", agencySettingsSchema);

export default AgencySettings;
