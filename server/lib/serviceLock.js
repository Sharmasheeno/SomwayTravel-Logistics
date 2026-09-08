const locks = new Map();
// Serialize service edits, settlements and deletion in the Contabo API process.
export const withServiceLock = async (key, work) => {
  const previous = locks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  locks.set(key, queued);
  await previous;
  try { return await work(); }
  finally {
    release();
    if (locks.get(key) === queued) locks.delete(key);
  }
};
