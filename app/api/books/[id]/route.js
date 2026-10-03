import { connectDB } from "@/lib/mongodb";
import { Book, Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { coverUrl } from "@/lib/imgUrl";
import { saveUpload, removeUpload, removeEntryImages } from "@/lib/upload";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

async function loadOwnBook(id, userId) {
  await connectDB();
  try {
    return await Book.findOne({ _id: id, createdBy: userId });
  } catch {
    return null;
  }
}

export async function GET(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const book = await loadOwnBook(id, user.id);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });
  const plain = toPlain(book);
  plain.cover = coverUrl(plain);
  return Response.json(plain);
}

export async function PUT(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const book = await loadOwnBook(id, user.id);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") || "";
  let body = {};
  let coverFile = null;
  let coverRemoved = false;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") body[key] = value;
    }
    const file = form.get("cover");
    if (file && typeof file !== "string" && file.size > 0) coverFile = file;
    coverRemoved = form.get("coverRemoved") === "true";
  } else {
    body = await req.json().catch(() => ({}));
  }

  const fields = ["name", "author", "publisher", "language", "category"];
  for (const key of fields) {
    if (typeof body[key] === "string") book[key] = body[key].trim();
  }
  if (body.language && !["Gujarati", "Hindi", "English", "Sanskrit"].includes(body.language)) {
    return Response.json({ error: "Invalid language" }, { status: 400 });
  }

  if (coverFile) {
    try {
      book.cover = await saveUpload(coverFile, book._id);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }
  } else if (coverRemoved && book.cover) {
    await removeUpload(book.cover);
    book.cover = null;
  }

  await book.save();

  await logActivity({
    user,
    action: "book.update",
    detail: book.name,
    targetType: "book",
    targetId: book._id,
  });

  if (typeof body.name === "string" && body.name.trim()) {
    await Entry.updateMany(
      { book: book._id, uploadedBy: user.id },
      { bookName: book.name }
    );
  }
  const plain = toPlain(book);
  plain.cover = coverUrl(plain);
  return Response.json(plain);
}

export async function DELETE(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const book = await loadOwnBook(id, user.id);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });

  const entries = await Entry.find({ book: book._id, uploadedBy: user.id })
    .select("image thumb images thumbs")
    .lean();

  await Entry.deleteMany({ book: book._id, uploadedBy: user.id });
  await logActivity({
    user,
    action: "book.delete",
    detail: book.name,
    targetType: "book",
    targetId: book._id,
  });
  await book.deleteOne();

  // R2 objects are keyed independently — drop them once the docs are gone.
  for (const entry of entries) await removeEntryImages(entry);
  if (book.cover) await removeUpload(book.cover);
  return Response.json({ ok: true });
}
