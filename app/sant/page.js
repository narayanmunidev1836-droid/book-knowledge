"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusOutlined } from "@ant-design/icons";
import GalleryGrid from "@/components/GalleryGrid";
import ConfirmModal from "@/components/ConfirmModal";
import PromptModal from "@/components/PromptModal";

export default function SantDashboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    fetch("/api/entries?mine=1")
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : []);
        if (!Array.isArray(data)) setError(data?.error || "Error");
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete() {
    const res = await fetch(`/api/entries/${deleteTarget._id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Delete failed");
    setEntries((list) => list.filter((e) => e._id !== deleteTarget._id));
  }

  async function handleEdit() {
    const res = await fetch(`/api/entries/${editTarget._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Update failed");
    setError("");
    setEntries((list) =>
      list.map((e) => (e._id === json._id ? { ...e, note: json.note } : e))
    );
  }

  return (
    <div className="space-y-5">
      <div className="fade-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl shadow-emerald-500/25">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-100/90">
              Images and notes you uploaded
            </p>
            <h1 className="mt-1 text-2xl font-bold lg:text-3xl">My Entries</h1>
            <p className="mt-1 text-sm text-emerald-50/80">
              Total {entries.length} {entries.length === 1 ? "entry" : "entries"}
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
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="fade-up" style={{ animationDelay: "0.08s" }}>
          <GalleryGrid
            entries={entries}
            onDelete={(entry) => setDeleteTarget(entry)}
            onEdit={(entry) => {
              setEditTarget(entry);
              setNoteText(entry.note || "");
            }}
          />
        </div>
      )}

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

      <PromptModal
        open={!!editTarget}
        title="Edit Note"
        label="Note"
        value={noteText}
        onChange={setNoteText}
        placeholder="Write a short note..."
        type="textarea"
        confirmText="Save"
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
      />
    </div>
  );
}
