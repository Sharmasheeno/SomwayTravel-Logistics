import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import Cargo from "../models/Cargo.js";
import { purgeServiceFinance } from "./serviceDeletion.js";
import { isCancelledService } from "./serviceRelationships.js";

// One-time repair: services cancelled BEFORE cancellation reversed finance may
// still have an auto-generated payable and recorded payments attached, which
// kept them counting in reports, receivables and the daily summary. Purge the
// payables of every already-cancelled service. Customer receipts are retained
// for refunds. The service records themselves
// (and their status history) are preserved for audit.
export const runCancelledFinancePurgeMigration = async () => {
  const result = { ticket: 0, visa: 0, cargo: 0 };
  const models = { ticket: Ticket, visa: Visa, cargo: Cargo };
  for (const [type, Model] of Object.entries(models)) {
    for (const row of await Model.find({})) {
      if (!isCancelledService(row)) continue;
      await purgeServiceFinance(type, row.id);
      result[type] += 1;
    }
  }
  return result;
};
