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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const TopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    predefined: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const EntrySchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    bookName: { type: String, required: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
    topicName: { type: String, required: true },
    topics: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }], default: [] },
    topicNames: { type: [String], default: [] },
    page: { type: Number },
    image: { type: String, required: true },
    note: { type: String, trim: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadedByName: { type: String, required: true },
  },
  { timestamps: true }
);

EntrySchema.index({ topic: 1, createdAt: -1 });
EntrySchema.index({ topics: 1, createdAt: -1 });

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

export const PREDEFINED_TOPICS = [
  "Bhakti",
  "Satsang",
  "Seva",
  "Vairagya",
  "Dharma",
  "Niyam",
  "Guru Bhakti",
  "Ekantik Dharma",
  "Sadhuta",
  "Ahimsa",
  "Prarthana",
  "Katha",
  "Yuva",
  "Bal Satsang",
];
