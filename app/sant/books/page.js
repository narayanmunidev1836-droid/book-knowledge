"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  PlusCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import AddBookModal from "@/components/AddBookModal";
import EditBookModal from "@/components/EditBookModal";
import ConfirmModal from "@/components/ConfirmModal";
import Spinner from "@/components/Spinner";
import { matchesText } from "@/lib/translit";

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? books.filter((b) =>
        [b.name, b.author, b.category, b.language]
          .filter(Boolean)
          .some((v) => matchesText(term, v))
      )
    : books;

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

  function handleSaved(updated) {
    setBooks((list) =>
      list
        .map((b) => (b._id === updated._id ? { ...b, ...updated } : b))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditing(null);
    setError("");
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
            Click a book to see all its records — {books.length} book
            {books.length === 1 ? "" : "s"},{" "}
            {books.reduce((n, b) => n + (b.entryCount || 0), 0)} records
            {term ? `, showing ${filtered.length}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
          <PlusCircleOutlined /> Add Book
        </button>
      </div>

      <div className="relative max-w-md fade-up" style={{ animationDelay: "0.06s" }}>
        <SearchOutlined className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search books — name, author, category…"
          className="input !pl-9"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((book) => (
            <div key={book._id} className="card card-hover flex flex-col gap-3 p-4">
              <Link
                href={`/sant/books/${book._id}`}
                title="View entries of this book"
                className="flex items-start gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                    {book.author || "No author"}
                    {book.publisher ? ` · ${book.publisher}` : ""} · {book.language}
                  </p>
                  {book.category && (
                    <p className="text-xs font-medium text-emerald-600">{book.category}</p>
                  )}
                  <span className="mt-1 inline-flex w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {book.entryCount || 0}{" "}
                    {book.entryCount === 1 ? "record" : "records"}
                  </span>
                  <p className="mt-1 text-xs font-medium text-emerald-500">
                    View related entries →
                  </p>
                </div>
              </Link>
              <div className="flex gap-2">
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
          ))}
          {!books.length && (
            <div className="card flex flex-col items-center gap-2 p-10 text-slate-400">
              <PlusCircleOutlined className="text-3xl text-emerald-300" />
              <p className="text-sm">No books yet</p>
              <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
                <PlusCircleOutlined /> Add Book
              </button>
            </div>
          )}
          {books.length > 0 && filtered.length === 0 && (
            <div className="card col-span-full flex items-center gap-2 p-6 text-slate-500">
              <SearchOutlined className="text-emerald-400" />
              <p className="text-sm">
                No books match “{search.trim()}” — try another word.
              </p>
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

      {editing && (
        <EditBookModal
          book={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
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
