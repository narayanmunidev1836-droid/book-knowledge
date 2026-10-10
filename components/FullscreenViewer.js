"use client";

import { useEffect } from "react";
import { CloseOutlined } from "@ant-design/icons";

// Full-screen photo viewer shown over the detail modal.
export default function FullscreenViewer({
  open,
  src,
  alt,
  index,
  count,
  onPrev,
  onNext,
  onClose,
}) {
  // Esc closes the viewer only (capture, so the modal stays open).
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-screen max-w-full object-contain"
      />
      <button
        type="button"
        aria-label="Close full screen"
        onClick={onClose}
        className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur transition hover:bg-emerald-600"
      >
        <CloseOutlined />
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition hover:bg-emerald-600"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition hover:bg-emerald-600"
          >
            ›
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}
