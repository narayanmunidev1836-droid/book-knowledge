"use client";

import { FullscreenOutlined } from "@ant-design/icons";

const OVERLAY_BTN =
  "pointer-events-auto flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-emerald-600";
const BAR_BTN =
  "flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-lg text-slate-700 transition hover:bg-emerald-600 hover:text-white";

/**
 * Desktop (mouse): controls floating on the photo, as they always were.
 * Put it inside a `relative` wrapper around the <img>.
 */
export function ModalImageOverlay({
  index,
  count,
  loading,
  onPrev,
  onNext,
  onFullscreen,
}) {
  return (
    <div className="pointer-events-none absolute inset-0 pointer-coarse:hidden">
      <button
        type="button"
        aria-label="View full screen"
        onClick={onFullscreen}
        className={`${OVERLAY_BTN} absolute top-2 right-2 h-9 w-9`}
      >
        <FullscreenOutlined />
      </button>
      {loading && (
        <span
          role="status"
          aria-label="Loading full image"
          className="absolute right-3 bottom-3 h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"
        />
      )}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={onPrev}
            className={`${OVERLAY_BTN} absolute top-1/2 left-2 h-10 w-10 -translate-y-1/2 text-lg`}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={onNext}
            className={`${OVERLAY_BTN} absolute top-1/2 right-2 h-10 w-10 -translate-y-1/2 text-lg`}
          >
            ›
          </button>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Touch devices (phone + tablet): the same controls in a bar under the photo,
 * so nothing covers the text of the page.
 */
export default function ModalImageBar({
  index,
  count,
  loading,
  onPrev,
  onNext,
  onFullscreen,
}) {
  return (
    <div className="hidden w-full items-center justify-between gap-2 px-2 py-2 pointer-coarse:flex">
      {count > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous photo"
            onClick={onPrev}
            className={BAR_BTN}
          >
            ‹
          </button>
          <span className="min-w-12 text-center text-xs font-semibold text-slate-600">
            {index + 1} / {count}
          </span>
          <button
            type="button"
            aria-label="Next photo"
            onClick={onNext}
            className={BAR_BTN}
          >
            ›
          </button>
        </div>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-3">
        {loading && (
          <span
            role="status"
            aria-label="Loading full image"
            className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
          />
        )}
        <button
          type="button"
          aria-label="View full screen"
          title="View full screen"
          onClick={onFullscreen}
          className={BAR_BTN}
        >
          <FullscreenOutlined />
        </button>
      </div>
    </div>
  );
}
