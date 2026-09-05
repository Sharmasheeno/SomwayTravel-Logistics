import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../server/models/User.js";
import Branch from "../server/models/Branch.js";
import { seedCoreBranches } from "../server/lib/branches.js";
import { generateStrongPassword } from "../server/utils/password.js";

dotenv.config();

// Seed credentials are never written down in this file. Each password comes
// from the environment, and anything not supplied is generated fresh and
// printed once at the end of the run. A password committed here would be a
// published password: this repository is readable by anyone who can clone it.
const seedEmail = (key, fallback) =>
  String(process.env[key] || fallback).trim().toLowerCase();
const seedPassword = (key) => String(process.env[key] || "") || generateStrongPassword();

const defaultUsers = (nairobiBranchId) => [
  {
    name: process.env.SEED_OWNER_NAME || "Primary Owner",
    email: seedEmail("SEED_OWNER_EMAIL", "owner@macruf.local"),
    password: seedPassword("SEED_OWNER_PASSWORD"),
    role: "owner",
    isOwner: true,
  },
  {
    name: "Macruf Owner",
    email: seedEmail("SEED_OWNER2_EMAIL", "owner2@macruf.local"),
    password: seedPassword("SEED_OWNER2_PASSWORD"),
    role: "owner",
    isOwner: true,
  },
  {
    name: "Operations Officer",
    email: seedEmail("SEED_OFFICER_EMAIL", "officer@macruf.local"),
    password: seedPassword("SEED_OFFICER_PASSWORD"),
    role: "operator",
    isOwner: false,
    assignedBranchId: nairobiBranchId,
  },
];
const seedDefaultUsers = async () => {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/macruf-travel-cargo";

  await mongoose.connect(mongoUri);
  await seedCoreBranches();
  const nairobi = await Branch.findOne({ code: "NBO" });

  for (const userData of defaultUsers(nairobi?._id || null)) {
    const email = userData.email.toLowerCase();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.name = userData.name;
      existingUser.password = userData.password;
      existingUser.role = userData.role;
      existingUser.isOwner = userData.isOwner;
      existingUser.assignedBranchId = userData.assignedBranchId || null;
      await existingUser.save();
      console.log(`Updated user: ${email}`);
      continue;
    }

    const user = new User({ ...userData, email });
    await user.save();
    console.log(`Created user: ${email}`);
  }

  console.log("\nDefault login accounts:");
  for (const userData of defaultUsers(nairobi?._id || null)) {
    console.log(`${userData.name} | ${userData.email} | ${userData.password} | ${userData.role}`);
  }

  await mongoose.disconnect();
};

seedDefaultUsers().catch((error) => {
  console.error("Failed to seed default users.");
  console.error(error);
  process.exit(1);
});
