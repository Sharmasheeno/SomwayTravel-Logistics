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
import dailyCloseRoutes from "./routes/dailyClose.js";
import serviceWorkflowRoutes from "./routes/serviceWorkflow.js";
import backupRoutes from "./routes/backups.js";
import receivableRoutes from "./routes/receivables.js";
import { runPhase2Migration } from "./lib/phase2Migration.js";
import { runPhase3Migration } from "./lib/phase3Migration.js";
import { runPhase4Migration } from "./lib/phase4Migration.js";
import { runPhase5Migration } from "./lib/phase5Migration.js";
import { randomToken } from "./utils/tokens.js";
import { runRegisteredMigration } from "./lib/migrations.js";
import { runServiceWorkflowMigration } from "./lib/serviceWorkflowMigration.js";
import { removeLegacyCustomerPaymentSnapshots } from "./lib/accountsReceivableMigration.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

const configuredOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ||
  process.env.PUBLIC_APP_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use((req, res, next) => {
  req.requestId = String(
    req.get("X-Request-Id") || `req_${randomToken(12)}`,
  ).slice(0, 80);
  res.setHeader("X-Request-Id", req.requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  next();
});
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed."));
    },
  }),
);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "2mb" }));
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  const startedAt = Date.now();
  res.on("finish", () => {
    if (process.env.NODE_ENV === "test") return;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const record =
      body.record && typeof body.record === "object" ? body.record : {};
    console.info(
      JSON.stringify({
        event: "api_request",
        requestId: req.requestId,
        method: req.method,
        route: req.originalUrl.split("?")[0],
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
        transactionType: String(
          body.transactionType || (record.id ? "cargo" : ""),
        ).slice(0, 24),
        transactionId: String(body.transactionId || record.id || "").slice(
          0,
          100,
        ),
        branchId: String(
          body.branchId ||
            body.initialPayment?.branchId ||
            record.originBranchId ||
            "",
        ).slice(0, 100),
      }),
    );
  });
  next();
});

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
app.use("/api/daily-close", dailyCloseRoutes);
app.use("/api/workflows", serviceWorkflowRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/receivables", receivableRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} /api${req.path}`,
  });
});

app.use((error, req, res, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = Number(error?.status || error?.statusCode || 500);
  console.error(
    JSON.stringify({
      event: "api_error",
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl?.split("?")[0],
      status,
      message,
    }),
  );
  res.status(status).json({
    error:
      error instanceof SyntaxError && "body" in error
        ? "Request body must be valid JSON."
        : status < 500
          ? message
          : message.includes("buffering timed out") ||
              message.includes("ECONNREFUSED")
            ? "The secure database is still being prepared. Please try again shortly."
            : "The secure service could not complete this request. Please try again.",
  });
});

const startServer = async () => {
  await connectDatabase();
  const migration = await runRegisteredMigration(
    "2026-09-01-phase2-branches-v2",
    runPhase2Migration,
  );
  console.log("Phase 2 branch migration", JSON.stringify(migration));
  const clientMigration = await runRegisteredMigration(
    "2026-09-01-phase3-clients-v1",
    runPhase3Migration,
  );
  console.log(
    "Phase 3 client relationship migration",
    JSON.stringify(clientMigration),
  );
  const cargoMigration = await runRegisteredMigration(
    "2026-09-01-phase4-cargo-v1",
    runPhase4Migration,
  );
  console.log(
    "Phase 4 cargo workflow migration",
    JSON.stringify(cargoMigration),
  );
  const financeMigration = await runRegisteredMigration(
    "2026-09-01-phase5-finance-v3",
    runPhase5Migration,
  );
  console.log("Phase 5 finance migration", JSON.stringify(financeMigration));
  const receivablesMigration = await runRegisteredMigration(
    "2026-09-01-accounts-receivable-ledger-v1",
    removeLegacyCustomerPaymentSnapshots,
  );
  console.log(
    "Accounts receivable ledger migration",
    JSON.stringify(receivablesMigration),
  );
  const workflowMigration = await runRegisteredMigration(
    "2026-09-01-service-workflows-v1",
    runServiceWorkflowMigration,
  );
  console.log("Service workflow migration", JSON.stringify(workflowMigration));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Macruf API running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error(
    "Macruf API could not start because MongoDB is unavailable.",
    error,
  );
  process.exit(1);
});
