import crypto from "node:crypto";

export const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString("hex");

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
