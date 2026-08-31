import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDatabase from "./config/db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import dataRoutes from "./routes/data.js";
import entityRoutes from "./routes/entities.js";
import branchRoutes from "./routes/branches.js";
import cargoRoutes from "./routes/cargo.js";
import clientRoutes from "./routes/clients.js";
import notificationRoutes from "./routes/notifications.js";
import paymentRoutes from "./routes/payments.js";
import publicRoutes from "./routes/public.js";
import reportRoutes from "./routes/reports.js";
import { runPhase2Migration } from "./lib/phase2Migration.js";
import { runPhase3Migration } from "./lib/phase3Migration.js";
import { runPhase4Migration } from "./lib/phase4Migration.js";
import { runPhase5Migration } from "./lib/phase5Migration.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "macruf-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/entities", entityRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/cargo", cargoRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/reports", reportRoutes);

app.use((error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error("Macruf API error", error);
  res.status(500).json({ error: message.includes("buffering timed out") || message.includes("ECONNREFUSED")
    ? "The secure database is still being prepared. Please try again shortly."
    : "The secure service could not complete this request. Please try again." });
});

const startServer = async () => {
  await connectDatabase();
  const migration = await runPhase2Migration();
  console.log("Phase 2 branch migration", JSON.stringify(migration));
  const clientMigration = await runPhase3Migration();
  console.log("Phase 3 client relationship migration", JSON.stringify(clientMigration));
  const cargoMigration = await runPhase4Migration();
  console.log("Phase 4 cargo workflow migration", JSON.stringify(cargoMigration));
  const financeMigration = await runPhase5Migration();
  console.log("Phase 5 finance migration", JSON.stringify(financeMigration));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Macruf API running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Macruf API could not start because MongoDB is unavailable.", error);
  process.exit(1);
});
