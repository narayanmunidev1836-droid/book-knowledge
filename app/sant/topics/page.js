"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  TagsOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import ConfirmModal from "@/components/ConfirmModal";
import Spinner from "@/components/Spinner";

// Same order the API returns with ?sort=count: busiest topic first.
const byCountThenName = (a, b) =>
  (b.entryCount || 0) - (a.entryCount || 0) ||
  String(a.name).localeCompare(String(b.name));

export default function SantTopicsPage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? topics.filter(
        (t) =>
          // The row being edited stays visible even if the rename hides it.
          (editing && editing._id === t._id) ||
          t.name.toLowerCase().includes(term)
      )
    : topics;

  useEffect(() => {
    fetch("/api/topics?sort=count")
      .then((r) => r.json())
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Failed to add" });
      return;
    }
    setTopics((list) => [...list, json].sort(byCountThenName));
    setName("");
    setMessage({ type: "ok", text: "Topic added ✓" });
  }

  async function saveEdit() {
    const next = String(editing?.name || "").trim();
    if (!next) return;
    const res = await fetch(`/api/topics/${editing._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Update failed" });
      return;
    }
    setTopics((list) =>
      list.map((t) => (t._id === json._id ? { ...t, name: json.name } : t)).sort(byCountThenName)
    );
    setEditing(null);
    setMessage({ type: "ok", text: "Topic updated ✓" });
  }

  async function remove() {
    const res = await fetch(`/api/topics/${deleteTarget._id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Delete failed");
    setTopics((list) => list.filter((t) => t._id !== deleteTarget._id));
  }

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
            <TagsOutlined />
          </span>
          My Topics
        </h1>
        <p className="text-sm text-slate-500">
          Topics you created — total {topics.length}
          {term ? `, showing ${filtered.length}` : ""}
        </p>
      </div>

      <div className="relative max-w-md fade-up" style={{ animationDelay: "0.06s" }}>
        <SearchOutlined className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search topics…"
          className="input !pl-9"
        />
      </div>

      <form
        onSubmit={handleAdd}
        className="flex max-w-md gap-2 fade-up"
        style={{ animationDelay: "0.1s" }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New topic name"
          required
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">
          <PlusOutlined /> Add
        </button>
      </form>

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
        <Spinner />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((topic, i) => (
            <div
              key={topic._id}
              className="card card-hover fade-up flex items-center justify-between gap-2 p-4"
              style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}
            >
              {editing?._id === topic._id ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <TagsOutlined />
                  </span>
                  <input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className="input !py-1 flex-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="icon-btn shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
                    title="Save"
                  >
                    <SaveOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="icon-btn shrink-0 border border-slate-200 text-slate-500 hover:bg-slate-100"
                    title="Cancel"
                  >
                    <CloseOutlined />
                  </button>
                </div>
              ) : (
                <Link
                  href={`/sant/topics/${topic._id}`}
                  title="View records of this topic"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <TagsOutlined />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-emerald-700">
                      {topic.name}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {topic.entryCount || 0}{" "}
                      {(topic.entryCount || 0) === 1 ? "record" : "records"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-emerald-500">
                    View →
                  </span>
                </Link>
              )}
              {editing?._id !== topic._id && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing({ _id: topic._id, name: topic.name })}
                    className="icon-btn border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    title="Edit"
                  >
                    <EditOutlined />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(topic)}
                    className="icon-btn border border-red-200 text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              )}
            </div>
          ))}
          {topics.length === 0 && !loading && (
            <p className="text-sm text-slate-500">
              No topics yet — add your first one above.
            </p>
          )}
          {topics.length > 0 && filtered.length === 0 && (
            <div className="card col-span-full flex items-center gap-2 p-6 text-slate-500">
              <SearchOutlined className="text-emerald-400" />
              <p className="text-sm">
                No topics match “{search.trim()}” — try another word.
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Topic"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be deleted. Your images tagged only with this topic will be deleted too.`
            : ""
        }
        confirmText="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
