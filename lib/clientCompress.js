const MAX_BYTES = 4 * 1024 * 1024;
const MAX_DIM = 3200;

/**
 * Vercel limits request bodies to ~4.5MB, so big camera photos are resized /
 * re-encoded in the browser before upload. Small files pass through untouched,
 * and quality is kept high so clarity doesn't drop.
 */
export async function compressForUpload(file) {
  if (!file || typeof file === "string" || !file.type?.startsWith("image/")) {
    return file;
  }
  if (file.size <= MAX_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
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
  } catch {
    // Fall back to the original file — the server will try to compress it.
  }
  return file;
}
