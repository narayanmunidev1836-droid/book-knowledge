"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "antd";
import {
  SaveOutlined,
  Loading3QuartersOutlined,
  PlusOutlined,
  PictureOutlined,
  ScissorOutlined,
} from "@ant-design/icons";
import { compressForUpload } from "@/lib/clientCompress";
import ImageCropper from "@/components/ImageCropper";

export default function EntryForm({ onAddBook, newBook }) {
  const router = useRouter();
  const previewRef = useRef(null);
  const [books, setBooks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    bookId: "",
    topicIds: [],
    page: "",
    note: "",
  });
  const [newTopic, setNewTopic] = useState("");
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [pending, setPending] = useState(false);
  const [prevNewBook, setPrevNewBook] = useState(null);

  if (newBook && newBook !== prevNewBook) {
    setPrevNewBook(newBook);
    setBooks((list) =>
      list.some((b) => b._id === newBook._id)
        ? list
        : [...list, newBook].sort((a, b) => a.name.localeCompare(b.name))
    );
    setForm((f) => ({ ...f, bookId: newBook._id }));
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/books").then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
    ])
      .then(([b, t]) => {
        setBooks(Array.isArray(b) ? b : []);
        setTopics(Array.isArray(t) ? t : []);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }));
  }, []);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  async function handleImage(e) {
    const raw = e.target.files?.[0] || null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = raw ? URL.createObjectURL(raw) : "";
    previewRef.current = url;
    setPreview(url);
    setMessage(null);

    const file = raw ? await compressForUpload(raw) : null;
    setImage(file);
    if (raw && file !== raw) {
      setMessage({
        type: "ok",
        text: "Large photo optimized for upload (clarity preserved)",
      });
    }
    // Open the crop dialog right away
    if (file) setCropOpen(true);
    else setCropOpen(false);
  }

  function discardImage() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setImage(null);
    setPreview("");
    setCropOpen(false);
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyCropped(file) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setImage(file);
    setPreview(url);
    setCropOpen(false);
    setMessage({ type: "ok", text: "Image cropped ✓" });
  }

  function handleBookChange(value) {
    if (value === "__add__") {
      onAddBook?.();
      return;
    }
    set("bookId", value);
  }

  function handleTopicsChange(values) {
    if (values.includes("__new__")) {
      setNewTopicOpen(true);
      setForm((f) => ({ ...f, topicIds: values.filter((v) => v !== "__new__") }));
      return;
    }
    set("topicIds", values);
  }

  async function handleNewTopic() {
    const name = newTopic.trim();
    if (!name) return;
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Failed to add topic" });
      return;
    }
    setTopics((t) => [...t, json].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, topicIds: [...f.topicIds, json._id] }));
    setNewTopic("");
    setNewTopicOpen(false);
    setMessage({ type: "ok", text: "New topic added ✓" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (!form.bookId || !form.topicIds.length) {
      setMessage({ type: "error", text: "Select book and at least one topic" });
      return;
    }
    if (!image) {
      setMessage({ type: "error", text: "Choose an image" });
      return;
    }

    setPending(true);
    const data = new FormData();
    data.append("bookId", form.bookId);
    form.topicIds.forEach((id) => data.append("topicId", id));
    data.append("page", form.page);
    data.append("note", form.note);
    data.append("image", image);

    const res = await fetch("/api/entries", { method: "POST", body: data });
    const json = await res.json();
    setPending(false);

    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Upload failed" });
      return;
    }

    setMessage({ type: "ok", text: "Entry saved ✓" });
    setForm({ bookId: "", topicIds: [], page: "", note: "" });
    setImage(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview("");
    e.target.reset?.();
    router.refresh();
  }

  const selectedBook = books.find((b) => b._id === form.bookId);

  return (
    <form
      onSubmit={handleSubmit}
      className="card space-y-4 p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Book *</label>
          <Select
            value={form.bookId || undefined}
            onChange={handleBookChange}
            placeholder="— Select book —"
            className="select-input w-full"
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              option?.value === "__add__" ||
              String(option?.label || "")
                .toLowerCase()
                .includes(String(input).toLowerCase())
            }
            notFoundContent="No book found — type to search"
            options={[
              { value: "__add__", label: "+ Add Book" },
              ...books.map((b) => ({
                value: b._id,
                label: b.name + (b.author ? ` — ${b.author}` : ""),
              })),
            ]}
          />
          {selectedBook && (
            <p className="mt-1 text-xs text-slate-500">
              {selectedBook.language}
              {selectedBook.author ? ` · ${selectedBook.author}` : ""}
              {selectedBook.category ? ` · ${selectedBook.category}` : ""}
            </p>
          )}
          {books.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Add a book first from the “Books” page
            </p>
          )}
        </div>

        <div>
          <label className="label">Topics *</label>
          <Select
            mode="multiple"
            value={form.topicIds}
            onChange={handleTopicsChange}
            placeholder="— Type to search topics —"
            className="select-input w-full"
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              option?.value === "__new__" ||
              String(option?.label || "")
                .toLowerCase()
                .includes(String(input).toLowerCase())
            }
            notFoundContent="No topic found — type to search"
            options={[
              ...topics.map((t) => ({ value: t._id, label: t.name })),
              { value: "__new__", label: "+ New topic" },
            ]}
          />

          {newTopicOpen && (
            <div className="mt-2 flex gap-2">
              <input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="New topic name"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={handleNewTopic}
                className="btn-primary !px-3"
              >
                <PlusOutlined />
                Add
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="label">Page Number</label>
          <input
            type="number"
            value={form.page}
            onChange={(e) => set("page", e.target.value)}
            placeholder="e.g. 125"
            className="input"
          />
        </div>

        <div>
          <label className="label">Image *</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImage}
            className="input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-emerald-700"
          />
        </div>
      </div>

      <div>
        <label className="label">Short Note (optional)</label>
        <textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          rows={2}
          placeholder="e.g. This vachan about Guru Bhakti is very beautiful."
          className="input resize-none"
        />
      </div>

      {preview && (
        <div className="flex items-start gap-3">
          <div className="relative h-48 w-48 overflow-hidden rounded-xl border border-emerald-200 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setCropOpen(true)}
              className="btn-ghost"
            >
              <ScissorOutlined /> Crop image
            </button>
            <p className="max-w-[16rem] text-xs text-slate-500">
              The crop tool opens automatically when you pick an image — only
              the part you keep gets stored. Skip it and the full image is saved
              as-is.
            </p>
          </div>
          <ImageCropper
            open={cropOpen}
            src={preview}
            fileName={image?.name}
            onCancel={discardImage}
            onUseFull={() => setCropOpen(false)}
            onConfirm={applyCropped}
          />
        </div>
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

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? <Loading3QuartersOutlined spin /> : <SaveOutlined />}
        {pending ? "Uploading..." : "Save Entry"}
      </button>
    </form>
  );
}
