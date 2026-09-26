"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DatabaseOutlined,
  UserOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import Spinner from "@/components/Spinner";

export default function AdminReportPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/report")
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load report"));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return (data.rows || []).filter(
      (r) => rx.test(r?.name || "") || rx.test(r?.email || "") || rx.test(r?.mobile || "")
    );
  }, [data, q]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <Spinner />;

  const cards = [
    { key: "sants", label: "Total Sants", value: data.sants ?? 0, icon: UserOutlined, tint: "from-emerald-500 to-teal-500" },
    { key: "books", label: "Total Books", value: data.totals?.books ?? 0, icon: DatabaseOutlined, tint: "from-sky-500 to-blue-500" },
    { key: "topics", label: "Total Topics", value: data.totals?.topics ?? 0, icon: DatabaseOutlined, tint: "from-amber-500 to-orange-500" },
    { key: "entries", label: "Total Images", value: data.totals?.entries ?? 0, icon: DatabaseOutlined, tint: "from-violet-500 to-purple-500" },
  ];

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h1 className="text-xl font-bold">Sant Activity Report</h1>
        <p className="text-sm text-slate-500">How much each sant has contributed</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              className="card card-hover fade-up p-4"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${c.tint} text-white`}>
                <Icon />
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-800">{c.value}</div>
              <div className="text-sm text-slate-500">{c.label}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 fade-up">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sant…"
          className="input max-w-xs"
        />
        <span className="text-sm text-slate-500">{rows.length} sants</span>
        {(data.inactive ?? 0) > 0 && (
          <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
            {data.inactive} inactive
          </span>
        )}
      </div>

      <div className="card overflow-x-auto fade-up">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Sant</th>
              <th className="px-4 py-3 font-medium">Books</th>
              <th className="px-4 py-3 font-medium">Topics</th>
              <th className="px-4 py-3 font-medium">Images</th>
              <th className="px-4 py-3 font-medium">Last Upload</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 transition hover:bg-emerald-50/40">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.email || r.mobile}</p>
                </td>
                <td className="px-4 py-3">{r.books}</td>
                <td className="px-4 py-3">{r.topics}</td>
                <td className="px-4 py-3 font-semibold text-emerald-700">{r.entries}</td>
                <td className="px-4 py-3 text-slate-500">
                  {r.lastUpload ? new Date(r.lastUpload).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="px-4 py-3">
                  {r.active ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircleOutlined /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
                      <StopOutlined /> Disabled
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No sants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
