import { connectDB } from "@/lib/mongodb";
import { Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { removeUpload } from "@/lib/upload";
import { logActivity } from "@/lib/logActivity";

export const dynamic = "force-dynamic";

async function loadOwnEntry(id, userId) {
  await connectDB();
  try {
    return await Entry.findOne({ _id: id, uploadedBy: userId });
  } catch {
    return null;
  }
}

export async function GET(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const entry = await loadOwnEntry(id, user.id);
  if (!entry) return Response.json({ error: "Entry not found" }, { status: 404 });

  // Full base64 image — only fetched when the lightbox opens.
  return Response.json(toPlain(entry));
}

export async function PUT(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const entry = await loadOwnEntry(id, user.id);
  if (!entry) return Response.json({ error: "Entry not found" }, { status: 404 });

  const body = await req.json();
  if (typeof body.note === "string") entry.note = body.note.trim();
  if (body.page !== undefined) {
    const pageRaw = String(body.page).trim();
    if (pageRaw && Number.isNaN(Number(pageRaw))) {
      return Response.json({ error: "Invalid page number" }, { status: 400 });
    }
    entry.page = pageRaw ? Number(pageRaw) : undefined;
  }
  await logActivity({
    user,
    action: "entry.update",
    detail: `${entry.bookName} — note updated`,
    targetType: "entry",
    targetId: entry._id,
  });
  await entry.save();
  return Response.json(toPlain(entry));
}

export async function DELETE(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const entry = await loadOwnEntry(id, user.id);
  if (!entry) return Response.json({ error: "Entry not found" }, { status: 404 });

  await logActivity({
    user,
    action: "entry.delete",
    detail: `${entry.bookName} — ${entry.topicName}${entry.page ? ` (p.${entry.page})` : ""}`,
    targetType: "entry",
    targetId: entry._id,
  });
  await removeUpload(entry.image);
  await entry.deleteOne();
  return Response.json({ ok: true });
}
