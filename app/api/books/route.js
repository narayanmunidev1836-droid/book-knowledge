import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Book, Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { coverUrl } from "@/lib/imgUrl";
import { saveUpload } from "@/lib/upload";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const books = await Book.find({ createdBy: user.id })
    .sort({ name: 1 })
    .lean();

  // aggregate() does not cast strings — the id must be an ObjectId.
  let userId = null;
  try {
    userId = new mongoose.Types.ObjectId(String(user.id));
  } catch {
    userId = null;
  }
  const counts = userId
    ? await Entry.aggregate([
        { $match: { uploadedBy: userId } },
        { $group: { _id: "$book", count: { $sum: 1 } } },
      ])
    : [];
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const plain = toPlain(
    books.map((b) => ({
      ...b,
      entryCount: countMap.get(String(b._id)) || 0,
    }))
  );
  // Covers are base64 in Mongo — hand out a signed, cacheable URL instead.
  for (const book of plain) book.cover = coverUrl(book);
  return Response.json(plain);
}

export async function POST(req) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const author = String(form.get("author") || "").trim();
  const publisher = String(form.get("publisher") || "").trim();
  const language = String(form.get("language") || "Gujarati");
  const category = String(form.get("category") || "").trim();
  const coverFile = form.get("cover");

  if (!name) {
    return Response.json({ error: "Book name is required" }, { status: 400 });
  }
  if (!["Gujarati", "Hindi", "English", "Sanskrit"].includes(language)) {
    return Response.json({ error: "Invalid language" }, { status: 400 });
  }

  const rx = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const duplicate = await Book.findOne({ createdBy: user.id, name: rx });
  if (duplicate) {
    return Response.json({ error: "You already have this book" }, { status: 409 });
  }

  let cover = null;
  if (coverFile && typeof coverFile !== "string" && coverFile.size > 0) {
    try {
      cover = await saveUpload(coverFile, "covers");
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }
  }

  const book = await Book.create({
    name,
    author,
    publisher,
    language,
    category,
    cover,
    createdBy: user.id,
  });

  await logActivity({
    user,
    action: "book.create",
    detail: book.name,
    targetType: "book",
    targetId: book._id,
  });
  const plain = toPlain(book);
  plain.cover = coverUrl(plain);
  return Response.json(plain, { status: 201 });
}
