import { unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

// MongoDB document limit is 16MB — keep the base64 payload safely below it.
const MAX_ENTRY_BYTES = 6 * 1024 * 1024; // full image (base64 ≈ 8MB)
const MAX_COVER_BYTES = 1.5 * 1024 * 1024; // book cover

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

function toDataUri(buffer) {
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

// Encode at high quality first (clarity is a priority); only step the quality
// down if the result would be too large to store.
async function compress(input, { maxBytes, qualities = [88, 80, 72, 64], resize }) {
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
 * gallery grids. Returns base64 data URIs ready for MongoDB.
 */
export async function processEntryImage(file, { maxBytes = MAX_ENTRY_BYTES } = {}) {
  const input = await toBuffer(file);
  if (!input) return null;

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
  const thumbBuffer = await sharp(full)
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 62 })
    .toBuffer();

  return { image: toDataUri(full), thumb: toDataUri(thumbBuffer) };
}

/** Book cover: resized + compressed base64 data URI. */
export async function saveUpload(file, sub = "covers") {
  const input = await toBuffer(file);
  if (!input) return null;

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
  return toDataUri(output);
}

export async function removeUpload(publicPath) {
  if (!publicPath) return;
  // Base64 data URIs live in MongoDB — deleting the document removes them.
  if (publicPath.startsWith("data:")) return;

  // Legacy file-based uploads (local dev / old records)
  if (!publicPath.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_ROOT, publicPath.slice("/uploads/".length));
  if (!filePath.startsWith(UPLOAD_ROOT)) return;
  try {
    await unlink(filePath);
  } catch {}
}
