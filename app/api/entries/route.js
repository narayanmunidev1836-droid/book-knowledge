import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Entry, Book, Topic } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { processEntryImage } from "@/lib/upload";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

// aggregate() does not cast values like find() does — ids must be ObjectIds.
function toOid(value) {
  try {
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
}

export async function GET(req) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const q = searchParams.get("q");

  // Entries are strictly per user — admins don't get to browse them either.
  const userId = toOid(user.id);
  if (!userId) return Response.json([]);
  const filter = { uploadedBy: userId };
  const clauses = [];
  if (topicId) {
    const oid = toOid(topicId);
    if (oid) clauses.push({ $or: [{ topic: oid }, { topics: oid }] });
  }
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    clauses.push({
      $or: [
        { bookName: rx },
        { topicName: rx },
        { topicNames: rx },
        { uploadedByName: rx },
        { note: rx },
      ],
    });
  }
  if (clauses.length) filter.$and = clauses;

  // Lists ship the small thumb only — the full base64 image is fetched
  // per-image from GET /api/entries/[id] when the lightbox opens.
  const entries = await Entry.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    { $limit: 500 },
    {
      $project: {
        book: 1,
        bookName: 1,
        topic: 1,
        topicName: 1,
        topics: 1,
        topicNames: 1,
        page: 1,
        note: 1,
        uploadedBy: 1,
        uploadedByName: 1,
        createdAt: 1,
        thumb: 1,
        hasFull: { $cond: [{ $ifNull: ["$thumb", false] }, true, false] },
        image: {
          $cond: [{ $ifNull: ["$thumb", false] }, "$thumb", "$image"],
        },
      },
    },
  ]);
  return Response.json(JSON.parse(JSON.stringify(entries)));
}

export async function POST(req) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const form = await req.formData();
  const bookId = String(form.get("bookId") || "");
  const topicIds = [...new Set(form.getAll("topicId").map(String).filter(Boolean))];
  const pageRaw = String(form.get("page") || "").trim();
  const note = String(form.get("note") || "").trim();
  const imageFile = form.get("image");

  if (!bookId || !topicIds.length) {
    return Response.json({ error: "Book and at least one topic are required" }, { status: 400 });
  }
  if (!imageFile || typeof imageFile === "string" || imageFile.size === 0) {
    return Response.json({ error: "Image is required" }, { status: 400 });
  }
  if (pageRaw && Number.isNaN(Number(pageRaw))) {
    return Response.json({ error: "Invalid page number" }, { status: 400 });
  }

  const book = await Book.findOne({ _id: bookId, createdBy: user.id })
    .lean()
    .catch(() => null);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });

  const topics = await Topic.find({
    _id: { $in: topicIds },
    createdBy: user.id,
  })
    .lean()
    .catch(() => []);
  if (topics.length !== topicIds.length) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }
  const ordered = topicIds.map((id) => topics.find((t) => String(t._id) === id));

  let processed;
  try {
    processed = await processEntryImage(imageFile);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const entry = await Entry.create({
    book: book._id,
    bookName: book.name,
    topic: ordered[0]._id,
    topicName: ordered[0].name,
    topics: ordered.map((t) => t._id),
    topicNames: ordered.map((t) => t.name),
    page: pageRaw ? Number(pageRaw) : undefined,
    image: processed.image,
    thumb: processed.thumb,
    note,
    uploadedBy: user.id,
    uploadedByName: user.name,
  });

  await logActivity({
    user,
    action: "entry.create",
    detail: `${book.name} — ${ordered.map((t) => t.name).join(", ")}${pageRaw ? ` (p.${pageRaw})` : ""}`,
    targetType: "entry",
    targetId: entry._id,
  });

  return Response.json(toPlain(entry), { status: 201 });
}
