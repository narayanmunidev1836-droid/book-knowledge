import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Entry, Book, Topic } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { entryImgUrls, withEntryUrls } from "@/lib/imgUrl";
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
  const bookId = searchParams.get("bookId");
  const q = searchParams.get("q");
  // Opt-in pagination: only when the caller sends page/limit, so existing
  // consumers that expect a bare array keep working unchanged.
  const paginated = searchParams.has("page") || searchParams.has("limit");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Number(searchParams.get("limit")) || 30);

  // Entries are strictly per user — admins don't get to browse them either.
  const userId = toOid(user.id);
  if (!userId) return Response.json([]);
  const filter = { uploadedBy: userId };
  const clauses = [];
  if (topicId) {
    const oid = toOid(topicId);
    if (oid) clauses.push({ $or: [{ topic: oid }, { topics: oid }] });
  }
  if (bookId) {
    const oid = toOid(bookId);
    if (oid) clauses.push({ book: oid });
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

  // Images never travel with the list — each item carries signed URLs that
  // are minted below (a few hundred bytes instead of megabytes of base64).
  const pipeline = [
    { $match: filter },
    { $sort: { createdAt: -1 } },
    ...(paginated
      ? [{ $skip: (page - 1) * limit }, { $limit: limit }]
      : [{ $limit: 500 }]),
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
        // Cache-busting version for the signed image URLs.
        updatedAt: 1,
        imageCount: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$images", []] } }, 0] },
            { $size: "$images" },
            { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$image", ""] } }, 0] }, 1, 0] },
          ],
        },
        hasFull: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$images", []] } }, 0] },
            true,
            { $gt: [{ $strLenCP: { $ifNull: ["$image", ""] } }, 0] },
          ],
        },
      },
    },
  ];

  const [entries, total] = await Promise.all([
    Entry.aggregate(pipeline),
    paginated ? Entry.countDocuments(filter) : null,
  ]);
  const items = JSON.parse(JSON.stringify(entries)).map((item) => {
    const urls = entryImgUrls(String(item._id), item.updatedAt, item.imageCount || 0);
    item.image = urls.image;
    item.images = urls.images;
    item.thumbs = urls.thumbs;
    return item;
  });
  if (paginated) {
    return Response.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }
  return Response.json(items);
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

  if (!bookId || !topicIds.length) {
    return Response.json({ error: "Book and at least one topic are required" }, { status: 400 });
  }
  const imageFiles = form
    .getAll("image")
    .filter((f) => f && typeof f !== "string" && f.size > 0);
  if (imageFiles.length > 10) {
    return Response.json({ error: "Maximum 10 images per entry" }, { status: 400 });
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

  let processed = [];
  if (imageFiles.length) {
    // Keep the whole set safely under Mongo's 16MB document limit.
    const perImage = Math.min(
      6 * 1024 * 1024,
      Math.floor((14 * 1024 * 1024) / imageFiles.length)
    );
    try {
      for (const file of imageFiles) {
        const one = await processEntryImage(file, { maxBytes: perImage });
        if (one) processed.push(one);
      }
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }
  }

  const entry = await Entry.create({
    book: book._id,
    bookName: book.name,
    topic: ordered[0]._id,
    topicName: ordered[0].name,
    topics: ordered.map((t) => t._id),
    topicNames: ordered.map((t) => t.name),
    page: pageRaw ? Number(pageRaw) : undefined,
    image: processed[0]?.image || "",
    thumb: processed[0]?.thumb || undefined,
    images: processed.map((p) => p.image),
    thumbs: processed.map((p) => p.thumb),
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

  return Response.json(withEntryUrls(toPlain(entry)), { status: 201 });
}
