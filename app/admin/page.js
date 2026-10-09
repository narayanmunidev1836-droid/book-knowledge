"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TeamOutlined,
  BookOutlined,
  TagsOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import Spinner from "@/components/Spinner";
import BarChart from "@/components/BarChart";
import RankList from "@/components/RankList";

const CARDS = [
  { key: "totalSants", label: "Total Sants", icon: TeamOutlined, tint: "from-emerald-500 to-teal-500" },
  { key: "totalBooks", label: "Total Books", icon: BookOutlined, tint: "from-sky-500 to-blue-500" },
  { key: "totalTopics", label: "Total Topics", icon: TagsOutlined, tint: "from-amber-500 to-orange-500" },
  { key: "totalEntries", label: "Total Images", icon: PictureOutlined, tint: "from-violet-500 to-purple-500" },
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load data"));
  }, []);

  const labels = useMemo(() => {
    const daily = data?.daily || [];
    return daily.map((d, i) => ({
      ...d,
      show: i % 5 === 0 || i === daily.length - 1,
    }));
  }, [data]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <Spinner />;

  const daily = data.daily || [];
  const total30 = daily.reduce((s, d) => s + (d?.count || 0), 0);
  const activeDays = daily.filter((d) => (d?.count || 0) > 0).length;

  return (
    <div className="space-y-6">
      <div className="fade-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl shadow-emerald-500/25">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm font-medium text-emerald-100/90">
            Overview of all data
          </p>
          <h1 className="mt-1 text-2xl font-bold lg:text-3xl">
            Admin Dashboard
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="card card-hover fade-up overflow-hidden p-4"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.tint} text-lg text-white shadow-md`}
              >
                <Icon />
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-800">
                {(data.totals?.[card.key] ?? 0).toLocaleString("en-IN")}
              </div>
              <div className="text-sm text-slate-500">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="card fade-up p-5" style={{ animationDelay: "0.24s" }}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-800">Uploads — last 30 days</h2>
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-emerald-700">{total30}</span> images on{" "}
            <span className="font-semibold text-emerald-700">{activeDays}</span> active days
          </p>
        </div>
        <BarChart data={labels} />
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          {labels.filter((d) => d?.show && d?.date).map((d) => (
            <span key={d?.date}>{d.date?.slice(5)}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card fade-up p-5" style={{ animationDelay: "0.3s" }}>
          <h2 className="mb-4 font-semibold text-slate-800">Top Books</h2>
          <RankList items={data.topBooks || []} color="sky" />
        </div>
        <div className="card fade-up p-5" style={{ animationDelay: "0.36s" }}>
          <h2 className="mb-4 font-semibold text-slate-800">Top Topics</h2>
          <RankList items={data.topTopics || []} />
        </div>
        <div className="card fade-up p-5" style={{ animationDelay: "0.42s" }}>
          <h2 className="mb-4 font-semibold text-slate-800">Most Active Sants</h2>
          <RankList items={data.perSant || []} />
        </div>
      </div>
    </div>
  );
}
