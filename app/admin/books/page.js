"use client";

import { useEffect, useState } from "react";
import {
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  SearchOutlined,
  BookOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import AddBookModal from "@/components/AddBookModal";
import ConfirmModal from "@/components/ConfirmModal";

const LANGUAGES = ["Gujarati", "Hindi", "English", "Sanskrit"];

export default function AdminBooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => setBooks(Array.isArray(data) ? data : []))
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = books.filter((b) =>
    [b.name, b.author, b.category].filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  async function saveEdit() {
    const res = await fetch(`/api/books/${editing._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Save failed" });
      return;
    }
    setBooks((list) =>
      list.map((b) => (b._id === json._id ? { ...b, ...json } : b))
    );
    setEditing(null);
    setMessage({ type: "ok", text: "Book updated ✓" });
  }

  async function remove() {
    const res = await fetch(`/api/books/${deleteTarget._id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Delete failed");
    setBooks((list) => list.filter((b) => b._id !== deleteTarget._id));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 fade-up">
        <div>
          <h1 className="text-xl font-bold">Books</h1>
          <p className="text-sm text-slate-500">
            Add, edit, delete — total {books.length}
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
          <PlusCircleOutlined /> Add Book
        </button>
      </div>

      <div className="relative max-w-sm fade-up" style={{ animationDelay: "0.12s" }}>
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
          <SearchOutlined />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search book / author..."
          className="input !pl-9"
        />
      </div>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((book) =>
            editing?._id === book._id ? (
              <div
                key={book._id}
                className="fade-up space-y-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="input"
                    placeholder="Book name"
                  />
                  <input
                    value={editing.author || ""}
                    onChange={(e) => setEditing({ ...editing, author: e.target.value })}
                    className="input"
                    placeholder="Author"
                  />
                  <input
                    value={editing.publisher || ""}
                    onChange={(e) => setEditing({ ...editing, publisher: e.target.value })}
                    className="input"
                    placeholder="Publisher"
                  />
                  <select
                    value={editing.language}
                    onChange={(e) => setEditing({ ...editing, language: e.target.value })}
                    className="input"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editing.category || ""}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="input"
                    placeholder="Category"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={saveEdit} className="btn-primary">
                    <SaveOutlined /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="btn-ghost"
                  >
                    <CloseOutlined /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={book._id}
                className="card card-hover flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-600">
                    <BookOutlined />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">{book.name}</p>
                    <p className="text-sm text-slate-500">
                      {book.author || "No author"} · {book.language}
                      {book.publisher ? ` · ${book.publisher}` : ""}
                      {book.category ? ` · ${book.category}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(book)}
                    className="btn-ghost !text-emerald-700 hover:!bg-emerald-50 hover:!border-emerald-300"
                  >
                    <EditOutlined /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(book)}
                    className="btn-danger"
                  >
                    <DeleteOutlined /> Delete
                  </button>
                </div>
              </div>
            )
          )}
          {!filtered.length && (
            <div className="card flex flex-col items-center gap-2 p-10 text-slate-400">
              <PlusCircleOutlined className="text-3xl text-emerald-300" />
              <p className="text-sm">No books found</p>
              <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
                <PlusCircleOutlined /> Add Book
              </button>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddBookModal
          onClose={() => setShowAdd(false)}
          onCreated={(book) => {
            setBooks((list) =>
              [...list, book].sort((a, b) => a.name.localeCompare(b.name))
            );
            setShowAdd(false);
            setMessage({ type: "ok", text: "Book added ✓" });
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Book"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}" and all its entries?`
            : ""
        }
        confirmText="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
