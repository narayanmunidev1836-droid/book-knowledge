"use client";

import { useEffect, useRef, useState } from "react";

// The one place that decides how long search boxes wait before reporting.
export const SEARCH_DEBOUNCE_MS = 300;

// Drop-in replacement for a search <input>. It renders a plain <input> (all
// other props, className included, go straight through), keeps what the user
// types locally so typing never lags, and calls onChange(text) only once they
// pause for `delay` ms. Unlike <input>, onChange receives the string itself.
export default function DebouncedInput({
  value = "",
  onChange,
  delay = SEARCH_DEBOUNCE_MS,
  ...rest
}) {
  const [text, setText] = useState(value);
  const emitted = useRef(value); // last value handed to the parent
  const onChangeRef = useRef(onChange);
  const timer = useRef(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // A parent-driven change (e.g. a reset) replaces what is shown.
  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      clearTimeout(timer.current);
      setText(value);
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleChange(e) {
    const next = e.target.value;
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (next === emitted.current) return;
      emitted.current = next;
      onChangeRef.current?.(next);
    }, delay);
  }

  return <input {...rest} value={text} onChange={handleChange} />;
}
