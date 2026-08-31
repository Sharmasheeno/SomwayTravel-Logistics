import mongoose from "mongoose";

export const redactMongoUri = (uri) => {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = "****";
    if (parsed.username) parsed.username = "****";
    return parsed.toString();
  } catch {
    return uri.includes("@") ? uri.replace(/\/\/[^@]+@/, "//****:****@") : uri;
  }
};

export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/macruf-travel-cargo";

  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected at ${redactMongoUri(mongoUri)}`);
};

export default connectDatabase;
