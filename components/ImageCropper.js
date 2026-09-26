"use client";

import { useCallback, useState } from "react";
import { Modal } from "antd";
import Cropper from "react-easy-crop";
import {
  Loading3QuartersOutlined,
  ScissorOutlined,
  CloseOutlined,
} from "@ant-design/icons";

async function getCroppedFile(src, pixelCrop, fileName) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.92)
  );
  if (!blob) throw new Error("Could not crop this image");

  const base = (fileName || "image").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}-crop.webp`, { type: "image/webp" });
}

export default function ImageCropper({ open, src, fileName, onCancel, onConfirm, onUseFull }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Reset the crop box whenever a new image is picked
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setError("");
  }

  const onCropComplete = useCallback((_, pixelCrop) => setArea(pixelCrop), []);

  async function handleCrop() {
    if (!area || area.width < 2 || area.height < 2) {
      setError("Drag to select the area you want");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const file = await getCroppedFile(src, area, fileName);
      onConfirm(file);
    } catch (e) {
      setError(e?.message || "Crop failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={busy ? undefined : onCancel}
      footer={null}
      closable={!busy}
      keyboard={!busy}
      width={720}
      centered
      title={
        <span className="flex items-center gap-2 text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
            <ScissorOutlined />
          </span>
          Crop image
        </span>
      }
    >
      <div className="space-y-3">
        <div className="relative h-[52vh] w-full overflow-hidden rounded-xl bg-slate-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600"
          />
        </div>

        <p className="text-xs text-slate-500">
          Drag the box over the part you want and adjust zoom, then
          &ldquo;Crop&nbsp;&amp;&nbsp;use&rdquo; — only the selected part will be
          stored. No crop needed? Choose &ldquo;Use full image&rdquo;.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-ghost"
          >
            <CloseOutlined /> Remove image
          </button>
          {onUseFull && (
            <button
              type="button"
              onClick={onUseFull}
              disabled={busy}
              className="btn-ghost"
            >
              Use full image
            </button>
          )}
          <button
            type="button"
            onClick={handleCrop}
            disabled={busy}
            className="btn-primary"
          >
            {busy ? <Loading3QuartersOutlined spin /> : <ScissorOutlined />}
            {busy ? "Cropping…" : "Crop & use"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
