"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import Spinner from "@/components/Spinner";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// One page: a sized placeholder that renders its canvas only while near the
// viewport, so a 500-page book never holds 500 bitmaps in memory.
function PdfPage({ pdf, num, width, onActive }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [ratio, setRatio] = useState(1.414);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const nearObs = new IntersectionObserver(
      ([e]) => setNear(e.isIntersecting),
      { rootMargin: "1500px 0px" }
    );
    const activeObs = new IntersectionObserver(
      ([e]) => e.isIntersecting && onActive(num),
      { rootMargin: "-50% 0px -50% 0px" }
    );
    nearObs.observe(el);
    activeObs.observe(el);
    return () => {
      nearObs.disconnect();
      activeObs.disconnect();
    };
  }, [num, onActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!near || !width || !canvas) return;
    let task = null;
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(num);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
      try {
        await task.promise;
      } catch {
        // render cancelled by a resize / scroll-away
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
      // Release the bitmap once the page is far off-screen.
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [pdf, num, width, near]);

  return (
    <div
      ref={wrapRef}
      data-page={num}
      className="mx-auto mb-3 overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-slate-200"
      style={{ width, height: width * ratio }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default function PdfReader({ bookId }) {
  const [book, setBook] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [boxWidth, setBoxWidth] = useState(0);
  const [current, setCurrent] = useState(1);
  const boxRef = useRef(null);
  // Opened from the book detail page → go back there, otherwise to the list.
  const backHref =
    useSearchParams().get("from") === "detail"
      ? `/sant/books/${bookId}`
      : "/sant/books";

  const onActive = useCallback((n) => setCurrent(n), []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/books/${encodeURIComponent(bookId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => {
        if (cancelled) return;
        if (!b.hasPdf) setError("No PDF uploaded for this book");
        setBook(b);
      })
      .catch(() => !cancelled && setError("Failed to load book"));
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useEffect(() => {
    if (!book?.hasPdf) return;
    let cancelled = false;
    let doc = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        // Fetch the bytes ourselves and verify them: handing pdf.js a URL lets
        // its streaming/caching layer silently open a partial file as a
        // 1-page document.
        const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/pdf`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = new Uint8Array(await res.arrayBuffer());
        const expected = Number(res.headers.get("content-length"));
        if (expected && data.length !== expected) {
          throw new Error(`Incomplete PDF: ${data.length}/${expected} bytes`);
        }
        if (cancelled) return;
        doc = await pdfjs.getDocument({ data }).promise;
        if (!cancelled) setPdf(doc);
      } catch (e) {
        console.error("PDF load failed:", e);
        if (!cancelled) setError("Could not open this PDF");
      }
    })();
    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [book, bookId]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [pdf]);

  const back = (
    <Link
      href={backHref}
      className="btn-ghost !px-2.5 !py-1.5 text-sm"
    >
      <ArrowLeftOutlined /> Back
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <p className="card p-6 text-center text-slate-500">{error}</p>
      </div>
    );
  }
  if (!pdf) return <Spinner label="Loading PDF..." />;

  const pageWidth = Math.max(0, Math.floor(boxWidth * zoom));
  const zoomBy = (d) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + d) * 100) / 100)));

  return (
    <div>
      <div className="sticky top-[57px] z-30 -mx-4 mb-3 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur-md lg:top-0">
        {back}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
          {book?.name}
        </span>
        <span className="shrink-0 text-xs text-slate-500">
          {current} / {pdf.numPages}
        </span>
        <button
          type="button"
          onClick={() => zoomBy(-0.25)}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          className="btn-ghost !px-2.5 !py-1.5"
        >
          <ZoomOutOutlined />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(0.25)}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          className="btn-ghost !px-2.5 !py-1.5"
        >
          <ZoomInOutlined />
        </button>
        <a
          href={`/api/books/${encodeURIComponent(bookId)}/pdf?download=1`}
          aria-label="Download PDF"
          className="btn-ghost !px-2.5 !py-1.5"
        >
          <DownloadOutlined />
        </a>
      </div>

      <div ref={boxRef} className="w-full overflow-x-auto">
        {boxWidth > 0 &&
          Array.from({ length: pdf.numPages }, (_, i) => (
            <PdfPage key={i + 1} pdf={pdf} num={i + 1} width={pageWidth} onActive={onActive} />
          ))}
      </div>
    </div>
  );
}
