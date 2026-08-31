import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../server/models/User.js";
import Branch from "../server/models/Branch.js";
import { seedCoreBranches } from "../server/lib/branches.js";

dotenv.config();

const defaultUsers = (nairobiBranchId) => [
  {
    name: "Abdikadir Hassan",
    email: "abdikadirhassan2015@gmail.com",
    password: "Owner@2026!",
    role: "owner",
    isOwner: true,
  },
  {
    name: "Macruf Owner",
    email: "owner2@macruf.local",
    password: "Owner@2026!",
    role: "owner",
    isOwner: true,
  },
  {
    name: "Operations Officer",
    email: "officer@macruf.local",
    password: "Officer@2026!",
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
