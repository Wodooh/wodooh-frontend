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

export function PdfViewer({ url, page, onLoadSuccess }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    obs.observe(el);
    setContainerWidth(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto' }}
    >
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => onLoadSuccess?.(numPages)}
        loading={<PdfLoadingPlaceholder />}
        error={<PdfErrorPlaceholder />}
      >
        <Page
          pageNumber={page}
          width={containerWidth ? containerWidth - 4 : undefined}
          renderAnnotationLayer={false}
          renderTextLayer={false}
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
