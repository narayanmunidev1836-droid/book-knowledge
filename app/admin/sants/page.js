"use client";

import { useEffect, useState } from "react";
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  SaveOutlined,
  CloseOutlined,
  Loading3QuartersOutlined,
} from "@ant-design/icons";
import ConfirmModal from "@/components/ConfirmModal";
import PromptModal from "@/components/PromptModal";
import Spinner from "@/components/Spinner";

export default function AdminSantsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", mobile: "", password: "" });
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [passwordText, setPasswordText] = useState("");

  function load() {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Failed to add" });
      return;
    }
    setUsers((list) => [json, ...list]);
    setForm({ name: "", email: "", mobile: "", password: "" });
    setMessage({ type: "ok", text: "Sant added ✓" });
  }

  async function saveEdit() {
    const res = await fetch(`/api/admin/users/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editing.name }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: json.error || "Update failed" });
      return;
    }
    setUsers((list) =>
      list.map((u) => (u.id === editing.id ? { ...u, name: json.name } : u))
    );
    setEditing(null);
    setMessage({ type: "ok", text: "Sant updated ✓" });
  }

  async function toggleActive(user) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) {
      setUsers((list) =>
        list.map((u) => (u.id === user.id ? { ...u, active: !user.active } : u))
      );
    }
  }

  async function resetPassword() {
    const res = await fetch(`/api/admin/users/${passwordTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordText }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error");
    setMessage({ type: "ok", text: "Password changed ✓" });
  }

  async function remove() {
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Delete failed");
    setUsers((list) => list.filter((u) => u.id !== deleteTarget.id));
  }

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h1 className="text-xl font-bold">Sants</h1>
        <p className="text-sm text-slate-500">
          Add sants, edit details, enable/disable accounts
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="card fade-up space-y-3 p-4"
        style={{ animationDelay: "0.06s" }}
      >
        <h2 className="flex items-center gap-2 font-semibold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <UserAddOutlined />
          </span>
          Add New Sant
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="input"
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
          <input
            placeholder="Mobile number"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            className="input"
          />
          <input
            placeholder="Password *"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="input"
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
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? <Loading3QuartersOutlined spin /> : <UserAddOutlined />}
          {pending ? "Adding..." : "Add Sant"}
        </button>
      </form>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto fade-up" style={{ animationDelay: "0.12s" }}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email / Mobile</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-100 transition hover:bg-emerald-50/40"
                >
                  <td className="p-3">
                    {editing?.id === u.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          className="input !py-1"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="icon-btn bg-emerald-600 text-white hover:bg-emerald-700"
                          title="Save"
                        >
                          <SaveOutlined />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="icon-btn border border-slate-200 text-slate-500 hover:bg-slate-100"
                          title="Cancel"
                        >
                          <CloseOutlined />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-800">
                        {u.name}
                        {u.role === "admin" && (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                            Admin
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500">
                    {u.email || "—"} {u.mobile && `· ${u.mobile}`}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {u.active ? <CheckCircleOutlined /> : <StopOutlined />}
                      {u.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing({ id: u.id, name: u.name })}
                        className="icon-btn border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        title="Edit"
                      >
                        <EditOutlined /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className="icon-btn border border-slate-200 text-slate-600 hover:bg-slate-100"
                      >
                        {u.active ? (
                          <>
                            <StopOutlined /> Disable
                          </>
                        ) : (
                          <>
                            <CheckCircleOutlined /> Enable
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordTarget(u);
                          setPasswordText("");
                        }}
                        className="icon-btn border border-amber-200 text-amber-600 hover:bg-amber-50"
                      >
                        <KeyOutlined /> Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        className="icon-btn border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <DeleteOutlined /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-slate-500">
                    No users yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Sant"
        message={deleteTarget ? `Delete "${deleteTarget.name}"?` : ""}
        confirmText="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
      />

      <PromptModal
        open={!!passwordTarget}
        title={passwordTarget ? `New password for "${passwordTarget.name}"` : ""}
        label="New password"
        value={passwordText}
        onChange={setPasswordText}
        placeholder="Enter new password"
        type="password"
        hint="Minimum 6 characters"
        required
        confirmText="Change Password"
        onClose={() => setPasswordTarget(null)}
        onSubmit={resetPassword}
      />
    </div>
  );
}
