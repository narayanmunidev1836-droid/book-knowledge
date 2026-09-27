import crypto from "crypto";

// version = entry/book updatedAt epoch (cache-bust on edit). No expiry needed.
function sign(parts) {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET || "dev")
    .update(parts.join(":"))
    .digest("base64url")
    .slice(0, 22);
}

export function verifySig(parts, provided) {
  const expect = sign(parts);
  if (!provided || provided.length !== expect.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expect));
  } catch {
    return false;
  }
}

export function versionOf(updatedAt) {
  if (!updatedAt) return "0";
  const time =
    updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  return String(Number.isFinite(time) ? time : 0);
}

// /api/img/entry/<id>/<index>/<kind>?v=<ver>&s=<sig>   kind: "full" | "thumb"
export function entryImgUrl(entryId, index, kind, version) {
  const v = String(version || 0);
  const s = sign(["e", entryId, index, kind, v]);
  return `/api/img/entry/${entryId}/${index}/${kind}?v=${v}&s=${s}`;
}

// /api/img/cover/<bookId>?v=<ver>&s=<sig>
export function coverImgUrl(bookId, version) {
  const v = String(version || 0);
  const s = sign(["c", bookId, v]);
  return `/api/img/cover/${bookId}?v=${v}&s=${s}`;
}

export function coverUrl(book) {
  if (!book?.cover) return "";
  return coverImgUrl(String(book._id), versionOf(book.updatedAt));
}

/**
 * Turns an entry document (or its JSON plain form) into one whose image
 * fields are signed URLs instead of base64 payloads.
 */
export function entryImgUrls(entryId, updatedAt, count) {
  const v = versionOf(updatedAt);
  const n = Math.max(0, Number(count) || 0);
  return {
    image: n ? entryImgUrl(entryId, 0, "thumb", v) : "",
    images: Array.from({ length: n }, (_, i) => entryImgUrl(entryId, i, "full", v)),
    thumbs: Array.from({ length: n }, (_, i) => entryImgUrl(entryId, i, "thumb", v)),
  };
}

function imageCountOf(plain) {
  if (Array.isArray(plain.images)) return plain.images.length;
  return plain.image ? 1 : 0;
}

/** Full detail shape: all image fields become signed URLs. */
export function withEntryUrls(plain) {
  const urls = entryImgUrls(String(plain._id), plain.updatedAt, imageCountOf(plain));
  plain.image = urls.image;
  plain.thumb = urls.image;
  plain.images = urls.images;
  plain.thumbs = urls.thumbs;
  return plain;
}

/** Lite (edit dialog) shape: thumb URLs only, the full images stay out. */
export function withLiteEntryUrls(plain) {
  const urls = entryImgUrls(String(plain._id), plain.updatedAt, imageCountOf(plain));
  plain.image = urls.image;
  plain.thumb = urls.image;
  plain.thumbs = urls.thumbs;
  delete plain.images;
  return plain;
}
