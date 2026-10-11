"use client";

import { useEffect, useState } from "react";
import { Modal, Select } from "antd";
import {
  SaveOutlined,
  Loading3QuartersOutlined,
  PlusCircleOutlined,
  ExpandOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { compressForUpload } from "@/lib/clientCompress";
import ImageResizer from "@/components/ImageResizer";

const LANGUAGES = ["Gujarati", "Hindi", "English", "Sanskrit"];

export default function AddBookModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    author: "",
    publisher: "",
    language: "Gujarati",
    category: "",
  });
  const [pdf, setPdf] = useState(null);
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [resizeOpen, setResizeOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCover(e) {
    const raw = e.target.files?.[0] || null;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    if (!raw) {
      setCover(null);
      setCoverPreview("");
      return;
    }
    const file = await compressForUpload(raw);
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
    // Open the resize dialog right away
    setResizeOpen(true);
  }

  function handlePdf(e) {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 50 * 1024 * 1024) {
      setMessage({ type: "error", text: "PDF size must be less than 50MB" });
      e.target.value = "";
      return;
    }
    setMessage(null);
    setPdf(file);
  }

  function discardCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCover(null);
    setCoverPreview("");
    setResizeOpen(false);
  }

  function applyResizedCover(file) {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
    setResizeOpen(false);
  }

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setPending(true);

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (cover) data.append("cover", cover);
    if (pdf) data.append("pdf", pdf);

    try {
      const res = await fetch("/api/books", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json?.error || "Failed to add" });
        return;
      }
      onCreated?.(json);
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
            <PlusCircleOutlined />
          </span>
          Add Book
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
          <div>
            <label className="label">Cover image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleCover}
              className="input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-emerald-700"
            />
            {coverPreview && (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="h-20 w-20 rounded-lg border border-emerald-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setResizeOpen(true)}
                  className="btn-ghost !py-1.5 text-xs"
                >
                  <ExpandOutlined /> Resize
                </button>
              </div>
            )}
            <ImageResizer
              open={resizeOpen}
              src={coverPreview}
              fileName={cover?.name}
              onCancel={discardCover}
              onUseOriginal={() => setResizeOpen(false)}
              onConfirm={applyResizedCover}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Book PDF (optional, max 50MB)</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handlePdf}
              className="input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-emerald-700"
            />
            {pdf && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <FilePdfOutlined className="text-emerald-600" /> {pdf.name}
              </p>
            )}
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
            {pending ? "Adding..." : "Add Book"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
