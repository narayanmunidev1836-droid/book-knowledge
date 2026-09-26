"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "antd";
import {
  Loading3QuartersOutlined,
  ExpandOutlined,
  CloseOutlined,
  AimOutlined,
} from "@ant-design/icons";

const FULL = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function cropMetrics(corners, ow, oh) {
  const [tl, tr, br, bl] = corners;
  const top = Math.hypot((tr.x - tl.x) * ow, (tr.y - tl.y) * oh);
  const bot = Math.hypot((br.x - bl.x) * ow, (br.y - bl.y) * oh);
  const left = Math.hypot((bl.x - tl.x) * ow, (bl.y - tl.y) * oh);
  const right = Math.hypot((br.x - tr.x) * ow, (br.y - tr.y) * oh);
  return {
    cw: Math.max(1, (top + bot) / 2),
    ch: Math.max(1, (left + right) / 2),
  };
}

function drawTriangle(ctx, img, s, d) {
  const [[x0, y0], [x1, y1], [x2, y2]] = s;
  const [[X0, Y0], [X1, Y1], [X2, Y2]] = d;
  const den = x0 * (y2 - y1) + x1 * (y0 - y2) + x2 * (y1 - y0);
  if (!den || Math.abs(den) < 1e-6) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(X0, Y0);
  ctx.lineTo(X1, Y1);
  ctx.lineTo(X2, Y2);
  ctx.closePath();
  ctx.clip();

  const a = (X0 * (y2 - y1) + X1 * (y0 - y2) + X2 * (y1 - y0)) / den;
  const b = (Y0 * (y2 - y1) + Y1 * (y0 - y2) + Y2 * (y1 - y0)) / den;
  const c = (X0 * (x1 - x2) + X1 * (x2 - x0) + X2 * (x0 - x1)) / den;
  const dd = (Y0 * (x1 - x2) + Y1 * (x2 - x0) + Y2 * (x0 - x1)) / den;
  const e = -(X0 * (y2 * x1 - y1 * x2) + X1 * (y0 * x2 - y2 * x0) + X2 * (y1 * x0 - y0 * x1)) / den;
  const f = -(Y0 * (y2 * x1 - y1 * x2) + Y1 * (y0 * x2 - y2 * x0) + Y2 * (y1 * x0 - y0 * x1)) / den;

  ctx.setTransform(a, b, c, dd, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

async function cropTo(src, corners, outW, outH, ow, oh, fileName) {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(outW));
  canvas.height = Math.max(1, Math.round(outH));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const s = corners.map((p) => [p.x * ow, p.y * oh]);
  const d = [
    [0, 0],
    [canvas.width, 0],
    [canvas.width, canvas.height],
    [0, canvas.height],
  ];
  drawTriangle(ctx, img, [s[0], s[1], s[2]], [d[0], d[1], d[2]]);
  drawTriangle(ctx, img, [s[0], s[2], s[3]], [d[0], d[2], d[3]]);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.92)
  );
  if (!blob) throw new Error("Could not resize this image");

  const base = (fileName || "image").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}-resized.webp`, { type: "image/webp" });
}

export default function ImageResizer({ open, src, fileName, onCancel, onConfirm, onUseOriginal }) {
  const [dims, setDims] = useState(null); // { w, h, ow, oh }
  const [corners, setCorners] = useState(FULL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stageRef = useRef(null);
  const dragRef = useRef(null);

  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setDims(null);
    setCorners(FULL);
    setError("");
  }

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    loadImage(src)
      .then((img) => {
        if (cancelled) return;
        setDims({
          w: img.naturalWidth,
          h: img.naturalHeight,
          ow: img.naturalWidth,
          oh: img.naturalHeight,
        });
      })
      .catch(() => {
        if (!cancelled) setError("Could not read this image");
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const metrics = dims ? cropMetrics(corners, dims.ow, dims.oh) : null;
  const scale = metrics ? Math.round((dims.w / metrics.cw) * 100) : 100;
  const isFull =
    corners === FULL ||
    corners.every((p, i) => p.x === FULL[i].x && p.y === FULL[i].y);

  function applyScale(percent, m = metrics) {
    if (!m) return;
    const p = Math.min(100, Math.max(5, Number(percent) || 100));
    setDims((d) =>
      d
        ? {
            ...d,
            w: Math.max(1, Math.round((m.cw * p) / 100)),
            h: Math.max(1, Math.round((m.ch * p) / 100)),
          }
        : d
    );
  }

  function setWidth(value) {
    if (!metrics) return;
    const w = Math.min(Math.max(1, Number(value) || 1), Math.round(metrics.cw));
    setDims((d) => ({ ...d, w, h: Math.max(1, Math.round((w * metrics.ch) / metrics.cw)) }));
  }

  function setHeight(value) {
    if (!metrics) return;
    const h = Math.min(Math.max(1, Number(value) || 1), Math.round(metrics.ch));
    setDims((d) => ({ ...d, h, w: Math.max(1, Math.round((h * metrics.cw) / metrics.ch)) }));
  }

  function syncAfterCornerChange(next) {
    setCorners(next);
    if (!dims) return;
    const m = cropMetrics(next, dims.ow, dims.oh);
    setDims((d) => ({
      ...d,
      w: Math.max(1, Math.round((m.cw * Math.min(scale, 100)) / 100)),
      h: Math.max(1, Math.round((m.ch * Math.min(scale, 100)) / 100)),
    }));
  }

  function onHandleDown(index) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = index;
      e.target.setPointerCapture?.(e.pointerId);
    };
  }

  function onStageMove(e) {
    if (dragRef.current === null || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const next = corners.map((p, i) => (i === dragRef.current ? { x, y } : p));
    syncAfterCornerChange(next);
  }

  function onStageUp() {
    dragRef.current = null;
  }

  function resetCorners() {
    syncAfterCornerChange(FULL.map((p) => ({ ...p })));
    applyScale(100, cropMetrics(FULL, dims.ow, dims.oh));
  }

  async function handleResize() {
    if (!dims || !metrics) return;
    setBusy(true);
    setError("");
    try {
      const file = await cropTo(src, corners, dims.w, dims.h, dims.ow, dims.oh, fileName);
      onConfirm(file);
    } catch (e) {
      setError(e?.message || "Resize failed");
    } finally {
      setBusy(false);
    }
  }

  const poly = corners.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");

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
            <ExpandOutlined />
          </span>
          Crop &amp; resize image
        </span>
      }
    >
      <div className="space-y-4">
        <div className="flex max-h-[46vh] items-center justify-center overflow-hidden rounded-xl bg-slate-100 p-2">
          {src ? (
            <div
              ref={stageRef}
              onPointerMove={onStageMove}
              onPointerUp={onStageUp}
              onPointerCancel={onStageUp}
              className="relative inline-block max-h-[42vh] touch-none select-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Crop preview"
                className="block max-h-[42vh] w-auto max-w-full object-contain"
              />
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <polygon points={poly} fill="rgba(16,185,129,0.18)" stroke="#10b981" strokeWidth="0.6" />
              </svg>
              {corners.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Corner ${i + 1}`}
                  onPointerDown={onHandleDown(i)}
                  className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-emerald-500 shadow-md active:cursor-grabbing"
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {!dims ? (
          <p className="text-sm text-slate-500">Loading image…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Drag the four green corners to select exactly the part of the image
              you want{!isFull ? "" : " (currently the full image)"}.
            </p>

            <div className="flex items-end gap-3">
              <div className="w-32">
                <label className="label">Width (px)</label>
                <input
                  type="number"
                  min={1}
                  value={dims.w}
                  onChange={(e) => setWidth(e.target.value)}
                  className="input"
                />
              </div>
              <span className="pb-3 text-slate-400">×</span>
              <div className="w-32">
                <label className="label">Height (px)</label>
                <input
                  type="number"
                  min={1}
                  value={dims.h}
                  onChange={(e) => setHeight(e.target.value)}
                  className="input"
                />
              </div>
              <p className="pb-3 text-xs text-slate-500">
                Selected area {Math.round(metrics.cw)} × {Math.round(metrics.ch)} px
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500">Scale</span>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={Math.min(100, scale)}
                onChange={(e) => applyScale(e.target.value)}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600"
              />
              <span className="w-10 text-right text-xs font-semibold text-emerald-700">
                {Math.min(100, scale)}%
              </span>
            </div>

            <p className="text-xs text-slate-500">
              The cropped &amp; resized image is stored and shown at this size.
              Want the full image? Choose &ldquo;Use original size&rdquo;.
            </p>
          </div>
        )}

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
          {!isFull && (
            <button
              type="button"
              onClick={resetCorners}
              disabled={busy || !dims}
              className="btn-ghost"
            >
              <AimOutlined /> Reset corners
            </button>
          )}
          {onUseOriginal && (
            <button
              type="button"
              onClick={onUseOriginal}
              disabled={busy || !dims}
              className="btn-ghost"
            >
              Use original size
            </button>
          )}
          <button
            type="button"
            onClick={handleResize}
            disabled={busy || !dims}
            className="btn-primary"
          >
            {busy ? <Loading3QuartersOutlined spin /> : <ExpandOutlined />}
            {busy ? "Resizing…" : "Crop & use"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
