'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Static worker in /public — avoids Turbopack version-mismatch errors
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
  url: string;
  page: number;
  onLoadSuccess?: (numPages: number) => void;
}

interface PageDim { width: number; height: number; }
interface PdfPageProxyLike {
  getViewport(opts: { scale: number }): { width: number; height: number };
}

export function PdfViewer({ url, page, onLoadSuccess }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [pageDim, setPageDim] = useState<PageDim | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setContainerSize({ w: r.width, h: r.height });
    });
    obs.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  // Fit-to-contain: scale is min(width-fit, height-fit) so the page is fully
  // visible in BOTH dimensions, letterboxed by the dark background showing
  // through. Width-only sizing (the previous behavior) made portrait or 4:3
  // pages overflow the container vertically — which surfaced a scrollbar
  // because the wrapper was `overflow: auto`. Both are fixed here:
  //   - scale computed from the smaller fit ratio
  //   - container is `overflow: hidden` (never scroll, always letterbox)
  // First paint before page dims arrive uses a width-only fallback; any
  // brief overflow is invisible thanks to `overflow: hidden`, and the
  // re-render after onLoadSuccess snaps the page to the correct scale.
  const scale = pageDim && containerSize.w && containerSize.h
    ? Math.min(containerSize.w / pageDim.width, containerSize.h / pageDim.height)
    : undefined;
  const fallbackWidth = !scale && containerSize.w ? containerSize.w - 4 : undefined;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => onLoadSuccess?.(numPages)}
        loading={<PdfLoadingPlaceholder />}
        error={<PdfErrorPlaceholder />}
      >
        <Page
          pageNumber={page}
          {...(scale !== undefined ? { scale } : { width: fallbackWidth })}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          onLoadSuccess={(p: PdfPageProxyLike) => {
            const vp = p.getViewport({ scale: 1 });
            setPageDim({ width: vp.width, height: vp.height });
          }}
        />
      </Document>
    </div>
  );
}

function PdfLoadingPlaceholder() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: 320, gap: 12, color: 'var(--nx-fg-muted)',
    }}>
      <span className="nx-spin" />
      <span style={{ fontSize: 13 }}>Loading PDF…</span>
    </div>
  );
}

function PdfErrorPlaceholder() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: 320, gap: 8, color: 'var(--nx-danger)',
    }}>
      <span style={{ fontSize: 13 }}>Failed to load PDF</span>
    </div>
  );
}
