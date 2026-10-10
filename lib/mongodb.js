import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Topic } from "./models";

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  // Legacy cleanup: no predefined/shared topics — everything is user-owned.
  await Topic.collection
    .deleteMany({ $or: [{ predefined: true }, { createdBy: null }] })
    .catch(() => {});
  // Drop old global unique index on topic name so each user can reuse names.
  await Topic.collection.dropIndex("name_1").catch(() => {});

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!existing) {
      await User.create({
        name: process.env.ADMIN_NAME || "admin",
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: "admin",
        active: true,
      });
    }
  }
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing — add it in .env.local");
  }

  if (globalThis._mongoose?.conn) {
    return globalThis._mongoose.conn;
  }

  if (!globalThis._mongoose) {
    globalThis._mongoose = { conn: null, promise: null };
  }

  if (!globalThis._mongoose.promise) {
    globalThis._mongoose.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        // Fail over to another replica-set node quickly on flaky networks.
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 10000,
        family: 4,
      })
      .then(async (m) => {
        await seed();
        return m;
      });
  }

  try {
    globalThis._mongoose.conn = await globalThis._mongoose.promise;
  } catch (err) {
    // Don't cache a failed attempt — let the next request retry.
    globalThis._mongoose.promise = null;
    throw err;
  }
  return globalThis._mongoose.conn;
}
