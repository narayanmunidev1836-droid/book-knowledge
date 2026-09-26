"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Modal } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  PictureOutlined,
} from "@ant-design/icons";

export default function GalleryGrid({ entries, onDelete, onEdit }) {
  const [active, setActive] = useState(null);

  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (active === null) return;
    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") {
        setActive((i) => (i + 1) % entries.length);
      }
      if (e.key === "ArrowLeft") {
        setActive((i) => (i - 1 + entries.length) % entries.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, entries.length, close]);

  if (!entries.length) {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center text-slate-400">
        <PictureOutlined className="text-4xl text-emerald-300" />
        <p className="text-sm font-medium">No images yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry, index) => (
          <div
            key={entry._id}
            className="card card-hover group overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setActive(index)}
              className="relative block aspect-[4/3] w-full bg-slate-100"
            >
              <Image
                src={entry.image}
                alt={`${entry.bookName} — page ${entry.page || "-"}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2 text-left text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                Click to view
              </span>
            </button>

            <div className="flex items-start justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">
                  {entry.bookName}
                </p>
                <p className="text-sm text-slate-500">
                  {entry.page ? `Page ${entry.page}` : "No page"} ·{" "}
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                    {entry.topicNames?.length
                      ? entry.topicNames.join(", ")
                      : entry.topicName}
                  </span>
                </p>
                {entry.note && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600 italic">
                    “{entry.note}”
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    title="Edit"
                    className="icon-btn text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <EditOutlined />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(entry)}
                    title="Delete"
                    className="icon-btn text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <DeleteOutlined />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {active !== null && entries[active] && (
        <Modal
          open
          onCancel={close}
          footer={null}
          closable={false}
          keyboard={false}
          centered
          width={1100}
          styles={{
            content: {
              background: "transparent",
              boxShadow: "none",
              padding: 0,
              maxWidth: "96vw",
            },
            body: { padding: 0 },
            mask: { background: "rgba(0, 0, 0, 0.9)" },
          }}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white transition hover:bg-white/20"
          >
            <CloseOutlined /> Close
          </button>

          <div className="flex flex-col items-center">
            <Image
              src={entries[active].image}
              alt={entries[active].bookName}
              width={1600}
              height={1200}
              className="mx-auto max-h-[75vh] w-auto rounded-lg object-contain"
            />

            <div className="mt-4 max-w-xl text-center text-white">
              <p className="font-medium">{entries[active].bookName}</p>
            <p className="text-sm text-slate-300">
              {entries[active].page ? `Page ${entries[active].page}` : ""} ·{" "}
              {entries[active].topicNames?.length
                ? entries[active].topicNames.join(", ")
                : entries[active].topicName}{" "}
              · {entries[active].uploadedByName}
            </p>
              {entries[active].note && (
                <p className="mt-2 text-sm text-slate-200 italic">
                  “{entries[active].note}”
                </p>
              )}
              <div className="mt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setActive((i) => (i - 1 + entries.length) % entries.length)
                  }
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-1.5 text-white transition hover:bg-white/20"
                >
                  <LeftOutlined /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => setActive((i) => (i + 1) % entries.length)}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-1.5 text-white transition hover:bg-white/20"
                >
                  Next <RightOutlined />
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
