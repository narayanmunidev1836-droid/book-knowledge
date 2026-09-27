"use client";

import { useEffect, useState } from "react";
import { PictureOutlined, FilterOutlined } from "@ant-design/icons";
import { Select } from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import GalleryGrid from "@/components/GalleryGrid";
import Spinner from "@/components/Spinner";

const PAGE_SIZE = 30;

export default function GalleryPage() {
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState("");
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadedFor, setLoadedFor] = useState(null); // topicId of the loaded page 1
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const loading = loadedFor !== topicId;

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function paramsFor(nextPage) {
    const params = new URLSearchParams();
    if (topicId) params.set("topicId", topicId); // server-side filter
    params.set("page", String(nextPage));
    params.set("limit", String(PAGE_SIZE));
    return params;
  }

  // Topic change always restarts from page 1.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/entries?${paramsFor(1)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data.items)) {
          setEntries(data.items);
          setTotal(data.total || 0);
          setPages(data.pages || 0);
          setPage(data.page || 1);
          setError("");
        } else {
          setError(data?.error || "Error");
        }
        setLoadedFor(topicId);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load data");
        setLoadedFor(topicId);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  async function loadMore() {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/entries?${paramsFor(page + 1)}`);
      const data = await res.json();
      if (!res.ok || !data || !Array.isArray(data.items)) {
        throw new Error(data?.error || "Failed to load more");
      }
      setEntries((prev) => [...prev, ...data.items]);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
      setPage(data.page || page + 1);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 fade-up">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <PictureOutlined className="text-emerald-600" />
            Image Gallery
          </h1>
          <p className="text-sm text-slate-500">
            Click an image to view it larger — total {total}
          </p>
        </div>
        <div className="w-56">
          <Select
            value={topicId}
            onChange={setTopicId}
            className="select-input w-full"
            prefix={<FilterOutlined className="text-slate-400" />}
            options={[
              { value: "", label: "All topics" },
              ...topics.map((t) => ({ value: t._id, label: t.name })),
            ]}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <Spinner />
      ) : (
        <div className="fade-up" style={{ animationDelay: "0.08s" }}>
          <InfiniteScroll
            dataLength={entries.length}
            next={loadMore}
            hasMore={page < pages && !loadingMore}
            scrollThreshold="300px"
            loader={
              <div
                className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500"
                role="status"
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                Loading more…
              </div>
            }
            endMessage={
              total > 0 ? (
                <p className="mt-4 text-center text-xs text-slate-400">
                  All {total} photos loaded
                </p>
              ) : null
            }
          >
            <GalleryGrid entries={entries} />
          </InfiniteScroll>
        </div>
      )}
    </div>
  );
}
