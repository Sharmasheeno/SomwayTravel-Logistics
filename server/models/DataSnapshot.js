import mongoose from "mongoose";

const dataSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    at: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    actorId: { type: String, default: "" },
    actorName: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    entityCounts: {
      tickets: { type: Number, default: 0 },
      cargo: { type: Number, default: 0 },
      visas: { type: Number, default: 0 },
      expenses: { type: Number, default: 0 },
      suppliers: { type: Number, default: 0 },
      clients: { type: Number, default: 0 },
      closes: { type: Number, default: 0 },
      rates: { type: Number, default: 0 },
      startingBalances: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
    },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { strict: true }
);

const DataSnapshot = mongoose.models.DataSnapshot || mongoose.model("DataSnapshot", dataSnapshotSchema);

export default DataSnapshot;
