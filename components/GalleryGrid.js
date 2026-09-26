"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Modal } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  PictureOutlined,
  BookOutlined,
  UserOutlined,
  CalendarOutlined,
} from "@ant-design/icons";

export default function GalleryGrid({ entries, onDelete, onEdit }) {
  const [active, setActive] = useState(null); // index into slides
  const [fullImages, setFullImages] = useState({}); // entryId -> full image[]

  const close = useCallback(() => setActive(null), []);

  const countOf = (e) => e.imageCount || (e.image || e.thumb ? 1 : 0);
  // One slide per image; entries without an image still get a placeholder slide.
  const slides = [];
  entries.forEach((entry, ei) => {
    const n = countOf(entry);
    if (n <= 0) slides.push({ e: ei, i: -1 });
    else for (let i = 0; i < n; i++) slides.push({ e: ei, i });
  });

  // List responses carry only the first thumb — load the full images on first open.
  useEffect(() => {
    if (active === null || !slides[active]) return;
    const entry = entries[slides[active].e];
    if (!entry || !entry.hasFull || fullImages[entry._id]) return;
    let cancelled = false;
    fetch(`/api/entries/${entry._id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d) return;
        const list = d.images?.length
          ? d.images
          : d.image
            ? [d.image]
            : [];
        if (list.length) {
          setFullImages((prev) => ({ ...prev, [entry._id]: list }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, entries, fullImages]);

  useEffect(() => {
    if (active === null) return;
    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") {
        setActive((i) => (i + 1) % slides.length);
      }
      if (e.key === "ArrowLeft") {
        setActive((i) => (i - 1 + slides.length) % slides.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, slides.length, close]);

  if (!entries.length) {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center text-slate-400">
        <PictureOutlined className="text-4xl text-emerald-300" />
        <p className="text-sm font-medium">No images yet</p>
      </div>
    );
  }

  const slide = active !== null ? slides[active] : null;
  const activeEntry = slide ? entries[slide.e] : null;
  const activeFull = activeEntry ? fullImages[activeEntry._id] : null;
  const activeLoading = Boolean(slide && slide.i >= 0 && activeEntry?.hasFull && !activeFull);
  const activeSrc = !slide || slide.i < 0 || !activeEntry
    ? null
    : activeFull
      ? activeFull[slide.i] ?? null
      : activeEntry.hasFull
        ? null
        : slide.i === 0
          ? activeEntry.image || null
          : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry, index) => (
          <div
            key={entry._id}
            className="card card-hover group overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setActive(index)}
              className="relative block aspect-[4/3] w-full bg-slate-100"
            >
              {entry.image ? (
                <Image
                  src={entry.image}
                  alt={`${entry.bookName} — page ${entry.page || "-"}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-slate-300">
                  <PictureOutlined className="text-4xl" />
                </span>
              )}
              {countOf(entry) > 1 && (
                <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
                  {countOf(entry)} photos
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2 text-left text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                Click to view
              </span>
            </button>

            <div className="flex items-start justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">
                  {entry.bookName}
                </p>
                <p className="text-sm text-slate-500">
                  {entry.page ? `Page ${entry.page}` : "No page"} ·{" "}
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                    {entry.topicNames?.length
                      ? entry.topicNames.join(", ")
                      : entry.topicName}
                  </span>
                </p>
                {entry.note && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600 italic">
                    “{entry.note}”
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    title="Edit"
                    className="icon-btn text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <EditOutlined />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(entry)}
                    title="Delete"
                    className="icon-btn text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <DeleteOutlined />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {active !== null && activeEntry && (
        <Modal
          open
          onCancel={close}
          footer={null}
          closable={false}
          keyboard={false}
          centered
          width="min(1150px, 96vw)"
          styles={{
            container: {
              background: "transparent",
              boxShadow: "none",
              padding: 0,
              maxWidth: "96vw",
            },
            body: { padding: 0 },
            mask: { background: "rgba(2, 6, 23, 0.94)" },
          }}
        >
          <div className="fade-up relative mx-auto w-fit overflow-hidden rounded-2xl">
            {/* Image */}
            <div className="flex items-center justify-center">
              {activeLoading ? (
                <div className="flex h-[50vh] w-[70vw] max-w-4xl items-center justify-center rounded-xl bg-black/40">
                  <span className="flex flex-col items-center gap-3 text-sm text-slate-300">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                    Loading full image…
                  </span>
                </div>
              ) : activeSrc ? (
                <Image
                  src={activeSrc}
                  alt={activeEntry.bookName}
                  width={1600}
                  height={1200}
                  className="max-h-[76vh] h-auto w-auto max-w-full object-contain"
                />
              ) : (
                <div className="flex h-[50vh] w-[70vw] max-w-4xl items-center justify-center rounded-xl bg-black/40">
                  <span className="flex flex-col items-center gap-3 text-sm text-slate-300">
                    <PictureOutlined className="text-4xl text-slate-500" />
                    No image for this entry
                  </span>
                </div>
              )}
            </div>

            {/* Counter */}
            <span className="absolute top-4 left-4 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur ring-1 ring-white/15">
              {active + 1} / {slides.length}
            </span>

            {/* Close */}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-base text-white backdrop-blur ring-1 ring-white/15 transition duration-200 hover:rotate-90 hover:bg-red-500/80 hover:ring-red-400/50"
            >
              <CloseOutlined />
            </button>

            {/* Arrows */}
            {entries.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() =>
                    setActive((i) => (i - 1 + slides.length) % slides.length)
                  }
                  className="absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-lg text-white backdrop-blur ring-1 ring-white/20 transition duration-200 hover:scale-110 hover:bg-emerald-500 hover:ring-emerald-300 sm:left-5"
                >
                  <LeftOutlined />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => setActive((i) => (i + 1) % slides.length)}
                  className="absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-lg text-white backdrop-blur ring-1 ring-white/20 transition duration-200 hover:scale-110 hover:bg-emerald-500 hover:ring-emerald-300 sm:right-5"
                >
                  <RightOutlined />
                </button>
              </>
            )}

            {/* Bottom gradient info */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pt-24 pb-5 sm:px-7 sm:pb-6">
              <div className="pointer-events-auto">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(activeEntry.topicNames?.length
                    ? activeEntry.topicNames
                    : [activeEntry.topicName]
                  ).map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/40 backdrop-blur"
                    >
                      {name}
                    </span>
                  ))}
                  {activeEntry.page != null && activeEntry.page !== "" && (
                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white/90 ring-1 ring-white/20 backdrop-blur">
                      Page {activeEntry.page}
                    </span>
                  )}
                </div>

                <h3 className="flex items-center gap-2 truncate text-lg font-bold text-white sm:text-xl">
                  <BookOutlined className="shrink-0 text-emerald-400" />
                  {activeEntry.bookName}
                </h3>

                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <UserOutlined className="text-slate-400" />
                    {activeEntry.uploadedByName}
                  </span>
                  {activeEntry.createdAt && (
                    <span className="flex items-center gap-1.5">
                      <CalendarOutlined className="text-slate-400" />
                      {new Date(activeEntry.createdAt).toLocaleDateString(
                        "en-IN"
                      )}
                    </span>
                  )}
                </p>

                {activeEntry.note && (
                  <p className="mt-2 line-clamp-2 max-w-2xl border-l-2 border-emerald-400/70 pl-3 text-sm italic leading-relaxed text-slate-200">
                    “{activeEntry.note}”
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
