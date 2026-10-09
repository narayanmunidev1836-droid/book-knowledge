"use client";

import { useState } from "react";
import { Modal } from "antd";
import { Loading3QuartersOutlined } from "@ant-design/icons";

export default function ChangePasswordModal({ open, onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
  }

  async function handleOk() {
    if (!current || !next || !confirm) {
      setError("All fields are required");
      return;
    }
    if (next.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match");
      return;
    }
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      onClose();
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => {
        if (!pending) onClose();
      }}
      onOk={handleOk}
      okText={
        pending ? (
          <>
            <Loading3QuartersOutlined spin /> Updating...
          </>
        ) : (
          "Update password"
        )
      }
      cancelText="Cancel"
      okButtonProps={{
        disabled: pending,
        style: {
          background: "linear-gradient(135deg, #8e1f0a, #c4511f)",
          borderColor: "transparent",
          borderRadius: "0.75rem",
          fontWeight: 600,
          boxShadow: "0 1px 2px rgba(142,31,10,0.3)",
        },
      }}
      cancelButtonProps={{ disabled: pending, style: { borderRadius: "0.75rem" } }}
      title="Change password"
      width={480}
      destroyOnHidden
    >
      <div className="space-y-3 pt-3">
        <div>
          <label className="label">Current password</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Enter current password"
            className="input"
            autoComplete="current-password"
            autoFocus
          />
        </div>
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="At least 6 characters"
            className="input"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
            className="input"
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
