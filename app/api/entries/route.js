import { connectDB } from "@/lib/mongodb";
import { Entry, Book, Topic } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { saveUpload } from "@/lib/upload";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const mine = searchParams.get("mine");
  const q = searchParams.get("q");

  const filter = {};
  const clauses = [];
  if (topicId) clauses.push({ $or: [{ topic: topicId }, { topics: topicId }] });
  if (mine === "1") filter.uploadedBy = user.id;
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

  const entries = await Entry.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return Response.json(toPlain(entries));
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

  const book = await Book.findById(bookId).lean().catch(() => null);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });

  const topics = await Topic.find({ _id: { $in: topicIds } }).lean().catch(() => []);
  if (topics.length !== topicIds.length) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }
  const ordered = topicIds.map((id) => topics.find((t) => String(t._id) === id));

  let image;
  try {
    image = await saveUpload(imageFile, "entries");
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
    image,
    note,
    uploadedBy: user.id,
    uploadedByName: user.name,
  });

  return Response.json(toPlain(entry), { status: 201 });
}
