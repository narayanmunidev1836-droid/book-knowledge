"use client";

import { useState } from "react";
import { Modal } from "antd";
import { ExclamationCircleFilled, Loading3QuartersOutlined } from "@ant-design/icons";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Delete",
  onClose,
  onConfirm,
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    setError("");
  }

  async function handleOk() {
    setError("");
    setPending(true);
    try {
      const result = await onConfirm();
      if (result !== false) onClose();
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
      okText={confirmText}
      cancelText="Cancel"
      okButtonProps={{ danger: true, disabled: pending }}
      cancelButtonProps={{ disabled: pending }}
      confirmLoading={pending}
      title={title}
      width={440}
      destroyOnHidden
    >
      <div className="flex gap-3 pt-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-lg text-red-500">
          <ExclamationCircleFilled />
        </span>
        <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
