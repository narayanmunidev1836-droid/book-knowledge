"use client";

import { useRef } from "react";

/**
 * Horizontal finger swipe → previous / next. Spread the result on an element:
 * `<div {...useSwipe({ onPrev, onNext, enabled })}>`.
 * Ignores multi-touch (pinch) and a pinch-zoomed page, so zooming still works.
 */
export function useSwipe({ onPrev, onNext, enabled = true }) {
  const start = useRef(null);

  return {
    onTouchStart(e) {
      const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
      if (!enabled || zoomed || e.touches.length !== 1) {
        start.current = null;
        return;
      }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchMove(e) {
      if (e.touches.length > 1) start.current = null;
    },
    onTouchEnd(e) {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      (dx < 0 ? onNext : onPrev)();
    },
  };
}
