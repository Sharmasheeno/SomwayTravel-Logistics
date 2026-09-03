import Migration from "../models/Migration.js";

export const runRegisteredMigration = async (key, migrate) => {
  const completed = await Migration.findOne({ key, status: "succeeded" });
  if (completed) return { skipped: true, key, appliedAt: completed.appliedAt, result: completed.result };

  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + 15 * 60_000);
  let lock;
  try {
    lock = await Migration.findOneAndUpdate(
      { key, $or: [{ status: { $in: ["failed"] } }, { lockExpiresAt: { $lte: now } }] },
      { $set: { status: "running", startedAt: now, lockExpiresAt, error: "" } },
      { new: true }
    );
    if (!lock) lock = await Migration.create({ key, status: "running", startedAt: now, lockExpiresAt });
  } catch (error) {
    if (error?.code === 11000) throw Object.assign(new Error(`Migration ${key} is already running.`), { status: 503 });
    throw error;
  }

  try {
    const result = await migrate();
    lock.status = "succeeded";
    lock.appliedAt = new Date();
    lock.result = result;
    lock.error = "";
    await lock.save();
    return { skipped: false, key, result };
  } catch (error) {
    lock.status = "failed";
    lock.error = String(error?.message || error).slice(0, 1000);
    await lock.save();
    throw error;
  }
};
