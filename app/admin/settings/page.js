"use client";

import { useEffect, useState } from "react";
import { SaveOutlined, SettingOutlined, CheckCircleOutlined } from "@ant-design/icons";
import Spinner from "@/components/Spinner";

export default function AdminSettingsPage() {
  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error);
        else {
          setSiteName(d.siteName || "");
          setTagline(d.tagline || "");
        }
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (!siteName.trim()) {
      setError("Site name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName: siteName.trim(), tagline: tagline.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save");
      setSaved(true);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-xl space-y-5">
      <div className="fade-up">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
            <SettingOutlined />
          </span>
          Site Settings
        </h1>
        <p className="text-sm text-slate-500">Branding shown across the app</p>
      </div>

      <form onSubmit={handleSave} className="card space-y-4 p-5 fade-up" style={{ animationDelay: "0.06s" }}>
        <div>
          <label className="label">Site name</label>
          <input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="Book Knowledge"
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Tagline</label>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Notes & Images for Sants"
            className="input"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {saved && (
          <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircleOutlined /> Settings saved
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            <SaveOutlined /> {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
