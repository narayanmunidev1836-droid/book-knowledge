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

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Book = mongoose.models.Book || mongoose.model("Book", BookSchema);
export const Topic = mongoose.models.Topic || mongoose.model("Topic", TopicSchema);
export const Entry = mongoose.models.Entry || mongoose.model("Entry", EntrySchema);

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
