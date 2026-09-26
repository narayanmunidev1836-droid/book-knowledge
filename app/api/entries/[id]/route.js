import { connectDB } from "@/lib/mongodb";
import { Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { removeUpload } from "@/lib/upload";

export const dynamic = "force-dynamic";

async function loadEntry(id) {
  await connectDB();
  try {
    return await Entry.findById(id);
  } catch {
    return null;
  }
}

export async function PUT(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const entry = await loadEntry(id);
  if (!entry) return Response.json({ error: "Entry not found" }, { status: 404 });

  if (user.role !== "admin" && String(entry.uploadedBy) !== user.id) {
    return Response.json({ error: "You don't have permission for this" }, { status: 403 });
  }

  const body = await req.json();
  if (typeof body.note === "string") entry.note = body.note.trim();
  if (body.page !== undefined) {
    const pageRaw = String(body.page).trim();
    if (pageRaw && Number.isNaN(Number(pageRaw))) {
      return Response.json({ error: "Invalid page number" }, { status: 400 });
    }
    entry.page = pageRaw ? Number(pageRaw) : undefined;
  }
  await entry.save();
  return Response.json(toPlain(entry));
}

export async function DELETE(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const entry = await loadEntry(id);
  if (!entry) return Response.json({ error: "Entry not found" }, { status: 404 });

  if (user.role !== "admin" && String(entry.uploadedBy) !== user.id) {
    return Response.json({ error: "You don't have permission for this" }, { status: 403 });
  }

  await removeUpload(entry.image);
  await entry.deleteOne();
  return Response.json({ ok: true });
}
