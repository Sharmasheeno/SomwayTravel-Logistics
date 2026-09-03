import Cargo from "../models/Cargo.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";

export const removeLegacyCustomerPaymentSnapshots = async () => {
  const [tickets, visas, cargo] = await Promise.all(
    [Ticket, Visa, Cargo].map((Model) =>
      Model.collection.updateMany(
        { ledgerPaid: { $exists: true } },
        { $unset: { ledgerPaid: "" } },
      ),
    ),
  );
  return {
    tickets: tickets.modifiedCount,
    visas: visas.modifiedCount,
    cargo: cargo.modifiedCount,
  };
};
