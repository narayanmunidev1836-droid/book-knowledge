"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Select } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  BookOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import AddBookModal from "@/components/AddBookModal";
import ConfirmModal from "@/components/ConfirmModal";
import Spinner from "@/components/Spinner";

const LANGUAGES = ["Gujarati", "Hindi", "English", "Sanskrit"];

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((data) => {
        setBooks(Array.isArray(data) ? data : []);
        if (!Array.isArray(data)) setError(data?.error || "Error");
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  async function saveEdit() {
    const res = await fetch(`/api/books/${editing._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Save failed");
      return;
    }
    setError("");
    setBooks((list) =>
      list.map((b) => (b._id === json._id ? { ...b, ...json } : b))
    );
    setEditing(null);
  }

  async function handleDelete() {
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
            Added books can be selected again while creating entries — total {books.length}
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
          <PlusCircleOutlined /> Add Book
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) =>
            editing?._id === book._id ? (
              <div
                key={book._id}
                className="fade-up space-y-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4"
              >
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
                  value={editing.category || ""}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="input"
                  placeholder="Category"
                />
                <Select
                  value={editing.language}
                  onChange={(v) => setEditing({ ...editing, language: v })}
                  className="select-input w-full"
                  options={LANGUAGES.map((l) => ({ value: l, label: l }))}
                />
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
                className="card card-hover flex items-start gap-3 p-4"
              >
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {book.cover ? (
                    <Image
                      src={book.cover}
                      alt={book.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-emerald-400">
                      <BookOutlined />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{book.name}</p>
                  <p className="text-sm text-slate-500">
                    {book.author || "No author"} · {book.language}
                  </p>
                  {book.category && (
                    <p className="text-xs font-medium text-emerald-600">{book.category}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(book)}
                      className="icon-btn border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <EditOutlined /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(book)}
                      className="icon-btn border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <DeleteOutlined /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
          {!books.length && (
            <div className="card flex flex-col items-center gap-2 p-10 text-slate-400">
              <PlusCircleOutlined className="text-3xl text-emerald-300" />
              <p className="text-sm">No books yet</p>
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
            setError("");
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
        onConfirm={handleDelete}
      />
    </div>
  );
}
