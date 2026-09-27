"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "@ant-design/icons";
import Spinner from "@/components/Spinner";
import EntryEditModal from "@/components/EntryEditModal";
import {
  neighborsOf,
  preload,
  urlsOf,
  useProgressiveSrc,
} from "@/lib/progressiveImg";

const topicNamesOf = (entry) =>
  entry.topicNames?.length ? entry.topicNames : [entry.topicName];

export default function BookEntries({ bookId }) {
  const [book, setBook] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [fullImages, setFullImages] = useState([]);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/books/${encodeURIComponent(bookId)}`).then((r) => r.json()),
      fetch(`/api/entries?bookId=${encodeURIComponent(bookId)}`).then((r) => r.json()),
    ])
      .then(([bookData, entriesData]) => {
        if (cancelled) return;
        if (bookData && bookData._id) {
          setBook(bookData);
        } else {
          setError(bookData?.error || "Book not found");
        }
        setEntries(Array.isArray(entriesData) ? entriesData : []);
      })
      .catch(() => !cancelled && setError("Failed to load book"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bookId]);

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
    if (!res.ok) throw new Error(json.error || "Update failed");
    const count = json.imageCount || 0;
    const upd = {
      note: json.note,
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
      href="/sant/books"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
    >
      <ArrowLeftOutlined /> Back to Books
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {backLink}
        <Spinner label="Loading book..." />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="card flex flex-col items-center gap-3 p-10 text-slate-500">
          <BookOutlined className="text-3xl text-emerald-300" />
          <p className="text-sm">{error || "Book not found"}</p>
          <Link href="/sant/books" className="btn-primary">
            Back to Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {backLink}

      <div className="card flex items-start gap-4 p-4 fade-up">
        <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {book.cover ? (
            <Image src={book.cover} alt={book.name} fill sizes="72px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-emerald-400">
              <BookOutlined className="text-2xl" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-slate-800">{book.name}</h1>
          <p className="text-sm text-slate-500">
            {book.author || "No author"}
            {book.publisher ? ` · ${book.publisher}` : ""} · {book.language}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {book.category && (
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {book.category}
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </div>
      </div>

      <div className="fade-up" style={{ animationDelay: "0.06s" }}>
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Image</th>
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
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    <InboxOutlined className="mr-2 text-emerald-300" />
                    No entries for this book yet — add one from New Entry
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
            <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {fullImages.length ? (
                <div className="relative flex w-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displaySrc}
                    alt={`${selected.bookName} ${safeImgIdx + 1}`}
                    className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain"
                  />
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

      <EntryEditModal
        open={!!editTarget}
        entry={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
      />
    </div>
  );
}
