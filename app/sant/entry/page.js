"use client";

import { useState } from "react";
import { FileAddOutlined } from "@ant-design/icons";
import EntryForm from "@/components/EntryForm";
import AddBookModal from "@/components/AddBookModal";

export default function NewEntryPage() {
  const [showAddBook, setShowAddBook] = useState(false);
  const [newBook, setNewBook] = useState(null);

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="fade-up">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
              <FileAddOutlined />
            </span>
            New Entry
          </h1>
          <p className="text-sm text-slate-500">
            Add a note with book, topic, page number and image
          </p>
        </div>
        <div className="fade-up" style={{ animationDelay: "0.06s" }}>
          <EntryForm
            onAddBook={() => setShowAddBook(true)}
            newBook={newBook}
          />
        </div>
      </div>

      {showAddBook && (
        <AddBookModal
          onClose={() => setShowAddBook(false)}
          onCreated={(book) => {
            setNewBook(book);
            setShowAddBook(false);
          }}
        />
      )}
    </>
  );
}
