"use client";

import { useEffect, useState } from "react";
import { Select } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import GalleryGrid from "@/components/GalleryGrid";
import AddImagesModal from "@/components/AddImagesModal";
import ConfirmModal from "@/components/ConfirmModal";
import PromptModal from "@/components/PromptModal";

export default function AdminImagesPage() {
  const [topics, setTopics] = useState([]);
  const [entries, setEntries] = useState([]);
  const [q, setQ] = useState("");
  const [topicId, setTopicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (topicId) params.set("topicId", topicId);
    fetch(`/api/entries?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEntries(data);
        else setMessage({ type: "error", text: data?.error || "Error" });
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  }, [q, topicId, refreshKey]);

  async function editNote() {
    const res = await fetch(`/api/entries/${editTarget._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Update failed");
    setEntries((list) =>
      list.map((e) => (e._id === json._id ? { ...e, note: json.note } : e))
    );
    setMessage({ type: "ok", text: "Note updated ✓" });
  }

  async function remove() {
    const res = await fetch(`/api/entries/${deleteTarget._id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Delete failed");
    setEntries((list) => list.filter((e) => e._id !== deleteTarget._id));
  }

  function addTopic(topic) {
    setTopics((list) =>
      [...list, topic].sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 fade-up">
        <div>
          <h1 className="text-xl font-bold">Images & Upload History</h1>
          <p className="text-sm text-slate-500">
            Search, edit notes, delete — total {entries.length}
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
          <PlusOutlined /> Add Images
        </button>
      </div>

      <div className="flex flex-wrap gap-3 fade-up" style={{ animationDelay: "0.06s" }}>
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
            <SearchOutlined />
          </span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLoading(true);
            }}
            placeholder="Search book / saint / note..."
            className="input !pl-9"
          />
        </div>
        <Select
          value={topicId}
          onChange={(v) => {
            setTopicId(v);
            setLoading(true);
          }}
          className="select-input w-44"
          options={[
            { value: "", label: "All topics" },
            ...topics.map((t) => ({ value: t._id, label: t.name })),
          ]}
        />
      </div>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-5">
          <GalleryGrid
            entries={entries}
            onDelete={(entry) => setDeleteTarget(entry)}
            onEdit={(entry) => {
              setEditTarget(entry);
              setNoteText(entry.note || "");
            }}
          />
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 font-semibold text-slate-700">
              <PictureOutlined className="text-emerald-600" />
              Upload details
            </h2>
            {entries.map((e) => (
              <div
                key={`edit-${e._id}`}
                className="card flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
              >
                <span className="text-slate-600">
                  {new Date(e.createdAt).toLocaleString("en-IN")} ·{" "}
                  <b className="text-slate-800">{e.uploadedByName}</b> · {e.bookName} ·{" "}
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                    {e.topicNames?.length ? e.topicNames.join(", ") : e.topicName}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditTarget(e);
                    setNoteText(e.note || "");
                  }}
                  className="icon-btn border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <EditOutlined /> Edit Note
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddImagesModal
          onClose={() => setShowAdd(false)}
          topics={topics}
          onTopicAdded={addTopic}
          onUploaded={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Image"
        message={
          deleteTarget
            ? `Delete the image of "${deleteTarget.bookName}"?`
            : ""
        }
        confirmText="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
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
        onSubmit={editNote}
      />
    </div>
  );
}
