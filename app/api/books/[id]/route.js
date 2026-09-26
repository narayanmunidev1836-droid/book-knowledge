import { connectDB } from "@/lib/mongodb";
import { Book, Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
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

export async function PUT(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const book = await loadOwnBook(id, user.id);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });

  const body = await req.json();
  const fields = ["name", "author", "publisher", "language", "category"];
  for (const key of fields) {
    if (typeof body[key] === "string") book[key] = body[key].trim();
  }
  if (body.language && !["Gujarati", "Hindi", "English", "Sanskrit"].includes(body.language)) {
    return Response.json({ error: "Invalid language" }, { status: 400 });
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
  return Response.json(toPlain(book));
}

export async function DELETE(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const book = await loadOwnBook(id, user.id);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });

  await Entry.deleteMany({ book: book._id, uploadedBy: user.id });
  await logActivity({
    user,
    action: "book.delete",
    detail: book.name,
    targetType: "book",
    targetId: book._id,
  });
  await book.deleteOne();
  return Response.json({ ok: true });
}
