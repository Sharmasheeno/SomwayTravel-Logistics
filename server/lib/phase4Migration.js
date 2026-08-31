import Cargo from "../models/Cargo.js";
import { buildCargoHistoryEntry, cargoStatusLabel, normalizeCargoStatus } from "./cargoWorkflow.js";

export const runPhase4Migration = async () => {
  const result = { cargoScanned: 0, statusNormalized: 0, historyInitialized: 0, claimRecords: 0, skipped: 0, unresolved: [] };
  for (const row of await Cargo.find({})) {
    result.cargoScanned += 1;
    let changed = false;
    const originalStatus = row.status;
    const status = normalizeCargoStatus(originalStatus);
    if (status === "claim") result.claimRecords += 1;
    if (row.status !== status) {
      row.status = status;
      result.statusNormalized += 1;
      changed = true;
    }
    if (!Array.isArray(row.statusHistory) || row.statusHistory.length === 0) {
      row.statusHistory = [buildCargoHistoryEntry({
        toStatus: status,
        user: { id: "", name: "Phase 4 migration" },
        branchId: row.destinationBranchId || row.originBranchId || null,
        note: `Legacy state imported: ${cargoStatusLabel(originalStatus)}`,
      })];
      result.historyInitialized += 1;
      changed = true;
    }
    if (changed) await row.save();
    else result.skipped += 1;
  }
  return result;
};
