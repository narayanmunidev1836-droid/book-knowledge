import { createHash } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { Book } from "@/lib/models";
import { requireRole } from "@/lib/session";
import { getObject } from "@/lib/r2";

export const dynamic = "force-dynamic";

// Streams the book's PDF through the app so the bucket stays private and
// only the owner can read it (no public R2 URL is ever handed out).
export async function GET(req, { params }) {
  const { user, error } = await requireRole("sant", "admin");
  if (error) return error;

  const { id } = await params;
  await connectDB();
  let book = null;
  try {
    book = await Book.findOne({ _id: id, createdBy: user.id }).select(
      "name pdf pdfName"
    );
  } catch {
    book = null;
  }
  if (!book?.pdf) return Response.json({ error: "PDF not found" }, { status: 404 });

  const obj = await getObject(book.pdf);
  if (!obj || !obj.buffer.length) {
    return Response.json({ error: "PDF not found" }, { status: 404 });
  }

  const etag = `"${createHash("sha1").update(book.pdf).digest("base64url").slice(0, 27)}"`;
  const cacheControl = "private, max-age=3600";
  if ((req.headers.get("if-none-match") || "").includes(etag)) {
    return new Response(null, { status: 304, headers: { etag, "cache-control": cacheControl } });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const filename = encodeURIComponent(book.pdfName || `${book.name}.pdf`);
  return new Response(obj.buffer, {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(obj.buffer.length),
      "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
      "cache-control": cacheControl,
      etag,
      "x-content-type-options": "nosniff",
    },
  });
}
