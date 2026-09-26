import { connectDB } from "@/lib/mongodb";
import { Book, Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";

export const dynamic = "force-dynamic";

async function loadBook(id) {
  await connectDB();
  try {
    return await Book.findById(id);
  } catch {
    return null;
  }
}

export async function PUT(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const book = await loadBook(id);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });

  if (user.role !== "admin" && String(book.createdBy) !== user.id) {
    return Response.json({ error: "You don't have permission for this" }, { status: 403 });
  }

  const body = await req.json();
  const fields = ["name", "author", "publisher", "language", "category"];
  for (const key of fields) {
    if (typeof body[key] === "string") book[key] = body[key].trim();
  }
  if (body.language && !["Gujarati", "Hindi", "English", "Sanskrit"].includes(body.language)) {
    return Response.json({ error: "Invalid language" }, { status: 400 });
  }
  await book.save();
  return Response.json(toPlain(book));
}

export async function DELETE(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const book = await loadBook(id);
  if (!book) return Response.json({ error: "Book not found" }, { status: 404 });

  if (user.role !== "admin" && String(book.createdBy) !== user.id) {
    return Response.json({ error: "You don't have permission for this" }, { status: 403 });
  }

  await Entry.deleteMany({ book: book._id });
  await book.deleteOne();
  return Response.json({ ok: true });
}
