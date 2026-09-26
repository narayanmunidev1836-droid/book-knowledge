"use client";

export default function Spinner({ label = "Loading...", className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 text-slate-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-600" />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  );
}
