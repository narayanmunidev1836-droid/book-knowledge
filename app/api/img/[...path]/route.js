import { createHash } from "crypto";
import { readFile } from "fs/promises";
import nodePath from "path";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Entry, Book } from "@/lib/models";
import { verifySig, versionOf } from "@/lib/imgUrl";
import { UPLOAD_ROOT } from "@/lib/upload";

export const dynamic = "force-dynamic";

const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

function decodeDataUri(src) {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(src);
  if (!match) return null;
  const type = match[1] || "application/octet-stream";
  const body = match[3];
  try {
    const buffer = match[2]
      ? Buffer.from(body, "base64")
      : Buffer.from(decodeURIComponent(body), "utf8");
    return { buffer, type };
  } catch {
    return null;
  }
}

async function readLegacyFile(src) {
  const rel = src.slice("/uploads/".length);
  const parts = rel.split("/").filter(Boolean);
  if (parts.some((p) => p === ".." || p === ".")) return null;
  const filePath = nodePath.join(UPLOAD_ROOT, ...parts);
  if (!filePath.startsWith(UPLOAD_ROOT)) return null;
  try {
    const buffer = await readFile(filePath);
    return {
      buffer,
      type: TYPES[nodePath.extname(filePath).toLowerCase()] || "image/webp",
    };
  } catch {
    return null;
  }
}

export async function GET(req, { params }) {
  const { path: segments } = await params;
  const parts = Array.isArray(segments) ? segments : [segments];
  const { searchParams } = new URL(req.url);
  const v = searchParams.get("v") || "";
  const s = searchParams.get("s") || "";

  let id;
  let sigParts;
  let kind = "";
  let index = 0;
  if (parts[0] === "entry" && parts.length === 4) {
    id = parts[1];
    const indexRaw = parts[2];
    kind = parts[3];
    if (!/^\d{1,2}$/.test(indexRaw) || (kind !== "full" && kind !== "thumb")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    index = Number(indexRaw);
    sigParts = ["e", id, indexRaw, kind, v];
  } else if (parts[0] === "cover" && parts.length === 2) {
    id = parts[1];
    sigParts = ["c", id, v];
  } else {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Signed URL = capability token (the image optimizer's internal fetch does
  // not forward cookies, so it can never present a session).
  if (!verifySig(sigParts, s)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  let doc = null;
  if (parts[0] === "entry") {
    try {
      doc = await Entry.findById(id).select(
        "image thumb images thumbs updatedAt uploadedBy"
      );
    } catch {
      doc = null;
    }
  } else {
    try {
      doc = await Book.findById(id).select("cover updatedAt createdBy");
    } catch {
      doc = null;
    }
  }
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const ownerId = String(doc[parts[0] === "entry" ? "uploadedBy" : "createdBy"] || "");
  const session = await auth();
  if (session?.user) {
    // A browser request carries the cookie → signature alone is not enough.
    if (session.user.role !== "admin" && String(session.user.id) !== ownerId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (v !== versionOf(doc.updatedAt)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let src = "";
  if (parts[0] === "cover") {
    src = typeof doc.cover === "string" ? doc.cover : "";
  } else {
    const fulls =
      Array.isArray(doc.images) && doc.images.length
        ? doc.images
        : doc.image
          ? [doc.image]
          : [];
    const thumbs =
      Array.isArray(doc.thumbs) && doc.thumbs.length
        ? doc.thumbs
        : doc.thumb
          ? [doc.thumb]
          : [];
    src =
      kind === "full"
        ? fulls[index] || ""
        : thumbs[index] || fulls[index] || "";
  }
  if (!src) return Response.json({ error: "Not found" }, { status: 404 });

  const decoded = src.startsWith("data:")
    ? decodeDataUri(src)
    : src.startsWith("/uploads/")
      ? await readLegacyFile(src)
      : null;
  if (!decoded || !decoded.buffer.length) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const etag = `"${createHash("sha1")
    .update(decoded.buffer)
    .digest("base64url")
    .slice(0, 27)}"`;
  const cacheControl = "public, max-age=31536000, immutable";
  const headers = {
    "content-type": decoded.type,
    "content-length": String(decoded.buffer.length),
    "cache-control": cacheControl,
    etag,
    "x-content-type-options": "nosniff",
  };

  const inm = req.headers.get("if-none-match") || "";
  if (
    inm &&
    inm
      .split(",")
      .some((tag) => tag.trim() === etag || tag.trim() === `W/${etag}`)
  ) {
    return new Response(null, {
      status: 304,
      headers: { etag, "cache-control": cacheControl },
    });
  }

  return new Response(decoded.buffer, { status: 200, headers });
}
