import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    mobile: { type: String, trim: true, unique: true, sparse: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["sant", "admin"], default: "sant" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const BookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    author: { type: String, trim: true },
    publisher: { type: String, trim: true },
    cover: { type: String },
    language: { type: String, enum: ["Gujarati", "Hindi", "English", "Sanskrit"], default: "Gujarati" },
    category: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

BookSchema.index({ name: 1, createdBy: 1 }, { unique: true });

const TopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TopicSchema.index({ name: 1, createdBy: 1 }, { unique: true });

const EntrySchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    bookName: { type: String, required: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
    topicName: { type: String, required: true },
    topics: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }], default: [] },
    topicNames: { type: [String], default: [] },
    page: { type: Number },
    image: { type: String, default: "" },
    thumb: { type: String },
    images: { type: [String], default: [] },
    thumbs: { type: [String], default: [] },
    note: { type: String, trim: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadedByName: { type: String, required: true },
  },
  { timestamps: true }
);

EntrySchema.index({ topic: 1, createdAt: -1 });
EntrySchema.index({ topics: 1, createdAt: -1 });

const ActivitySchema = new mongoose.Schema(
  {
    actorId: { type: String, index: true },
    actorName: { type: String },
    role: { type: String },
    action: { type: String, required: true, index: true },
    detail: { type: String },
    targetType: { type: String },
    targetId: { type: String },
  },
  { timestamps: true }
);

ActivitySchema.index({ createdAt: -1 });

const SettingSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: "Book Knowledge" },
    tagline: { type: String, default: "Notes & Images for Sants" },
  },
  { timestamps: true }
);

function safeModel(name, schema) {
  const existing = mongoose.models[name];
  if (existing) {
    const before = Object.keys(existing.schema.paths).sort().join("|");
    const after = Object.keys(schema.paths).sort().join("|");
    if (before !== after) {
      mongoose.deleteModel(name);
    }
  }
  return mongoose.models[name] || mongoose.model(name, schema);
}

export const User = safeModel("User", UserSchema);
export const Book = safeModel("Book", BookSchema);
export const Topic = safeModel("Topic", TopicSchema);
export const Entry = safeModel("Entry", EntrySchema);
export const Activity = safeModel("Activity", ActivitySchema);
export const Setting = safeModel("Setting", SettingSchema);
