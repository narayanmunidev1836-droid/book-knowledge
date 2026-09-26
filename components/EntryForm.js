"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "antd";
import {
  SaveOutlined,
  Loading3QuartersOutlined,
  PlusOutlined,
  PictureOutlined,
} from "@ant-design/icons";

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

  function handleImage(e) {
    const file = e.target.files?.[0] || null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = file ? URL.createObjectURL(file) : "";
    previewRef.current = url;
    setImage(file);
    setPreview(url);
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
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
            placeholder="— Select one or more topics —"
            className="select-input w-full"
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
        <div className="relative h-48 w-48 overflow-hidden rounded-xl border border-emerald-200 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
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
