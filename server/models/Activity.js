import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    at: { type: String, required: true, index: true },
    userId: { type: String, default: "" },
    userName: { type: String, default: "" },
    action: { type: String, default: "" },
    entity: { type: String, default: "" },
    detail: { type: String, default: "" },
  },
  { strict: true }
);

const Activity = mongoose.models.Activity || mongoose.model("Activity", activitySchema);

export default Activity;
