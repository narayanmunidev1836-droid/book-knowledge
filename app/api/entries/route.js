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
  if (topicId) filter.topic = topicId;
  if (mine === "1") filter.uploadedBy = user.id;
  if (q) {
    filter.$or = [
      { bookName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { topicName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { uploadedByName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { note: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
    ];
  }

  const entries = await Entry.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return Response.json(toPlain(entries));
}

export async function POST(req) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  await connectDB();
  const form = await req.formData();
  const bookId = String(form.get("bookId") || "");
  const topicId = String(form.get("topicId") || "");
  const pageRaw = String(form.get("page") || "").trim();
  const note = String(form.get("note") || "").trim();
  const imageFile = form.get("image");

  if (!bookId || !topicId) {
    return Response.json({ error: "Book and topic are both required" }, { status: 400 });
  }
  if (!imageFile || typeof imageFile === "string" || imageFile.size === 0) {
    return Response.json({ error: "Image is required" }, { status: 400 });
  }
  if (pageRaw && Number.isNaN(Number(pageRaw))) {
    return Response.json({ error: "Invalid page number" }, { status: 400 });
  }

  const book = await Book.findById(bookId).lean().catch(() => null);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });

  const topic = await Topic.findById(topicId).lean().catch(() => null);
  if (!topic) return Response.json({ error: "Topic not found" }, { status: 404 });

  let image;
  try {
    image = await saveUpload(imageFile, "entries");
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const entry = await Entry.create({
    book: book._id,
    bookName: book.name,
    topic: topic._id,
    topicName: topic.name,
    page: pageRaw ? Number(pageRaw) : undefined,
    image,
    note,
    uploadedBy: user.id,
    uploadedByName: user.name,
  });

  return Response.json(toPlain(entry), { status: 201 });
}
