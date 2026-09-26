"use client";

export default function RankList({ items = [], color = "emerald" }) {
  if (!items.length) return <p className="text-sm text-slate-500">No data yet</p>;
  const max = Math.max(1, ...items.map((i) => i?.count || 0));
  return (
    <div className="space-y-2.5">
      {items.filter(Boolean).map((item, i) => (
        <div key={`${item.name || i}-${i}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-slate-700">{item.name}</span>
            <span className="shrink-0 text-xs font-semibold text-slate-500">{item.count || 0}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${color === "emerald" ? "from-emerald-500 to-teal-500" : "from-sky-500 to-blue-500"}`}
              style={{ width: `${((item.count || 0) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
