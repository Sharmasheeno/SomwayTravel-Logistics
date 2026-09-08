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
