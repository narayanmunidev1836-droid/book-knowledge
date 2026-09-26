"use client";

import { useState } from "react";
import { Modal } from "antd";
import { Loading3QuartersOutlined } from "@ant-design/icons";

export default function PromptModal({
  open,
  title,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  required = false,
  confirmText = "Save",
  onClose,
  onSubmit,
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    setError("");
  }

  async function handleOk() {
    if (required && !String(value ?? "").trim()) {
      setError("This field is required");
      return;
    }
    setError("");
    setPending(true);
    try {
      await onSubmit();
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
            <Loading3QuartersOutlined spin /> Saving...
          </>
        ) : (
          confirmText
        )
      }
      cancelText="Cancel"
      okButtonProps={{ disabled: pending }}
      cancelButtonProps={{ disabled: pending }}
      title={title}
      width={480}
      destroyOnHidden
    >
      <div className="space-y-2 pt-3">
        {label && <label className="label">{label}</label>}
        {type === "textarea" ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="input resize-none"
            autoFocus
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="input"
            autoFocus
          />
        )}
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
