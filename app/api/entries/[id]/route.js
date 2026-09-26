import { connectDB } from "@/lib/mongodb";
import { Entry } from "@/lib/models";
import { requireRole, toPlain } from "@/lib/session";
import { removeUpload, processEntryImage } from "@/lib/upload";
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

  const plain = toPlain(entry);
  // ?lite=1 — thumbs only (edit dialogs); the full base64 images stay out.
  if (new URL(req.url).searchParams.get("lite")) {
    delete plain.images;
    plain.image = plain.thumb || "";
    return Response.json(plain);
  }
  // Full base64 image — only fetched when the lightbox opens.
  return Response.json(plain);
}

export async function PUT(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  const entry = await loadOwnEntry(id, user.id);
  if (!entry) return Response.json({ error: "Entry not found" }, { status: 404 });

  // JSON (note/page only) or multipart (note + removeIndices + new images).
  const contentType = req.headers.get("content-type") || "";
  let note, pageRaw, removeImages, newFiles;
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    note = form.has("note") ? String(form.get("note") || "").trim() : undefined;
    pageRaw = form.has("page") ? String(form.get("page") || "").trim() : undefined;
    removeImages = form
      .getAll("removeIndices")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0);
    newFiles = form
      .getAll("image")
      .filter((f) => f && typeof f !== "string" && f.size > 0);
  } else {
    const body = await req.json();
    note = typeof body.note === "string" ? body.note.trim() : undefined;
    pageRaw = body.page !== undefined ? String(body.page).trim() : undefined;
    removeImages = Array.isArray(body.removeImages)
      ? body.removeImages.map(Number)
      : [];
    newFiles = [];
  }
  removeImages = [...new Set(removeImages)];

  if (note !== undefined) entry.note = note;
  if (pageRaw !== undefined) {
    if (pageRaw && Number.isNaN(Number(pageRaw))) {
      return Response.json({ error: "Invalid page number" }, { status: 400 });
    }
    entry.page = pageRaw ? Number(pageRaw) : undefined;
  }

  const imgs = entry.images?.length
    ? [...entry.images]
    : entry.image
      ? [entry.image]
      : [];
  const thbs = entry.thumbs?.length
    ? [...entry.thumbs]
    : entry.thumb
      ? [entry.thumb]
      : [];

  // Remove individual images: indices refer to the entry's original order.
  let removedCount = 0;
  if (removeImages.length) {
    const gone = new Set(removeImages);
    const keep = imgs
      .map((src, i) => ({ src, i }))
      .filter(({ i }) => !gone.has(i));
    for (const i of removeImages) {
      if (imgs[i]) {
        await removeUpload(imgs[i]);
        removedCount++;
      }
      if (thbs[i] && thbs[i] !== imgs[i]) await removeUpload(thbs[i]);
    }
    const origThbs = [...thbs];
    imgs.length = 0;
    thbs.length = 0;
    keep.forEach(({ src }) => imgs.push(src));
    keep.forEach(({ i }) => thbs.push(origThbs[i] || ""));
  }

  // Append new images.
  let addedCount = 0;
  if (newFiles.length) {
    const total = imgs.length + newFiles.length;
    if (total > 10) {
      return Response.json(
        { error: "Maximum 10 images per entry" },
        { status: 400 }
      );
    }
    // Keep the whole set safely under Mongo's 16MB document limit.
    const perImage = Math.min(
      6 * 1024 * 1024,
      Math.floor((14 * 1024 * 1024) / total)
    );
    try {
      for (const file of newFiles) {
        const one = await processEntryImage(file, { maxBytes: perImage });
        if (one) {
          imgs.push(one.image);
          thbs.push(one.thumb);
          addedCount++;
        }
      }
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }
  }

  if (removeImages.length || newFiles.length) {
    entry.images = imgs;
    entry.thumbs = thbs;
    entry.image = imgs[0] || "";
    entry.thumb = thbs[0] || undefined;
  }

  await logActivity({
    user,
    action: "entry.update",
    detail: `${entry.bookName} — ${[
      removedCount ? `${removedCount} image(s) removed` : "",
      addedCount ? `${addedCount} image(s) added` : "",
      "note updated",
    ]
      .filter(Boolean)
      .join(", ")}`,
    targetType: "entry",
    targetId: entry._id,
  });
  await entry.save();

  // Slim response — never ship the full base64 images back on update.
  // `image` mirrors the list shape (first thumb) so clients can refresh rows.
  const plain = toPlain(entry);
  return Response.json({
    _id: plain._id,
    note: plain.note,
    page: plain.page,
    image: plain.thumb || "",
    thumb: plain.thumb || "",
    imageCount: plain.images?.length || (plain.image ? 1 : 0),
  });
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
  const allImages = new Set([
    ...(entry.images || []).filter(Boolean),
    ...(entry.thumbs || []).filter(Boolean),
    entry.image,
    entry.thumb,
  ].filter(Boolean));
  for (const src of allImages) await removeUpload(src);
  await entry.deleteOne();
  return Response.json({ ok: true });
}
