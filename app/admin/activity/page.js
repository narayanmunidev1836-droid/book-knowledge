"use client";

import { useEffect, useState } from "react";
import {
  FileAddOutlined,
  EditOutlined,
  DeleteOutlined,
  LoginOutlined,
  LockOutlined,
  SettingOutlined,
  UserAddOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import Spinner from "@/components/Spinner";
import Highlight from "@/components/Highlight";
import DebouncedInput from "@/components/DebouncedInput";

const ACTIONS = [
  { value: "all", label: "All" },
  { value: "auth.login", label: "Logins" },
  { value: "entry.create", label: "Uploads" },
  { value: "entry.update", label: "Note edits" },
  { value: "entry.delete", label: "Image deletes" },
  { value: "book.create", label: "Books" },
  { value: "topic.create", label: "Topics" },
  { value: "user.create", label: "Sants" },
  { value: "password.change", label: "Passwords" },
  { value: "settings.update", label: "Settings" },
];

const ICONS = {
  "auth.login": LoginOutlined,
  "entry.create": FileAddOutlined,
  "entry.update": EditOutlined,
  "entry.delete": DeleteOutlined,
  "book.create": FileAddOutlined,
  "book.update": EditOutlined,
  "book.delete": DeleteOutlined,
  "topic.create": FileAddOutlined,
  "topic.update": EditOutlined,
  "topic.delete": DeleteOutlined,
  "user.create": UserAddOutlined,
  "user.update": EditOutlined,
  "user.delete": DeleteOutlined,
  "password.change": LockOutlined,
  "settings.update": SettingOutlined,
};

const TINTS = {
  "auth.login": "bg-sky-100 text-sky-600",
  "entry.create": "bg-emerald-100 text-emerald-600",
  "entry.update": "bg-amber-100 text-amber-600",
  "entry.delete": "bg-red-100 text-red-600",
  "book.delete": "bg-red-100 text-red-600",
  "topic.delete": "bg-red-100 text-red-600",
  "user.delete": "bg-red-100 text-red-600",
  "password.change": "bg-violet-100 text-violet-600",
  "settings.update": "bg-slate-200 text-slate-600",
};

export default function AdminActivityPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [action, setAction] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const filterKey = `${action}|${q}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    const params = new URLSearchParams({ action, q, page: "1", limit: "30" });
    fetch(`/api/admin/activity?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load activity log"));
  }, [action, q]);

  async function loadMore() {
    if (!data || page >= (data.pages ?? 0)) return;
    setLoadingMore(true);
    const next = page + 1;
    const params = new URLSearchParams({ action, q, page: String(next), limit: "30" });
    try {
      const res = await fetch(`/api/admin/activity?${params}`);
      const d = await res.json();
      if (!d?.error) {
        setData((prev) => ({
          ...d,
          items: [...(prev?.items || []), ...(d.items || [])],
        }));
        setPage(next);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <Spinner />;

  const items = data.items || [];

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
            <HistoryOutlined />
          </span>
          Activity Log
        </h1>
        <p className="text-sm text-slate-500">
          {(data.total ?? 0).toLocaleString("en-IN")} recorded actions
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 fade-up">
        {ACTIONS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setAction(a.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              action === a.value
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {a.label}
          </button>
        ))}
        <DebouncedInput
          value={q}
          onChange={setQ}
          placeholder="Search name or detail…"
          className="input ml-auto max-w-xs !py-1.5 text-sm"
        />
      </div>

      <div className="space-y-2">
        {items.map((item, i) => {
          const Icon = ICONS[item.action] || HistoryOutlined;
          const tint = TINTS[item.action] || "bg-emerald-100 text-emerald-600";
          return (
            <div
              key={item._id}
              className="card card-hover flex items-start gap-3 p-3.5 fade-up"
              style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                <Icon />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-slate-800">
                    <Highlight text={item.actorName} q={q} />
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {item.action}
                  </span>
                </div>
                {item.detail && (
                  <p className="truncate text-sm text-slate-600">
                    <Highlight text={item.detail} q={q} lead={30} />
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {new Date(item.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="card p-6 text-center text-sm text-slate-500">No activity found</p>
        )}
      </div>

      {page < (data.pages ?? 0) && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="btn-ghost mx-auto"
        >
          {loadingMore ? "Loading…" : `Load more (${(data.total ?? 0) - items.length} left)`}
        </button>
      )}
    </div>
  );
}
