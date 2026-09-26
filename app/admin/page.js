"use client";

import { useEffect, useState } from "react";
import {
  TeamOutlined,
  BookOutlined,
  TagsOutlined,
  PictureOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const CARDS = [
  { key: "totalSants", label: "Total Sants", icon: TeamOutlined, tint: "from-emerald-500 to-teal-500" },
  { key: "totalBooks", label: "Total Books", icon: BookOutlined, tint: "from-sky-500 to-blue-500" },
  { key: "totalTopics", label: "Total Topics", icon: TagsOutlined, tint: "from-amber-500 to-orange-500" },
  { key: "totalImages", label: "Total Images", icon: PictureOutlined, tint: "from-violet-500 to-purple-500" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setStats(data);
      })
      .catch(() => setError("Failed to load data"));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats)
    return (
      <p className="flex items-center gap-2 text-slate-500">
        <ClockCircleOutlined className="text-emerald-500" /> Loading...
      </p>
    );

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
                {(stats[card.key] ?? 0).toLocaleString("en-IN")}
              </div>
              <div className="text-sm text-slate-500">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="card fade-up p-4" style={{ animationDelay: "0.24s" }}>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
          <ClockCircleOutlined className="text-emerald-600" />
          Recent Uploads
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Sant</th>
                <th className="py-2 pr-4 font-medium">Book</th>
                <th className="py-2 pr-4 font-medium">Topic</th>
                <th className="py-2 pr-4 font-medium">Page</th>
                <th className="py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent?.map((entry) => (
                <tr
                  key={entry._id}
                  className="border-b border-slate-100 transition hover:bg-emerald-50/40"
                >
                  <td className="py-2 pr-4">{entry.uploadedByName}</td>
                  <td className="py-2 pr-4">{entry.bookName}</td>
                  <td className="py-2 pr-4">
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                      {entry.topicNames?.length
                        ? entry.topicNames.join(", ")
                        : entry.topicName}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{entry.page || "—"}</td>
                  <td className="py-2 text-slate-500">
                    {new Date(entry.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
              {!stats.recent?.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    No uploads yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
