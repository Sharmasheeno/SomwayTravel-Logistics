// Older generated payables encoded the relationship in their stable id.
export const payableService = (bill) => {
  if (bill.transactionType && bill.transactionId)
    return { type: bill.transactionType, id: bill.transactionId };
  const match = /^payable_(ticket|visa|cargo)_(.+)$/.exec(bill.id || "");
  return match ? { type: match[1], id: match[2] } : null;
};

export const serviceKeys = ({ tickets = [], visas = [], cargo = [] }) =>
  new Set([
    ...tickets.map((row) => `ticket:${row.id}`),
    ...visas.map((row) => `visa:${row.id}`),
    ...cargo.map((row) => `cargo:${row.id}`),
  ]);

export const hasPayableParent = (bill, keys) => {
  const parent = payableService(bill);
  return !parent || keys.has(`${parent.type}:${parent.id}`);
};

// A service (ticket, visa or cargo) whose status is cancelled must be reversed
// out of every financial view: revenue, profit, receivables, payables, the
// daily summary and client history. A cancelled service raises no charge and
// carries no cost. Statuses are stored lower-cased but we normalize defensively.
export const isCancelledService = (record) =>
  ["cancelled", "canceled"].includes(
    String(record?.status || "").toLowerCase(),
  );

