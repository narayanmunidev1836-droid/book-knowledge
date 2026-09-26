"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TeamOutlined,
  BookOutlined,
  TagsOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import Spinner from "@/components/Spinner";

const TILES = [
  { key: "totalSants", label: "Sants", icon: TeamOutlined, tint: "from-emerald-500 to-teal-500" },
  { key: "totalBooks", label: "Books", icon: BookOutlined, tint: "from-sky-500 to-blue-500" },
  { key: "totalTopics", label: "Topics", icon: TagsOutlined, tint: "from-amber-500 to-orange-500" },
  { key: "totalEntries", label: "Images", icon: PictureOutlined, tint: "from-violet-500 to-purple-500" },
];

function BarChart({ data, height = 160 }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d) => (
        <div key={d.date} className="group relative flex-1">
          <div
            className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-400 transition group-hover:from-emerald-600 group-hover:to-teal-500"
            style={{ height: Math.max(3, (d.count / max) * height) }}
            title={`${d.date}: ${d.count}`}
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function RankList({ items, color = "emerald" }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) return <p className="text-sm text-slate-500">No data yet</p>;
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={`${item.name}-${i}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-slate-700">{item.name}</span>
            <span className="shrink-0 text-xs font-semibold text-slate-500">{item.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${color === "emerald" ? "from-emerald-500 to-teal-500" : "from-sky-500 to-blue-500"}`}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load analytics"));
  }, []);

  const labels = useMemo(() => {
    if (!data) return [];
    return data.daily.map((d, i) => ({
      ...d,
      show: i % 5 === 0 || i === data.daily.length - 1,
    }));
  }, [data]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <Spinner />;

  const total30 = data.daily.reduce((s, d) => s + d.count, 0);
  const activeDays = data.daily.filter((d) => d.count > 0).length;

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-sm text-slate-500">Upload trends and top content (last 30 days)</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TILES.map((t, i) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className="card card-hover fade-up p-4"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${t.tint} text-white`}>
                <Icon />
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-800">
                {(data.totals[t.key] ?? 0).toLocaleString("en-IN")}
              </div>
              <div className="text-sm text-slate-500">{t.label}</div>
            </div>
          );
        })}
      </div>

      <div className="card fade-up p-5" style={{ animationDelay: "0.2s" }}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-800">Uploads — last 30 days</h2>
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-emerald-700">{total30}</span> images on{" "}
            <span className="font-semibold text-emerald-700">{activeDays}</span> active days
          </p>
        </div>
        <BarChart data={labels} />
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          {labels.filter((d) => d.show).map((d) => (
            <span key={d.date}>{d.date.slice(5)}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card fade-up p-5" style={{ animationDelay: "0.26s" }}>
          <h2 className="mb-4 font-semibold text-slate-800">Top Books</h2>
          <RankList items={data.topBooks} color="sky" />
        </div>
        <div className="card fade-up p-5" style={{ animationDelay: "0.32s" }}>
          <h2 className="mb-4 font-semibold text-slate-800">Top Topics</h2>
          <RankList items={data.topTopics} />
        </div>
        <div className="card fade-up p-5" style={{ animationDelay: "0.38s" }}>
          <h2 className="mb-4 font-semibold text-slate-800">Most Active Sants</h2>
          <RankList items={data.perSant} />
        </div>
      </div>
    </div>
  );
}
