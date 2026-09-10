// One-off owner/staff password reset for when someone is locked out and there
// is no self-service "forgot password" flow. Run it ON THE SERVER, where the
// MongoDB connection string lives — it never ships a password in the repo.
//
// Usage (from the project root on the server):
//
//   RESET_EMAIL="macruufmanbile@gmail.com" \
//   RESET_PASSWORD="YourNewStrongPass1!" \
//   node scripts/reset-owner-password.js
//
// Notes:
//   * MONGODB_URI is read from the environment / .env (same as the app), so the
//     live database name (macruf-travel-cargo) is used automatically.
//   * The password is validated against the app's own policy and hashed by the
//     User model's pre-save hook — identical to a normal password change.
//   * All of that user's existing sessions are revoked, so anyone using the old
//     login is signed out immediately.
//   * If RESET_PASSWORD is omitted, a strong password is generated and printed
//     once. Copy it, log in, then change it from Agency Settings.

import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../server/models/User.js";
import Session from "../server/models/Session.js";
import {
  passwordProblem,
  generateStrongPassword,
} from "../server/utils/password.js";

dotenv.config();

const run = async () => {
  const email = String(process.env.RESET_EMAIL || "").trim().toLowerCase();
  if (!email) {
    console.error(
      'Set RESET_EMAIL, e.g. RESET_EMAIL="owner@example.com" node scripts/reset-owner-password.js',
    );
    process.exit(1);
  }

  // Use the supplied password, or generate a strong one to print at the end.
  const generated = !process.env.RESET_PASSWORD;
  const newPassword = generated
    ? generateStrongPassword()
    : String(process.env.RESET_PASSWORD);

  const problem = passwordProblem(newPassword);
  if (problem) {
    console.error(`Rejected password: ${problem}`);
    process.exit(1);
  }

  const mongoUri =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/macruf-travel-cargo";
  await mongoose.connect(mongoUri);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`No account found for ${email}.`);
      const others = await User.find({}, { email: 1, role: 1, _id: 0 }).lean();
      if (others.length) {
        console.error("Accounts that do exist:");
        for (const row of others) {
          console.error(`  - ${row.email} (${row.role})`);
        }
      }
      process.exit(1);
    }

    user.password = newPassword; // hashed by the User pre-save hook
    await user.save();

    // Revoke every existing session for this user so the old login stops working.
    const revoked = await Session.deleteMany({ userId: user._id });

    console.log("");
    console.log("Password reset successful.");
    console.log(`  Account : ${user.email} (${user.role})`);
    console.log(`  Sessions revoked: ${revoked.deletedCount ?? 0}`);
    if (generated) {
      console.log("");
      console.log("  New password (shown once — copy it now):");
      console.log(`      ${newPassword}`);
      console.log("");
      console.log(
        "  Log in with it, then change it from Agency Settings > Owner security.",
      );
    } else {
      console.log("  New password: (the RESET_PASSWORD you supplied)");
    }
    console.log("");
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error("Reset failed:", error.message);
  process.exit(1);
});
