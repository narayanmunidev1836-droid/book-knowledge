const MAX_BYTES = 4 * 1024 * 1024;
const MAX_DIM = 3200;
const KEEP_DIM = 4096; // longest edge kept when we only convert the format
// Formats the server can read. Gallery photos are often HEIC/HEIF (or
// another type the server's image library can't decode), so those are
// converted here, where the browser can still decode them.
const SERVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Vercel limits request bodies to ~4.5MB, so big camera photos are resized /
 * re-encoded in the browser before upload. Small JPEG/PNG/WebP files pass
 * through untouched, and quality is kept high so clarity doesn't drop.
 */
const TYPE_BY_EXT = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

// Some phones hand over a file with an empty MIME type; fall back to the
// extension (any case: .JPG, .Jpeg …).
function withKnownType(file) {
  if (file.type) return file;
  const ext = String(file.name || "").split(".").pop().toLowerCase();
  const type = TYPE_BY_EXT[ext];
  return type ? new File([file], file.name, { type }) : file;
}

export async function compressForUpload(input) {
  if (!input || typeof input === "string") return input;
  const file = withKnownType(input);
  console.log("[compress] input", { name: file.name, type: file.type, size: file.size });
  if (!file.type?.startsWith("image/")) return input;
  const convert = !SERVER_TYPES.includes(file.type);
  if (file.size <= MAX_BYTES && !convert) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const maxDim = file.size > MAX_BYTES ? MAX_DIM : KEEP_DIM;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    for (const quality of [0.92, 0.85, 0.78, 0.7]) {
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality)
      );
      if (!blob) break;
      if (blob.type === "image/webp" && blob.size <= MAX_BYTES) {
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
          type: "image/webp",
        });
      }
      if (blob.type !== "image/webp") break;
    }

    const fallback = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (fallback && fallback.size <= MAX_BYTES) {
      return new File([fallback], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
        type: "image/jpeg",
      });
    }
  } catch (e) {
    console.error("[compress] failed, sending original", { type: file.type, size: file.size }, e);
    // Fall back to the original file — the server will try to compress it.
  }
  return file;
}
