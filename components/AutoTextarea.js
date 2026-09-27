"use client";

import { useLayoutEffect, useRef } from "react";

export default function AutoTextarea({ value, rows = 2, className = "", ...rest }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      const h = el.scrollHeight;
      if (h > 0) {
        el.style.height = `${h + (el.offsetHeight - el.clientHeight)}px`;
      } else {
        el.style.height = "";
      }
    };
    fit();
    const id = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      className={className}
      {...rest}
    />
  );
}
