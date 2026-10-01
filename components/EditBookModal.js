"use client";

import { useEffect, useState } from "react";
import { Modal, Select } from "antd";
import {
  SaveOutlined,
  Loading3QuartersOutlined,
  EditOutlined,
  ExpandOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { compressForUpload } from "@/lib/clientCompress";
import ImageResizer from "@/components/ImageResizer";

const LANGUAGES = ["Gujarati", "Hindi", "English", "Sanskrit"];
const FIELDS = ["name", "author", "publisher", "language", "category"];

export default function EditBookModal({ book, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: book?.name || "",
    author: book?.author || "",
    publisher: book?.publisher || "",
    language: book?.language || "Gujarati",
    category: book?.category || "",
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(null);

  // New pick wins, then a pending removal, then the saved cover.
  const coverSrc = coverFile
    ? coverPreview
    : coverRemoved
      ? ""
      : book?.cover || "";

  useEffect(() => {
    if (resizeOpen) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, resizeOpen]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCover(e) {
    const raw = e.target.files?.[0] || null;
    if (!raw) return;
    e.target.value = "";
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    const file = await compressForUpload(raw);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverRemoved(false);
    setResizeOpen(true);
  }

  function discardPicked() {
    if (coverFile) {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(null);
      setCoverPreview("");
    }
    setResizeOpen(false);
  }

  function removeCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview("");
    setCoverRemoved(true);
    setResizeOpen(false);
  }

  function applyResized(file) {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverRemoved(false);
    setResizeOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Book name is required" });
      return;
    }
    setMessage(null);
    setPending(true);

    const data = new FormData();
    FIELDS.forEach((key) => data.append(key, form[key] ?? ""));
    if (coverFile) data.append("cover", coverFile);
    else if (coverRemoved) data.append("coverRemoved", "true");

    try {
      const res = await fetch(`/api/books/${encodeURIComponent(book._id)}`, {
        method: "PUT",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Failed to save" });
        return;
      }
      onSaved?.(json);
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      keyboard={false}
      width={640}
      centered
      title={
        <span className="flex items-center gap-2 text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
            <EditOutlined />
          </span>
          Edit Book
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Book name *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder="Book name"
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Author</label>
            <input
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              placeholder="Author"
              className="input"
            />
          </div>
          <div>
            <label className="label">Publisher (optional)</label>
            <input
              value={form.publisher}
              onChange={(e) => set("publisher", e.target.value)}
              placeholder="Publisher"
              className="input"
            />
          </div>
          <div>
            <label className="label">Language</label>
            <Select
              value={form.language}
              onChange={(v) => set("language", v)}
              className="select-input w-full"
              options={LANGUAGES.map((l) => ({ value: l, label: l }))}
            />
          </div>
          <div>
            <label className="label">Category (optional)</label>
            <input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Category"
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Cover image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleCover}
              className="input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-emerald-700"
            />
            {coverSrc ? (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverSrc}
                  alt="Cover preview"
                  className="h-20 w-20 rounded-lg border border-emerald-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setResizeOpen(true)}
                  className="btn-ghost !py-1.5 text-xs"
                >
                  <ExpandOutlined /> Crop & resize
                </button>
                <button
                  type="button"
                  onClick={removeCover}
                  className="btn-ghost !py-1.5 text-xs !text-red-600"
                >
                  <DeleteOutlined /> Remove photo
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                No cover photo yet — pick one from your gallery or camera.
              </p>
            )}
            <ImageResizer
              open={resizeOpen}
              src={coverSrc}
              fileName={coverFile?.name}
              onCancel={discardPicked}
              onUseOriginal={() => setResizeOpen(false)}
              onConfirm={applyResized}
            />
          </div>
        </div>

        {message && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {message.text}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? <Loading3QuartersOutlined spin /> : <SaveOutlined />}
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
