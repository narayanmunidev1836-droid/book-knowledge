"use client";

import { useEffect } from "react";
import { CloseOutlined } from "@ant-design/icons";
import { useSwipe } from "@/lib/useSwipe";

// Full-screen photo viewer shown over the detail modal.
//  - Mouse devices: controls float over the photo, as before.
//  - Touch devices (phone + tablet): swipe left/right to change photo and the
//    controls live in a bar under the photo, so nothing covers the text.
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

  const swipe = useSwipe({ onPrev, onNext, enabled: count > 1 });

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex flex-col bg-black/95"
      onClick={onClose}
    >
      {/* Touch devices: close sits in a bar above the photo */}
      <div
        className="hidden w-full justify-end px-4 py-3 pointer-coarse:flex"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close full screen"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg text-white active:bg-red-500/80"
        >
          <CloseOutlined />
        </button>
      </div>

      <div
        {...swipe}
        className="relative flex min-h-0 w-full flex-1 items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full object-contain"
        />

        {/* Mouse devices: floating controls */}
        <div className="pointer-events-none absolute inset-0 pointer-coarse:hidden">
          <button
            type="button"
            aria-label="Close full screen"
            onClick={onClose}
            className="pointer-events-auto absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur transition hover:bg-emerald-600"
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
                className="pointer-events-auto absolute top-1/2 left-4 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition hover:bg-emerald-600"
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
                className="pointer-events-auto absolute top-1/2 right-4 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition hover:bg-emerald-600"
              >
                ›
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {index + 1} / {count}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Touch devices: prev / next in a bar under the photo */}
      {count > 1 && (
        <div
          className="hidden w-full items-center justify-center gap-3 px-4 py-3 pointer-coarse:flex"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Previous photo"
            onClick={onPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white active:bg-emerald-600"
          >
            ‹
          </button>
          <span className="min-w-12 text-center text-sm font-semibold text-white/90">
            {index + 1} / {count}
          </span>
          <button
            type="button"
            aria-label="Next photo"
            onClick={onNext}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white active:bg-emerald-600"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
