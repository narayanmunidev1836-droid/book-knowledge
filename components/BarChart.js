"use client";

export default function BarChart({ data = [], height = 160 }) {
  const max = Math.max(1, ...data.map((d) => d?.count || 0));
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.filter(Boolean).map((d) => (
        <div key={d.date || ""} className="group relative flex-1">
          <div
            className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-400 transition group-hover:from-emerald-600 group-hover:to-teal-500"
            style={{ height: Math.max(3, ((d.count || 0) / max) * height) }}
            title={`${d.date || ""}: ${d.count || 0}`}
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {d.count || 0}
          </span>
        </div>
      ))}
    </div>
  );
}
