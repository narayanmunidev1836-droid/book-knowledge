"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "antd";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  EditOutlined,
  BookOutlined,
  TagsOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  PictureOutlined,
  InboxOutlined,
  SearchOutlined,
  HighlightOutlined,
  FullscreenOutlined,
} from "@ant-design/icons";
import Spinner from "@/components/Spinner";
import EntryEditModal from "@/components/EntryEditModal";
import FullscreenViewer from "@/components/FullscreenViewer";
import {
  neighborsOf,
  preload,
  urlsOf,
  useProgressiveSrc,
} from "@/lib/progressiveImg";
import { matchesText } from "@/lib/translit";

const topicNamesOf = (entry) =>
  entry.topicNames?.length ? entry.topicNames : [entry.topicName];

export default function TopicEntries({ topicId }) {
  const [topic, setTopic] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [fullImages, setFullImages] = useState([]);
  const [imgIdx, setImgIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/topics/${encodeURIComponent(topicId)}`).then((r) => r.json()),
      fetch(`/api/entries?topicId=${encodeURIComponent(topicId)}`).then((r) => r.json()),
    ])
      .then(([topicData, entriesData]) => {
        if (cancelled) return;
        if (topicData && topicData._id) {
          setTopic(topicData);
        } else {
          setError(topicData?.error || "Topic not found");
        }
        setEntries(Array.isArray(entriesData) ? entriesData : []);
      })
      .catch(() => !cancelled && setError("Failed to load topic"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  // Full image URLs travel with the list — no detail fetch on open.
  const selectedId = selected?._id || null;
  const [prevSelectedId, setPrevSelectedId] = useState(null);
  if (prevSelectedId !== selectedId) {
    setPrevSelectedId(selectedId);
    setFullImages(
      selected?.images?.length
        ? selected.images
        : selected?.image
          ? [selected.image]
          : []
    );
    setImgIdx(0);
  }

  useEffect(() => {
    if (!selected || fullImages.length < 2) return;
    function onKey(e) {
      if (e.key === "ArrowRight") setImgIdx((i) => (i + 1) % fullImages.length);
      if (e.key === "ArrowLeft")
        setImgIdx((i) => (i - 1 + fullImages.length) % fullImages.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, fullImages.length]);

  // Warm the neighbouring rows while the dialog is open.
  useEffect(() => {
    if (!selected) return;
    const at = entries.findIndex((e) => e._id === selected._id);
    preload(neighborsOf(entries, at).flatMap((e) => urlsOf(e)));
  }, [selected, entries]);

  async function handleEdit(payload) {
    const res = await fetch(`/api/entries/${editTarget._id}`, {
      method: "PUT",
      body: payload,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Update failed");
    const count = json.imageCount || 0;
    const upd = {
      note: json.note,
      title: json.title,
      image: json.thumb || "",
      thumb: json.thumb || "",
      images: json.images || [],
      thumbs: json.thumbs || [],
      imageCount: count,
      hasFull: count > 0,
    };
    setEntries((list) =>
      list.map((e) => (e._id === json._id ? { ...e, ...upd } : e))
    );
    if (selected && selected._id === json._id) {
      setFullImages(json.images?.length ? json.images : json.thumb ? [json.thumb] : []);
      setImgIdx(0);
      setSelected((s) => (s ? { ...s, ...upd } : s));
    }
    setEditTarget(null);
  }

  const term = q.trim().toLowerCase();
  const visible = term
    ? entries.filter((e) =>
        [e.bookName, e.title, e.note, e.page, e.indexNo, ...(e.topicNames || [])]
          .filter(Boolean)
          .some((v) => matchesText(term, v))
      )
    : entries;

  const safeImgIdx = fullImages.length
    ? Math.min(imgIdx, fullImages.length - 1)
    : 0;
  const fullSrc = fullImages[safeImgIdx] || null;
  const thumbSrc =
    selected?.thumbs?.[safeImgIdx] ||
    (safeImgIdx === 0 ? selected?.image : null) ||
    null;
  const displaySrc = useProgressiveSrc(fullSrc, thumbSrc);

  const backLink = (
    <Link
      href="/sant/topics"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
    >
      <ArrowLeftOutlined /> Back to Topics
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {backLink}
        <Spinner label="Loading topic..." />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="card flex flex-col items-center gap-3 p-10 text-slate-500">
          <TagsOutlined className="text-3xl text-emerald-300" />
          <p className="text-sm">{error || "Topic not found"}</p>
          <Link href="/sant/topics" className="btn-primary">
            Back to Topics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {backLink}

      <div className="card flex items-start gap-4 p-4 fade-up">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl text-white shadow-md shadow-emerald-500/30">
          <TagsOutlined />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-slate-800">{topic.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {entries.length} {entries.length === 1 ? "record" : "records"}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {new Set(entries.map((e) => e.bookName).filter(Boolean)).size} books
            </span>
          </div>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="relative fade-up" style={{ animationDelay: "0.06s" }}>
          <SearchOutlined className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search in these records — book, title, page, note…"
            className="input !pl-9"
          />
        </div>
      )}

      <div className="space-y-3 fade-up" style={{ animationDelay: "0.1s" }}>
        {/* Mobile & tablet — search-style cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {visible.map((entry, i) => (
            <div
              key={entry._id}
              className="card card-hover flex min-w-0 flex-col gap-3 p-4 fade-up"
              style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelected(entry)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSelected(entry);
                }}
                className="flex cursor-pointer items-start gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                  {entry.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.image}
                      alt={entry.bookName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-slate-300">
                      <PictureOutlined />
                    </span>
                  )}
                  {entry.imageCount > 1 && (
                    <span className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold leading-4 text-white">
                      {entry.imageCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {entry.title && (
                    <p className="line-clamp-2 break-words font-semibold text-slate-800">
                      {entry.title}
                    </p>
                  )}
                  <p
                    className={`truncate ${
                      entry.title
                        ? "text-sm font-medium text-slate-500"
                        : "font-semibold text-slate-800"
                    }`}
                  >
                    {entry.bookName}
                    {entry.page ? ` - ${entry.page}` : ""}
                    {entry.indexNo ? ` · idx ${entry.indexNo}` : ""}
                  </p>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {topicNamesOf(entry).map((name) => (
                      <span
                        key={name}
                        className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700"
                      >
                        {name}
                      </span>
                    ))}
                  </span>
                  {entry.note && (
                    <p className="mt-1 truncate text-sm italic text-slate-600">
                      “{entry.note}”
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(entry)}
                  className="icon-btn border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <EyeOutlined /> View
                </button>
                <button
                  type="button"
                  onClick={() => setEditTarget(entry)}
                  className="icon-btn border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <EditOutlined /> Edit
                </button>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="card col-span-full flex flex-col items-center gap-2 p-10 text-slate-400 sm:col-span-2">
              <InboxOutlined className="text-3xl text-emerald-300" />
              <p className="text-sm">
                {term
                  ? "No records match your search"
                  : "No records for this topic yet — add one from New Entry"}
              </p>
            </div>
          )}
        </div>

        {/* Desktop — table */}
        <div className="card hidden overflow-x-auto lg:block">
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
              {visible.map((entry) => (
                <tr
                  key={entry._id}
                  onClick={() => setSelected(entry)}
                  className="cursor-pointer border-b border-slate-100 transition hover:bg-emerald-50/50"
                >
                  <td className="px-4 py-2.5">
                    <span className="relative block">
                      {entry.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.image}
                          alt={entry.bookName}
                          className="h-11 w-14 rounded-md border border-slate-200 object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-14 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-300">
                          <PictureOutlined />
                        </span>
                      )}
                      {entry.imageCount > 1 && (
                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold leading-4 text-white">
                          {entry.imageCount}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-800">
                    <div className="max-w-[14rem]">
                      {entry.title && (
                        <p className="truncate font-semibold">{entry.title}</p>
                      )}
                      <p
                        className={`truncate ${
                          entry.title ? "text-sm text-slate-500" : "font-semibold"
                        }`}
                      >
                        {entry.bookName}
                      </p>
                    </div>
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
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {entry.page || "—"}
                    {entry.indexNo ? ` · idx ${entry.indexNo}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 italic">
                    <div className="max-w-[16rem] truncate">
                      {entry.note || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex gap-1.5">
                      <button
                        type="button"
                        title="View details"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(entry);
                        }}
                        className="icon-btn border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <EyeOutlined />
                      </button>
                      <button
                        type="button"
                        title="Edit entry"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTarget(entry);
                        }}
                        className="icon-btn border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <EditOutlined />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    <InboxOutlined className="mr-2 text-emerald-300" />
                    {term
                      ? "No records match your search"
                      : "No records for this topic yet — add one from New Entry"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selected}
        onCancel={() => {
          setSelected(null);
          setFullscreen(false);
        }}
        footer={null}
        width="min(1000px, 94vw)"
        centered
        title={selected ? selected.bookName : ""}
      >
        {selected && (
          <div className="grid gap-5 pt-2 sm:grid-cols-2">
            <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {fullImages.length ? (
                <div className="relative flex w-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displaySrc}
                    alt={`${selected.bookName} ${safeImgIdx + 1}`}
                    onClick={() => setFullscreen(true)}
                    title="Click to view full screen"
                    className="max-h-[70vh] w-auto max-w-full cursor-zoom-in rounded-xl object-contain"
                  />
                  <button
                    type="button"
                    aria-label="View full screen"
                    onClick={() => setFullscreen(true)}
                    className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-emerald-600"
                  >
                    <FullscreenOutlined />
                  </button>
                  {fullSrc && displaySrc !== fullSrc && (
                    <span
                      role="status"
                      aria-label="Loading full image"
                      className="absolute right-3 bottom-3 h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"
                    />
                  )}
                  {fullImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous photo"
                        onClick={() =>
                          setImgIdx(
                            (i) => (i - 1 + fullImages.length) % fullImages.length
                          )
                        }
                        className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-lg text-white backdrop-blur transition hover:bg-emerald-600"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label="Next photo"
                        onClick={() => setImgIdx((i) => (i + 1) % fullImages.length)}
                        className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-lg text-white backdrop-blur transition hover:bg-emerald-600"
                      >
                        ›
                      </button>
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        {safeImgIdx + 1} / {fullImages.length}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <span className="flex flex-col items-center gap-2 py-10 text-sm text-slate-400">
                  <PictureOutlined className="text-3xl text-slate-300" />
                  No image for this entry
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {selected.title && (
                <p className="flex items-start gap-2">
                  <HighlightOutlined className="mt-0.5 text-emerald-600" />
                  <span>
                    <span className="block text-xs text-slate-400">Title</span>
                    <span className="font-semibold text-slate-800">
                      {selected.title}
                    </span>
                  </span>
                </p>
              )}
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
                  <span className="block text-xs text-slate-400">Page / Index</span>
                  <span className="font-semibold text-slate-800">
                    {selected.page || "—"}
                    {selected.indexNo ? ` · ${selected.indexNo}` : ""}
                  </span>
                </span>
              </p>
              {selected.note && (
                <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/60 p-3">
                  <span className="block text-xs text-slate-400">Note</span>
                  <p className="break-words text-slate-700 italic">“{selected.note}”</p>
                </div>
              )}
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
              <button
                type="button"
                onClick={() => setEditTarget(selected)}
                className="btn-ghost w-full justify-center"
              >
                <EditOutlined /> Edit note & images
              </button>
            </div>
          </div>
        )}
      </Modal>

      <FullscreenViewer
        open={fullscreen}
        src={displaySrc}
        alt={`${selected?.bookName || ""} ${safeImgIdx + 1}`}
        index={safeImgIdx}
        count={fullImages.length}
        onPrev={() =>
          setImgIdx((i) => (i - 1 + fullImages.length) % fullImages.length)
        }
        onNext={() => setImgIdx((i) => (i + 1) % fullImages.length)}
        onClose={() => setFullscreen(false)}
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
