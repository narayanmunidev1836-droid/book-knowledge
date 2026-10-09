"use client";

import { matchesText } from "@/lib/translit";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "antd";
import {
  SaveOutlined,
  Loading3QuartersOutlined,
  PictureOutlined,
  ExpandOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { compressForUpload } from "@/lib/clientCompress";
import ImageResizer from "@/components/ImageResizer";
import AutoTextarea from "@/components/AutoTextarea";

export default function EntryForm({ onAddBook, newBook }) {
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    bookId: "",
    topicIds: [],
    page: "",
    indexNo: "",
    note: "",
    title: "",
  });
  const [topicQuery, setTopicQuery] = useState(""); // text typed in the topic search
  const [images, setImages] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // object URLs, index-matched
  const [cropQueue, setCropQueue] = useState([]); // indices waiting to be cropped
  const [message, setMessage] = useState(null);
  const [pending, setPending] = useState(false);
  const [prevNewBook, setPrevNewBook] = useState(null);
  // The head of the queue is the image currently open in the crop dialog.
  const cropIdx = cropQueue.length ? cropQueue[0] : null;

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
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-by-one crop queue: every newly picked image opens the crop dialog
  // in turn; closing it moves on to the next.

  function revokeAt(list, i) {
    const url = list[i];
    if (url) URL.revokeObjectURL(url);
  }

  async function handleImage(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setMessage(null);

    const room = Math.max(0, 10 - images.length);
    const files = picked.slice(0, room);
    if (files.length < picked.length) {
      setMessage({ type: "error", text: "Maximum 10 images per entry" });
    }
    if (!files.length) return;

    const optimized = [];
    let optimizedAny = false;
    for (const f of files) {
      const out = await compressForUpload(f);
      if (out !== f) optimizedAny = true;
      optimized.push(out);
    }
    const start = images.length;
    setImages((list) => [...list, ...optimized]);
    setPreviews((list) => [
      ...list,
      ...optimized.map((f) => URL.createObjectURL(f)),
    ]);
    setCropQueue((q) => [...q, ...optimized.map((_, i) => start + i)]);
    if (optimizedAny) {
      setMessage({
        type: "ok",
        text: "Large photos optimized for upload (clarity preserved)",
      });
    }
  }

  function removeImageAt(i) {
    setPreviews((list) => {
      revokeAt(list, i);
      return list.filter((_, k) => k !== i);
    });
    setImages((list) => list.filter((_, k) => k !== i));
    setCropQueue((q) =>
      q.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x))
    );
  }

  function replaceImageAt(i, file) {
    setPreviews((list) => {
      revokeAt(list, i);
      const next = [...list];
      next[i] = URL.createObjectURL(file);
      return next;
    });
    setImages((list) => {
      const next = [...list];
      next[i] = file;
      return next;
    });
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyResized(file) {
    if (cropIdx !== null) replaceImageAt(cropIdx, file);
    setCropQueue((q) => q.slice(1));
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
      // "Add" straight from the search box — no separate input to fill in.
      addTopic(topicQuery);
      setForm((f) => ({ ...f, topicIds: values.filter((v) => v !== "__new__") }));
      return;
    }
    setTopicQuery("");
    set("topicIds", values);
  }

  async function addTopic(rawName) {
    const name = String(rawName || "").trim();
    if (!name) return;
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) {
      // Already there (the API rejects duplicates) — just select it.
      const existing = topics.find(
        (t) => t?.name?.trim()?.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        setForm((f) => ({ ...f, topicIds: [...f.topicIds, existing._id] }));
        setTopicQuery("");
        setMessage({ type: "ok", text: `Topic "${existing.name}" selected` });
        return;
      }
      setMessage({ type: "error", text: json?.error || "Failed to add topic" });
      return;
    }
    setTopics((t) => [...t, json].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, topicIds: [...f.topicIds, json._id] }));
    setTopicQuery("");
    setMessage({ type: "ok", text: `Topic "${json.name}" added ✓` });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (!form.bookId || !form.topicIds.length) {
      setMessage({ type: "error", text: "Select book and at least one topic" });
      return;
    }
    setPending(true);
    const data = new FormData();
    data.append("bookId", form.bookId);
    form.topicIds.forEach((id) => data.append("topicId", id));
    data.append("page", form.page);
    data.append("indexNo", form.indexNo);
    data.append("note", form.note);
    data.append("title", form.title);
    images.forEach((file) => data.append("image", file));

    const res = await fetch("/api/entries", { method: "POST", body: data });
    const json = await res.json();
    setPending(false);

    if (!res.ok) {
      setMessage({ type: "error", text: json?.error || "Upload failed" });
      return;
    }

    setMessage({ type: "ok", text: "Entry saved ✓" });
    setForm({ bookId: "", topicIds: [], page: "", indexNo: "", note: "", title: "" });
    previews.forEach((url) => URL.revokeObjectURL(url));
    setImages([]);
    setPreviews([]);
    setCropQueue([]);
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
              option?.value === "__add__" || matchesText(input, option?.label)
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
          <label className="label">Title (optional)</label>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Guru Bhakti nu mahatmya"
            className="input"
          />
        </div>

        <div>
          <label className="label">Topics *</label>
          <Select
            mode="multiple"
            value={form.topicIds}
            onChange={handleTopicsChange}
            searchValue={topicQuery}
            onSearch={setTopicQuery}
            placeholder="— Type to search topics —"
            className="select-input w-full"
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              option?.value === "__new__" || matchesText(input, option?.label)
            }
            notFoundContent="Nothing found — use “Add” below to create it"
            options={[
              ...topics.map((t) => ({ value: t._id, label: t.name })),
              topicQuery.trim()
                ? { value: "__new__", label: `+ Add “${topicQuery.trim()}”` }
                : { value: "__new__", label: "+ New topic", disabled: true },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Page No</label>
            <input
              type="number"
              value={form.page}
              onChange={(e) => set("page", e.target.value)}
              placeholder="e.g. 125"
              className="input"
            />
          </div>

          <div>
            <label className="label">Index No</label>
            <input
              type="number"
              value={form.indexNo}
              onChange={(e) => set("indexNo", e.target.value)}
              placeholder="e.g. 12"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Images (optional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleImage}
            className="input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-emerald-700"
          />
          <p className="mt-1 text-xs text-slate-500">Up to 10 photos</p>
        </div>
      </div>

      <div>
        <label className="label">Short Note (optional)</label>
        <AutoTextarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="e.g. This vachan about Guru Bhakti is very beautiful."
          className="input overflow-hidden resize-none"
        />
      </div>

      {previews.length > 0 && (
        <div className="space-y-2">
          <label className="label">
            Images ({previews.length}/10)
          </label>
          <div className="flex flex-wrap gap-3">
            {previews.map((url, i) => (
              <div
                key={`${i}-${url.slice(-40)}`}
                className="relative h-24 w-24 overflow-hidden rounded-xl border border-emerald-200 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-black/55 p-1">
                  <button
                    type="button"
                    title="Crop & resize"
                    onClick={() =>
                      setCropQueue((q) => [i, ...q.filter((x) => x !== i)])
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-xs text-emerald-700 transition hover:bg-white"
                  >
                    <EditOutlined />
                  </button>
                  <button
                    type="button"
                    title="Remove image"
                    onClick={() => removeImageAt(i)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-xs text-red-600 transition hover:bg-white"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            The crop tool opens automatically for each picked image — drag the
            four corners to select the area you want. Skip it and the full
            image is saved as-is. Crop any image again with the edit button.
          </p>
          {cropIdx !== null && previews[cropIdx] && (
            <ImageResizer
              open
              src={previews[cropIdx]}
              fileName={images[cropIdx]?.name}
              onCancel={() => cropIdx !== null && removeImageAt(cropIdx)}
              onUseOriginal={() => setCropQueue((q) => q.slice(1))}
              onConfirm={applyResized}
            />
          )}
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
