"use client";

import { useEffect, useState } from "react";

/** Start decoding images in the background (warm the HTTP cache). */
export function preload(srcs) {
  const list = (Array.isArray(srcs) ? srcs : [srcs]).filter(Boolean);
  for (const src of list) {
    const img = new window.Image();
    img.src = src;
  }
}

/**
 * Progressive image source: show `thumbSrc` immediately, swap to `fullSrc`
 * as soon as it has been fetched and decoded (no reflow — same aspect ratio).
 */
export function useProgressiveSrc(fullSrc, thumbSrc) {
  const [readySrc, setReadySrc] = useState(null);

  useEffect(() => {
    if (!fullSrc) return undefined;
    let cancelled = false;
    const img = new window.Image();
    const done = () => {
      if (!cancelled) setReadySrc(fullSrc);
    };
    img.onload = done;
    img.src = fullSrc;
    if (typeof img.decode === "function") img.decode().then(done).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fullSrc]);

  const ready = readySrc === fullSrc;
  if (!fullSrc) return thumbSrc || null;
  if (ready) return fullSrc;
  return thumbSrc || fullSrc;
}

/** Neighbour entries of a list, used to warm the lightbox's next/previous. */
export function neighborsOf(entries, index) {
  if (!Array.isArray(entries) || entries.length < 2) return [];
  const out = [];
  for (const offset of [1, -1]) {
    const i = (index + offset + entries.length) % entries.length;
    if (i !== index && entries[i]) out.push(entries[i]);
  }
  return out;
}

/** Thumb + full URLs of an entry (for `preload`). */
export function urlsOf(entry, index) {
  if (!entry) return [];
  if (index === undefined) {
    return [...(entry.images || []), ...(entry.thumbs || [])];
  }
  return [entry.thumbs?.[index], entry.images?.[index]];
}
