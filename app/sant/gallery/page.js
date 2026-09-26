"use client";

import { useEffect, useState } from "react";
import { PictureOutlined, FilterOutlined } from "@ant-design/icons";
import GalleryGrid from "@/components/GalleryGrid";

export default function GalleryPage() {
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState("");
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/entries").then((r) => r.json()),
    ])
      .then(([t, e]) => {
        setTopics(Array.isArray(t) ? t : []);
        setAll(Array.isArray(e) ? e : []);
        if (!Array.isArray(e)) setError(e?.error || "Error");
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const entries = topicId ? all.filter((e) => e.topic === topicId) : all;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 fade-up">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <PictureOutlined className="text-emerald-600" />
            Image Gallery
          </h1>
          <p className="text-sm text-slate-500">
            Click an image to view it larger — total {entries.length}
          </p>
        </div>
        <div className="relative w-56">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
            <FilterOutlined />
          </span>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="input !text-sm !pl-9"
          >
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="fade-up" style={{ animationDelay: "0.08s" }}>
          <GalleryGrid entries={entries} />
        </div>
      )}
    </div>
  );
}
