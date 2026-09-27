"use client";

import { useEffect, useState } from "react";
import { Modal } from "antd";
import {
  Loading3QuartersOutlined,
  DeleteOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { compressForUpload } from "@/lib/clientCompress";
import ImageResizer from "@/components/ImageResizer";
import AutoTextarea from "@/components/AutoTextarea";

const MAX_IMAGES = 10;

export default function EntryEditModal({ open, entry, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [thumbs, setThumbs] = useState([]); // [{ src, i }] original order
  const [removed, setRemoved] = useState(() => new Set()); // original indices
  const [newFiles, setNewFiles] = useState([]); // [{ file, url }] picked, not saved yet
  const [cropQueue, setCropQueue] = useState([]); // indices of newFiles to crop, one by one
  const [loadingImgs, setLoadingImgs] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const entryId = entry?._id || null;
  // Head of the queue = the new image currently open in the crop dialog.
  const cropIdx = cropQueue.length ? cropQueue[0] : null;

  // Reset when the dialog opens for a different entry (render-time reset).
  const [prevKey, setPrevKey] = useState(null);
  const key = `${open ? 1 : 0}:${entryId || ""}`;
  if (prevKey !== key) {
    setPrevKey(key);
    setNote(entry?.note || "");
    setTitle(entry?.title || "");
    setRemoved(new Set());
    setNewFiles([]);
    setCropQueue([]);
    setError("");
    setThumbs([]);
    setLoadingImgs(Boolean(open && entryId));
  }

  useEffect(() => {
    if (!open || !entryId) return;
    let cancelled = false;
    fetch(`/api/entries/${entryId}?lite=1`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const base = d.thumbs?.length
          ? d.thumbs
          : d.thumb
            ? [d.thumb]
            : [];
        setThumbs(base.map((src, i) => ({ src, i })));
      })
      .catch(() => {
        if (!cancelled) setThumbs(entry?.image ? [{ src: entry.image, i: 0 }] : []);
      })
      .finally(() => {
        if (!cancelled) setLoadingImgs(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entryId]);

  const visible = thumbs.filter((t) => t.src && !removed.has(t.i));
  const totalCount = visible.length + newFiles.length;
  const room = MAX_IMAGES - totalCount;

  function clearNewFiles() {
    newFiles.forEach((n) => URL.revokeObjectURL(n.url));
    setNewFiles([]);
    setCropQueue([]);
  }

  async function handleAdd(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setError("");
    const files = picked.slice(0, Math.max(0, room));
    if (files.length < picked.length) {
      setError(`Maximum ${MAX_IMAGES} images per entry`);
    }
    const optimized = [];
    for (const f of files) optimized.push(await compressForUpload(f));
    const start = newFiles.length;
    setNewFiles((list) => [
      ...list,
      ...optimized.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
    // Open the crop tool for each newly picked photo, one after another.
    setCropQueue((q) => [...q, ...optimized.map((_, i) => start + i)]);
  }

  function removeNewAt(idx) {
    setNewFiles((list) => {
      const target = list[idx];
      if (target) URL.revokeObjectURL(target.url);
      return list.filter((_, k) => k !== idx);
    });
    setCropQueue((q) =>
      q.filter((x) => x !== idx).map((x) => (x > idx ? x - 1 : x))
    );
  }

  function applyCropped(file) {
    if (cropIdx !== null) {
      setNewFiles((list) => {
        const target = list[cropIdx];
        if (target) URL.revokeObjectURL(target.url);
        const next = [...list];
        next[cropIdx] = { file, url: URL.createObjectURL(file) };
        return next;
      });
    }
    setCropQueue((q) => q.slice(1));
  }

  async function handleOk() {
    setPending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("note", note);
      fd.append("title", title);
      [...removed].forEach((i) => fd.append("removeIndices", String(i)));
      newFiles.forEach((n) => fd.append("image", n.file));
      await onSubmit(fd);
      clearNewFiles();
      onClose();
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    if (pending) return;
    clearNewFiles();
    onClose();
  }

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      okText={
        pending ? (
          <>
            <Loading3QuartersOutlined spin /> Saving...
          </>
        ) : (
          "Save"
        )
      }
      cancelText="Cancel"
      okButtonProps={{ disabled: pending || cropIdx !== null }}
      cancelButtonProps={{ disabled: pending }}
      title="Edit Entry"
      width={520}
      destroyOnHidden
    >
      <div className="space-y-4 pt-3">
        <div>
          <label className="label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Guru Bhakti nu mahatmya"
            className="input"
          />
        </div>

        <div>
          <label className="label">Note</label>
          <AutoTextarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a short note..."
            rows={3}
            className="input overflow-hidden resize-none"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Images ({totalCount}/{MAX_IMAGES})</label>
          {loadingImgs ? (
            <p className="text-sm text-slate-500">Loading images…</p>
          ) : totalCount ? (
            <div className="flex flex-wrap gap-3">
              {visible.map((t) => (
                <div
                  key={t.i}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border border-emerald-200 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.src}
                    alt={`Image ${t.i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    title="Remove this image"
                    disabled={pending}
                    onClick={() =>
                      setRemoved((prev) => new Set([...prev, t.i]))
                    }
                    className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                  >
                    <DeleteOutlined /> Remove
                  </button>
                </div>
              ))}
              {newFiles.map((n, idx) => (
                <div
                  key={`new-${idx}`}
                  className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-dashed border-emerald-300 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={n.url}
                    alt={`New ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute top-1 left-1 rounded-full bg-emerald-600 px-1.5 text-[9px] font-bold text-white">
                    NEW
                  </span>
                  <button
                    type="button"
                    title="Remove new image"
                    disabled={pending}
                    onClick={() => removeNewAt(idx)}
                    className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                  >
                    <DeleteOutlined /> Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400">
              <PictureOutlined /> No images in this entry
            </p>
          )}

          <div className="mt-3">
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={room <= 0 || pending}
              onChange={handleAdd}
              className="input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-emerald-700 disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-slate-500">
              The crop tool opens for each picked photo — drag the four corners
              to select the area you want. They upload when you save.
              {room <= 0 && " Limit reached (10 per entry)."}
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {cropIdx !== null && newFiles[cropIdx] && (
          <ImageResizer
            open
            src={newFiles[cropIdx].url}
            fileName={newFiles[cropIdx].file?.name}
            onCancel={() => removeNewAt(cropIdx)}
            onUseOriginal={() => setCropQueue((q) => q.slice(1))}
            onConfirm={applyCropped}
          />
        )}
      </div>
    </Modal>
  );
}
