import { unlink } from "fs/promises";
import path from "path";
import {
  entryImageKey,
  coverKey,
  pdfKey,
  isR2Key,
  putObject,
  deleteObject,
  newImageToken,
} from "@/lib/r2";

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

// Loaded on first use: sharp probes the host (libc detection) at import time,
// which throws on some shared hosts and would break `next build` page-data
// collection for every route that merely imports this module.
let sharpPromise = null;
function getSharp() {
  sharpPromise ??= import("sharp").then((m) => m.default ?? m);
  return sharpPromise;
}

// Per-object cap — images live in R2 now, this only keeps uploads sane.
const MAX_ENTRY_BYTES = 6 * 1024 * 1024;
const MAX_COVER_BYTES = 1.5 * 1024 * 1024;

function validate(file) {
  if (!file || typeof file === "string") return null;
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Only image files are allowed (jpg, png, webp)");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image size must be less than 15MB");
  }
  return true;
}

// Encode at high quality first (clarity is a priority); only step the quality
// down if the result would be too large to store.
async function compress(input, { maxBytes, qualities = [88, 80, 72, 64], resize }) {
  const sharp = await getSharp();
  let last = null;
  for (const quality of qualities) {
    let pipeline = sharp(input, { animated: true }).rotate();
    if (resize) pipeline = pipeline.resize(resize);
    last = await pipeline.webp({ quality }).toBuffer();
    if (last.length <= maxBytes) return last;
  }
  if (last.length > maxBytes * 1.5) {
    throw new Error(
      "Image is too large even after compression — please use a smaller photo"
    );
  }
  return last;
}

async function toBuffer(file) {
  validate(file);
  if (!file) return null;
  return Buffer.from(await file.arrayBuffer());
}

/**
 * Entry image: full-quality WebP (original dimensions) + a small thumb for
 * gallery grids. Both objects go to R2; returns their keys for MongoDB.
 * Keys are `entries/<entryId>/<index>-<token>/{full,thumb}.webp`.
 */
export async function processEntryImage(
  file,
  { maxBytes = MAX_ENTRY_BYTES, entryId, index = 0 } = {}
) {
  const input = await toBuffer(file);
  if (!input) return null;
  if (!entryId) throw new Error("entryId is required to store an image");

  let full;
  try {
    // Cap the long edge — a 4096×6556 scan is wasted bytes in every grid.
    full = await compress(input, {
      maxBytes,
      resize: {
        width: 2560,
        height: 2560,
        fit: "inside",
        withoutEnlargement: true,
      },
    });
  } catch (e) {
    if (e?.message?.startsWith("Image is too large")) throw e;
    throw new Error(
      "This image could not be processed — please upload a JPG or PNG"
    );
  }

  // Grids never show more than ~420px of CSS, so a 640px thumb is plenty.
  const sharp = await getSharp();
  const thumb = await sharp(full)
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 62 })
    .toBuffer();

  const token = newImageToken();
  const imageKey = entryImageKey(entryId, index, "full", token);
  const thumbKey = entryImageKey(entryId, index, "thumb", token);
  await Promise.all([
    putObject(imageKey, full),
    putObject(thumbKey, thumb),
  ]);
  return { image: imageKey, thumb: thumbKey };
}

/** Book cover: resized + compressed WebP stored in R2 (`covers/<bookId>.webp`). */
export async function saveUpload(file, bookId) {
  const input = await toBuffer(file);
  if (!input) return null;
  if (!bookId) throw new Error("bookId is required to store a cover");

  let output;
  try {
    output = await compress(input, {
      maxBytes: MAX_COVER_BYTES,
      resize: { width: 1600, withoutEnlargement: true },
    });
  } catch (e) {
    if (e?.message?.startsWith("Image is too large")) throw e;
    throw new Error(
      "This image could not be processed — please upload a JPG or PNG"
    );
  }
  const key = coverKey(bookId);
  await putObject(key, output);
  return key;
}

/** Best-effort removal of uploaded objects when the DB write fails. */
export async function removeUploads(keys) {
  for (const key of keys.filter(Boolean)) await removeUpload(key);
}

/** Every stored image value of an entry (R2 key, data-URI or /uploads path). */
export function entryImageValues(doc) {
  if (!doc) return [];
  const fulls =
    Array.isArray(doc.images) && doc.images.length
      ? doc.images
      : doc.image
        ? [doc.image]
        : [];
  const thbs =
    Array.isArray(doc.thumbs) && doc.thumbs.length
      ? doc.thumbs
      : doc.thumb
        ? [doc.thumb]
        : [];
  return [...new Set([...fulls, ...thbs, doc.image, doc.thumb].filter(Boolean))];
}

/** Drop every R2 object an entry points at (call after the document is gone). */
export async function removeEntryImages(doc) {
  await removeUploads(entryImageValues(doc));
}

export async function removeUpload(src) {
  if (!src || typeof src !== "string") return;

  // R2 object key
  if (isR2Key(src)) {
    try {
      await deleteObject(src);
    } catch {}
    return;
  }
  // Base64 data URIs live in MongoDB — deleting the document removes them.
  if (src.startsWith("data:")) return;

  // Legacy file-based uploads (local dev / old records)
  if (!src.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_ROOT, src.slice("/uploads/".length));
  if (!filePath.startsWith(UPLOAD_ROOT)) return;
  try {
    await unlink(filePath);
  } catch {}
}

const MAX_PDF_BYTES = 50 * 1024 * 1024;

/** Book PDF stored as-is in R2 (`pdfs/<bookId>-<token>.pdf`). */
export async function savePdf(file, bookId) {
  if (!file || typeof file === "string") return null;
  if (!bookId) throw new Error("bookId is required to store a PDF");
  if (file.size > MAX_PDF_BYTES) {
    throw new Error("PDF size must be less than 50MB");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new Error("Only PDF files are allowed");
  }
  const key = pdfKey(bookId);
  await putObject(key, buffer, "application/pdf");
  return { key, name: String(file.name || "book.pdf").slice(0, 200), size: buffer.length };
}
