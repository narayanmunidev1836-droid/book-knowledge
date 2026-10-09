"use client";

import { useEffect, useState } from "react";
import {
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  TagsOutlined,
  FileTextOutlined,
  HighlightOutlined,
  UserOutlined,
  CalendarOutlined,
  PictureOutlined,
  FullscreenOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Select, Modal } from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import Spinner from "@/components/Spinner";
import ConfirmModal from "@/components/ConfirmModal";
import EntryEditModal from "@/components/EntryEditModal";
import {
  neighborsOf,
  preload,
  urlsOf,
  useProgressiveSrc,
} from "@/lib/progressiveImg";

const PAGE_SIZE = 10;

export default function SearchPage() {
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState("");
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [fullImages, setFullImages] = useState([]);
  const [imgIdx, setImgIdx] = useState(0); // current photo in the detail modal
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => { });
  }, []);

  function paramsFor(nextPage) {
    const params = new URLSearchParams();
    const term = q.trim();
    if (term) params.set("q", term);
    if (topicId) params.set("topicId", topicId);
    params.set("page", String(nextPage));
    params.set("limit", String(PAGE_SIZE));
    return params;
  }

  function applyPage(data) {
    setEntries(data.items);
    setTotal(data.total || 0);
    setPages(data.pages || 0);
    setPage(data.page || 1);
    setError("");
  }

  // Filter change always restarts from page 1 (debounced).
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/entries?${paramsFor(1)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.items)) {
            applyPage(data);
          } else if (Array.isArray(data)) {
            setEntries(data);
            setTotal(data.length);
            setPages(1);
            setPage(1);
            setError("");
          } else {
            setError(data?.error || "Search failed");
          }
        })
        .catch(() => setError("Search failed"))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, topicId]);

  // Pagination is decided by the server — this only asks for the next page.
  async function loadMore() {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/entries?${paramsFor(page + 1)}`);
      const data = await res.json();
      if (!res.ok || !data || !Array.isArray(data.items)) {
        throw new Error(data?.error || "Failed to load more");
      }
      setEntries((prev) => [...prev, ...data.items]);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
      setPage(data.page || page + 1);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/entries/${deleteTarget._id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Delete failed");
    setEntries((list) => list.filter((e) => e._id !== deleteTarget._id));
    setTotal((t) => Math.max(0, t - 1));
    if (selected && selected._id === deleteTarget._id) setSelected(null);
  }

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

  // Prev / next between the entry's photos while the detail modal is open.
  useEffect(() => {
    if (!selected || fullImages.length < 2) return;
    function onKey(e) {
      if (e.key === "ArrowRight") {
        setImgIdx((i) => (i + 1) % fullImages.length);
      }
      if (e.key === "ArrowLeft") {
        setImgIdx((i) => (i - 1 + fullImages.length) % fullImages.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, fullImages.length]);

  // Esc closes the fullscreen viewer only (capture, so the modal stays open).
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setFullscreen(false);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [fullscreen]);

  // Warm the neighbouring rows while the detail modal is open.
  useEffect(() => {
    if (!selected) return;
    const at = entries.findIndex((e) => e._id === selected._id);
    preload(neighborsOf(entries, at).flatMap((e) => urlsOf(e)));
  }, [selected, entries]);

  const topicNamesOf = (entry) =>
    entry.topicNames?.length ? entry.topicNames : [entry.topicName];

  async function handleEdit(payload) {
    const res = await fetch(`/api/entries/${editTarget._id}`, {
      method: "PUT",
      body: payload, // FormData — note, removeIndices and any new images
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Update failed");
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
  }

  const safeImgIdx = fullImages.length
    ? Math.min(imgIdx, fullImages.length - 1)
    : 0;
  const fullSrc = fullImages[safeImgIdx] || null;
  const thumbSrc =
    selected?.thumbs?.[safeImgIdx] ||
    (safeImgIdx === 0 ? selected?.image : null) ||
    null;
  const displaySrc = useProgressiveSrc(fullSrc, thumbSrc);

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
            {total} result{total === 1 ? "" : "s"}
          </p>

          <InfiniteScroll
            dataLength={entries.length}
            next={loadMore}
            hasMore={page < pages && !loadingMore}
            scrollThreshold="300px"
            loader={
              <div
                className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500"
                role="status"
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                Loading more…
              </div>
            }
            endMessage={
              total > 0 ? (
                <p className="mt-4 text-center text-xs text-slate-400">
                  All {total} {total === 1 ? "result" : "results"} loaded
                </p>
              ) : null
            }
          >
            {/* Mobile & tablet — book-style cards (same look as /sant/books) */}
            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {entries.map((entry, i) => (
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
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(entry)}
                      className="icon-btn border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <DeleteOutlined /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {entries.length === 0 && (
                <div className="card col-span-full flex flex-col items-center gap-2 p-10 text-slate-400 sm:col-span-2">
                  <PictureOutlined className="text-3xl text-emerald-300" />
                  <p className="text-sm">No entries found — try another word</p>
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
                  {entries.map((entry) => (
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
                        <div className="max-w-[18rem] truncate">
                          {entry.note || "—"}
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
                          <button
                            type="button"
                            title="Delete entry"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(entry);
                            }}
                            className="icon-btn border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <DeleteOutlined />
                          </button>
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
          </InfiniteScroll>
        </div>
      )}

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
                            (i) =>
                              (i - 1 + fullImages.length) % fullImages.length
                          )
                        }
                        className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-lg text-white backdrop-blur transition hover:bg-emerald-600"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label="Next photo"
                        onClick={() =>
                          setImgIdx((i) => (i + 1) % fullImages.length)
                        }
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
              {selected.note && (
                <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/60 p-3">
                  <span className="block text-xs text-slate-400">Note</span>
                  <p className="break-words text-slate-700 italic">“{selected.note}”</p>
                </div>
              )}
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

      {fullscreen && fullSrc && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/95"
          onClick={() => setFullscreen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt={`${selected?.bookName || ""} ${safeImgIdx + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-screen max-w-full object-contain"
          />
          <button
            type="button"
            aria-label="Close full screen"
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur transition hover:bg-emerald-600"
          >
            <CloseOutlined />
          </button>
          {fullImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIdx((i) => (i - 1 + fullImages.length) % fullImages.length);
                }}
                className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition hover:bg-emerald-600"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIdx((i) => (i + 1) % fullImages.length);
                }}
                className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition hover:bg-emerald-600"
              >
                ›
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {safeImgIdx + 1} / {fullImages.length}
              </span>
            </>
          )}
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

      <EntryEditModal
        open={!!editTarget}
        entry={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
      />
    </div>
  );
}
