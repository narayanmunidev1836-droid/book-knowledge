"use client";

import { useEffect, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Select } from "antd";
import GalleryGrid from "@/components/GalleryGrid";
import Spinner from "@/components/Spinner";

export default function TopicSearchPage() {
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load topics"));
  }, []);

  useEffect(() => {
    if (!topicId) return;
    fetch(`/api/entries?topicId=${topicId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEntries(data);
        else setError(data?.error || "Error");
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, [topicId]);

  const selectedTopic = topics.find((t) => t._id === topicId);

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h1 className="text-xl font-bold">Topic Search</h1>
        <p className="text-sm text-slate-500">
          Select a topic — all books and images under it will show
        </p>
      </div>

      <div className="max-w-sm fade-up" style={{ animationDelay: "0.06s" }}>
        <label className="label">Select topic</label>
        <Select
          value={topicId || undefined}
          onChange={(v) => {
            setTopicId(v);
            setEntries([]);
            setError("");
            setLoading(Boolean(v));
          }}
          placeholder="— Select topic —"
          className="select-input w-full"
          prefix={<SearchOutlined className="text-slate-400" />}
          options={topics.map((t) => ({ value: t._id, label: t.name }))}
          showSearch
          optionFilterProp="label"
        />
      </div>

      {selectedTopic && (
        <div className="fade-up">
          <h2 className="border-b-2 border-emerald-500 pb-1 text-lg font-semibold text-slate-800">
            {selectedTopic.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Total {entries.length} entries</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <Spinner label="Searching..." className="py-6" />}
      {!loading && topicId && <GalleryGrid entries={entries} />}
    </div>
  );
}
