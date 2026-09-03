export const persistCargoWithInitialPayment = async ({
  record,
  initialPayment,
  user,
  action,
  findCargo,
  findPayment,
  saveCargo,
  createPayment,
  deleteCargo,
}) => {
  if (!initialPayment) return saveCargo({ record, user, action });

  const existing = record?.id ? await findCargo(record.id) : null;
  const idempotencyKey = String(initialPayment.idempotencyKey || "").trim();
  if (idempotencyKey) {
    const previous = await findPayment(idempotencyKey);
    if (previous && existing) return existing;
  }

  const cargoRecord = { ...record };
  delete cargoRecord.paymentMethod;
  delete cargoRecord.paymentMethodId;
  delete cargoRecord.paidByBranchId;
  delete cargoRecord.paidByOffice;

  const saved = await saveCargo({ record: cargoRecord, user, action });
  try {
    await createPayment({
      transactionType: "cargo",
      transactionId: saved.id,
      ...initialPayment,
      idempotencyKey,
      user,
    });
  } catch (error) {
    if (!existing) await deleteCargo(saved.id);
    throw error;
  }
  return saved;
};
