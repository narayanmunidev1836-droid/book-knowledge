import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Topic, PREDEFINED_TOPICS } from "./models";

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  const topicCount = await Topic.countDocuments();
  if (topicCount === 0) {
    await Topic.insertMany(
      PREDEFINED_TOPICS.map((name) => ({ name, predefined: true }))
    );
  }

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
      .connect(MONGODB_URI, { bufferCommands: false })
      .then(async (m) => {
        await seed();
        return m;
      });
  }

  globalThis._mongoose.conn = await globalThis._mongoose.promise;
  return globalThis._mongoose.conn;
}
