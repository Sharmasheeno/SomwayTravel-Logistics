import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomToken } from "../utils/tokens.js";

export const ROLES = ["owner", "operator", "consultant", "officer_nairobi", "officer_mogadishu"];
export const STAFF_ROLES = ["owner", "operator"];
export const LEGACY_STAFF_ROLES = ["consultant", "officer_nairobi", "officer_mogadishu"];
export const OWNER_EMAIL = "abdikadirhassan2015@gmail.com";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ROLES,
      default: "operator",
    },
    assignedBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    isOwner: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    loginToken: {
      type: String,
      unique: true,
      default: () => randomToken(18),
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject(includeLink = false) {
  return {
    id: this._id.toString(),
    name: this.name,
    username: this.email,
    role: this.role,
    assignedBranchId: this.assignedBranchId ? this.assignedBranchId.toString() : null,
    active: this.active,
    ...(includeLink ? { loginToken: this.loginToken } : {}),
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
  };
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
