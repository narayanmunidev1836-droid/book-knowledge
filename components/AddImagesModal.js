"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Select } from "antd";
import {
  UploadOutlined,
  PlusOutlined,
  Loading3QuartersOutlined,
  PictureOutlined,
} from "@ant-design/icons";

export default function AddImagesModal({ onClose, topics, onTopicAdded, onUploaded }) {
  const fileRef = useRef(null);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ bookId: "", topicId: "__add__", page: "", note: "" });
  const [image, setImage] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(null);

  const [topicOpen, setTopicOpen] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [topicPending, setTopicPending] = useState(false);
  const [topicMessage, setTopicMessage] = useState(null);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => setBooks(Array.isArray(data) ? data : []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Escape") return;
      if (topicOpen) setTopicOpen(false);
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [topicOpen, onClose]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleTopicChange(value) {
    if (value === "__add__") {
      setTopicName("");
      setTopicMessage(null);
      setTopicOpen(true);
      return;
    }
    setField("topicId", value);
  }

  async function handleAddTopic(e) {
    e.preventDefault();
    const name = topicName.trim();
    if (!name || topicPending) return;
    setTopicPending(true);
    setTopicMessage(null);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTopicMessage({ type: "error", text: json.error || "Failed to add topic" });
        return;
      }
      onTopicAdded(json);
      setForm((f) => ({ ...f, topicId: json._id }));
      setTopicName("");
      setTopicOpen(false);
    } catch {
      setTopicMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setTopicPending(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (!form.bookId) return setMessage({ type: "error", text: "Select a book" });
    if (!form.topicId || form.topicId === "__add__")
      return setMessage({ type: "error", text: "Select a topic" });
    if (!image) return setMessage({ type: "error", text: "Choose an image" });

    setPending(true);
    const data = new FormData();
    data.append("bookId", form.bookId);
    data.append("topicId", form.topicId);
    data.append("page", form.page);
    data.append("note", form.note);
    data.append("image", image);

    try {
      const res = await fetch("/api/entries", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error || "Upload failed" });
        return;
      }
      setMessage({ type: "ok", text: "Image uploaded ✓" });
      setForm({ bookId: "", topicId: "__add__", page: "", note: "" });
      setImage(null);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded?.();
    } catch {
      setMessage({ type: "error", text: "Upload failed" });
    } finally {
      setPending(false);
    }
  }

  const selectedBook = books.find((b) => b._id === form.bookId);

  return (
    <>
      <Modal
        open
        onCancel={onClose}
        footer={null}
        keyboard={false}
        centered
        width={640}
        title={
          <span className="flex items-center gap-2 text-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
              <PictureOutlined />
            </span>
            Add Images
          </span>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Book *</label>
            <Select
              value={form.bookId || undefined}
              onChange={(v) => setField("bookId", v)}
              placeholder="— Select book —"
              className="select-input w-full"
              options={books.map((b) => ({
                value: b._id,
                label: b.name + (b.author ? ` — ${b.author}` : ""),
              }))}
            />
            {books.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Add a book first from the Books page
              </p>
            )}
          </div>

          <div>
            <label className="label">Topic *</label>
            <Select
              value={form.topicId === "__add__" ? undefined : form.topicId || undefined}
              onChange={handleTopicChange}
              placeholder="— Select topic —"
              className="select-input w-full"
              options={[
                { value: "__add__", label: "+ Add Topic" },
                ...topics.map((t) => ({ value: t._id, label: t.name })),
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Page Number</label>
              <input
                type="number"
                value={form.page}
                onChange={(e) => setField("page", e.target.value)}
                placeholder="e.g. 125"
                className="input"
              />
            </div>
            <div>
              <label className="label">Image *</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="label">Short Note (optional)</label>
            <textarea
              value={form.note}
              onChange={(e) => setField("note", e.target.value)}
              rows={2}
              placeholder="e.g. This vachan about Guru Bhakti is very beautiful."
              className="input resize-none"
            />
          </div>

          {selectedBook && (
            <p className="text-xs text-slate-500">
              {selectedBook.language}
              {selectedBook.author ? ` · ${selectedBook.author}` : ""}
              {selectedBook.category ? ` · ${selectedBook.category}` : ""}
            </p>
          )}

          {message && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${message.type === "ok"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
                }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? <Loading3QuartersOutlined spin /> : <UploadOutlined />}
              {pending ? "Uploading..." : "Upload Image"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={topicOpen}
        onCancel={() => setTopicOpen(false)}
        footer={null}
        keyboard={false}
        centered
        zIndex={1100}
        width={420}
        title={
          <span className="flex items-center gap-2 text-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <PlusOutlined />
            </span>
            Add Topic
          </span>
        }
      >
        <form onSubmit={handleAddTopic} className="space-y-3">
          <input
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="Topic name"
            autoFocus
            className="input"
          />
          {topicMessage && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {topicMessage.text}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTopicOpen(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" disabled={topicPending} className="btn-primary">
              {topicPending ? <Loading3QuartersOutlined spin /> : <PlusOutlined />}
              {topicPending ? "Adding..." : "Add Topic"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
