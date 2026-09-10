import mongoose from "mongoose";

const agencySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "singleton" },
    agencyName: { type: String, default: "SomWay Travel & Logistics" },
    // Public base URL used to build staff login links (scheme + host + port),
    // e.g. http://169.58.173.197:8080. Owner-editable so it can change without
    // a redeploy. Empty means "derive from the incoming request / env var".
    publicBaseUrl: { type: String, default: "" },
    operatorAccessRoute: { type: String, default: "" },
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
