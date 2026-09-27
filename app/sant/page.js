"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusOutlined,
  PictureOutlined,
  BookOutlined,
  TagsOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import GalleryGrid from "@/components/GalleryGrid";
import ConfirmModal from "@/components/ConfirmModal";
import EntryEditModal from "@/components/EntryEditModal";
import Spinner from "@/components/Spinner";
import BarChart from "@/components/BarChart";
import RankList from "@/components/RankList";

const RECENT_LIMIT = 6;

const CARDS = [
  { key: "totalRecords", label: "Records", icon: FileTextOutlined, tint: "from-emerald-500 to-teal-500" },
  { key: "totalPhotos", label: "Photos", icon: PictureOutlined, tint: "from-violet-500 to-purple-500" },
  { key: "totalBooks", label: "Books", icon: BookOutlined, tint: "from-sky-500 to-blue-500" },
  { key: "totalTopics", label: "Topics", icon: TagsOutlined, tint: "from-amber-500 to-orange-500" },
];

export default function SantDashboard() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  function loadRecent() {
    return fetch(`/api/entries?page=1&limit=${RECENT_LIMIT}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : null;
        if (list) setEntries(list);
        else setError(data?.error || "Error");
        return list;
      })
      .catch(() => {
        setError("Failed to load data");
        return null;
      });
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      loadRecent(),
    ])
      .then(([dash]) => {
        if (dash && !dash.error) setStats(dash);
        else setError(dash?.error || "Error");
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  function refreshStats() {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setStats(d);
      })
      .catch(() => {});
  }

  async function handleDelete() {
    const res = await fetch(`/api/entries/${deleteTarget._id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Delete failed");
    setEntries((list) => list.filter((e) => e._id !== deleteTarget._id));
    refreshStats();
    loadRecent();
  }

  async function handleEdit(payload) {
    const res = await fetch(`/api/entries/${editTarget._id}`, {
      method: "PUT",
      body: payload, // FormData — note, removeIndices and any new images
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Update failed");
    setError("");
    const count = json.imageCount || 0;
    setEntries((list) =>
      list.map((e) =>
        e._id === json._id
          ? {
              ...e,
              note: json.note,
              title: json.title,
              image: json.thumb || json.image || "",
              thumb: json.thumb || "",
              images: json.images || [],
              thumbs: json.thumbs || [],
              imageCount: count,
              hasFull: count > 0,
            }
          : e
      )
    );
  }

  const totals = stats?.totals || {};
  const daily = stats?.daily || [];
  const labels = daily.map((d, i) => ({
    ...d,
    show: i % 5 === 0 || i === daily.length - 1,
  }));
  const total30 = daily.reduce((s, d) => s + (d?.count || 0), 0);
  const activeDays = daily.filter((d) => (d?.count || 0) > 0).length;
  const totalRecords = totals.totalRecords ?? entries.length;
  const recent = entries.slice(0, RECENT_LIMIT);

  if (error && !stats && !entries.length) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (loading) return <Spinner label="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      <div className="fade-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl shadow-emerald-500/25">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-100/90">
              Images and notes you uploaded
            </p>
            <h1 className="mt-1 text-2xl font-bold lg:text-3xl">My Dashboard</h1>
            <p className="mt-1 text-sm text-emerald-50/80">
              Total {totalRecords} {totalRecords === 1 ? "record" : "records"} ·{" "}
              {totals.totalPhotos || 0} photos
            </p>
          </div>
          <Link
            href="/sant/entry"
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-md transition hover:bg-emerald-50"
          >
            <PlusOutlined /> New Entry
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

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
                {(totals[card.key] ?? 0).toLocaleString("en-IN")}
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
            <span className="font-semibold text-emerald-700">{total30}</span> entries on{" "}
            <span className="font-semibold text-emerald-700">{activeDays}</span> active days
          </p>
        </div>
        <BarChart data={labels} />
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          {labels.filter((d) => d?.show && d?.date).map((d) => (
            <span key={d.date}>{d.date.slice(5)}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card fade-up p-5" style={{ animationDelay: "0.3s" }}>
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-slate-800">Top Books</h2>
            <Link
              href="/sant/books"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              All books →
            </Link>
          </div>
          <RankList items={stats?.topBooks || []} color="sky" />
        </div>
        <div className="card fade-up p-5" style={{ animationDelay: "0.36s" }}>
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-slate-800">Top Topics</h2>
            <Link
              href="/sant/topics"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              All topics →
            </Link>
          </div>
          <RankList items={stats?.topTopics || []} />
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-800">Recent records</h2>
            <p className="text-sm text-slate-500">
              Latest {recent.length} of {totalRecords} entries
            </p>
          </div>
          <Link
            href="/sant/search"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all records →
          </Link>
        </div>
        <div className="fade-up" style={{ animationDelay: "0.42s" }}>
          <GalleryGrid
            entries={recent}
            compact
            onDelete={(entry) => setDeleteTarget(entry)}
            onEdit={(entry) => setEditTarget(entry)}
          />
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Entry"
        message={
          deleteTarget
            ? `Delete the entry of "${deleteTarget.bookName}"?`
            : ""
        }
        confirmText="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <EntryEditModal
        open={!!editTarget}
        entry={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
      />
    </div>
  );
}
