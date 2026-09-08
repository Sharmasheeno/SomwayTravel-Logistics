import mongoose from "mongoose";

// Durable intent lets an interrupted cascade resume on standalone MongoDB too.
const schema = new mongoose.Schema({
  _id: String,
  transactionType: { type: String, enum: ["ticket", "visa", "cargo"], required: true },
  transactionId: { type: String, required: true },
});
export default mongoose.models.ServiceDeletion || mongoose.model("ServiceDeletion", schema);
