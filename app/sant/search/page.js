"use client";

import { useEffect, useState } from "react";
import {
  SearchOutlined,
  EyeOutlined,
  BookOutlined,
  TagsOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { Select, Modal } from "antd";
import Spinner from "@/components/Spinner";

export default function SearchPage() {
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState("");
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [fullImage, setFullImage] = useState("");
  const [fullLoading, setFullLoading] = useState(false);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (topicId) params.set("topicId", topicId);
      fetch(`/api/entries?${params}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setEntries(data);
            setError("");
          } else {
            setError(data?.error || "Search failed");
          }
        })
        .catch(() => setError("Search failed"))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [q, topicId]);

  // Full-size image only when the detail modal opens (guarded render reset)
  const selectedId = selected?._id || null;
  const [prevSelectedId, setPrevSelectedId] = useState(null);
  if (prevSelectedId !== selectedId) {
    setPrevSelectedId(selectedId);
    setFullImage(selected?.hasFull ? "" : selected?.image || "");
    setFullLoading(Boolean(selected?.hasFull));
  }

  useEffect(() => {
    if (!selected || !selected.hasFull) return;
    let cancelled = false;
    fetch(`/api/entries/${selected._id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.image) setFullImage(d.image);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFullLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const topicNamesOf = (entry) =>
    entry.topicNames?.length ? entry.topicNames : [entry.topicName];

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h1 className="text-xl font-bold">Search</h1>
        <p className="text-sm text-slate-500">
          Search by book, topic, note or anything — click a row for full details
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end fade-up" style={{ animationDelay: "0.06s" }}>
        <div className="flex-1">
          <label className="label">Search text</label>
          <div className="relative">
            <SearchOutlined className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLoading(true);
              }}
              placeholder="e.g. guru bhakti, VACHNAMRUT, page note…"
              className="input !pl-9"
            />
          </div>
        </div>
        <div className="sm:w-64">
          <label className="label">Topic filter (optional)</label>
          <Select
            value={topicId || undefined}
            onChange={(v) => {
              setTopicId(v || "");
              setLoading(true);
            }}
            allowClear
            placeholder="— All topics —"
            className="select-input w-full"
            showSearch
            optionFilterProp="label"
            options={topics.map((t) => ({ value: t._id, label: t.name }))}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <Spinner label="Searching..." className="py-6" />
      ) : (
        <div className="fade-up">
          <p className="mb-2 text-sm text-slate-500">
            {entries.length} result{entries.length === 1 ? "" : "s"}
          </p>
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Image</th>
                  <th className="px-4 py-3 font-medium">Book</th>
                  <th className="px-4 py-3 font-medium">Topics</th>
                  <th className="px-4 py-3 font-medium">Page</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry._id}
                    onClick={() => setSelected(entry)}
                    className="cursor-pointer border-b border-slate-100 transition hover:bg-emerald-50/50"
                  >
                    <td className="px-4 py-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.image}
                        alt={entry.bookName}
                        className="h-11 w-14 rounded-md border border-slate-200 object-cover"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                      {entry.bookName}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        {topicNamesOf(entry).map((name) => (
                          <span
                            key={name}
                            className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700"
                          >
                            {name}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{entry.page || "—"}</td>
                    <td className="max-w-[18rem] truncate px-4 py-2.5 text-slate-600 italic">
                      {entry.note || "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                      {entry.createdAt
                        ? new Date(entry.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="icon-btn border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                        <EyeOutlined />
                      </span>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No entries found — try another word
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        width="min(1000px, 94vw)"
        centered
        title={selected ? selected.bookName : ""}
      >
        {selected && (
          <div className="grid gap-5 pt-2 sm:grid-cols-2">
            <div className="flex min-h-[240px] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {fullLoading ? (
                <span className="flex flex-col items-center gap-3 py-10 text-sm text-slate-500">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  Loading image…
                </span>
              ) : fullImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fullImage}
                  alt={selected.bookName}
                  className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain"
                />
              ) : null}
            </div>

            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-2">
                <BookOutlined className="mt-0.5 text-emerald-600" />
                <span>
                  <span className="block text-xs text-slate-400">Book</span>
                  <span className="font-semibold text-slate-800">
                    {selected.bookName}
                  </span>
                </span>
              </p>
              <p className="flex items-start gap-2">
                <TagsOutlined className="mt-0.5 text-emerald-600" />
                <span>
                  <span className="block text-xs text-slate-400">Topics</span>
                  <span className="flex flex-wrap gap-1.5">
                    {topicNamesOf(selected).map((name) => (
                      <span
                        key={name}
                        className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
                      >
                        {name}
                      </span>
                    ))}
                  </span>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <FileTextOutlined className="text-emerald-600" />
                <span>
                  <span className="block text-xs text-slate-400">Page</span>
                  <span className="font-semibold text-slate-800">
                    {selected.page || "—"}
                  </span>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <UserOutlined className="text-emerald-600" />
                <span>
                  <span className="block text-xs text-slate-400">Uploaded by</span>
                  <span className="font-semibold text-slate-800">
                    {selected.uploadedByName}
                  </span>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <CalendarOutlined className="text-emerald-600" />
                <span>
                  <span className="block text-xs text-slate-400">Date</span>
                  <span className="font-semibold text-slate-800">
                    {selected.createdAt
                      ? new Date(selected.createdAt).toLocaleString("en-IN")
                      : "—"}
                  </span>
                </span>
              </p>
              {selected.note && (
                <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/60 p-3">
                  <span className="block text-xs text-slate-400">Note</span>
                  <p className="text-slate-700 italic">“{selected.note}”</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
