/**
 * Renders one page of the instructor's lecture material.
 *
 * V1 (this implementation) draws a hand-laid demo slide for page 12 of the
 * mock CS-401 deck, and a clean numeric placeholder for every other page —
 * so the page-nav, follower bar, and thumbnail strip can all be exercised
 * end-to-end without a real file-rendering backend.
 *
 * V2 will switch on `material.pageImageUrls?.[page - 1]` and render an
 * <img>; the surrounding chrome (stage + arrows) stays the same, so the
 * instructor and student portals share the visual shell.
 */

import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "./icons";
import type { SessionMaterial } from "@/lib/types/live-session.types";

const PdfViewer = dynamic(
  () => import("@/components/lecture/pdf-viewer").then(m => ({ default: m.PdfViewer })),
  { ssr: false, loading: () => <PdfLoadingSkeleton /> }
);

interface SlideStageProps {
  material: SessionMaterial;
  page: number;
  pdfUrl?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onPdfLoad?: (numPages: number) => void;
}

export function SlideStage({ material, page, pdfUrl, onPrev, onNext, onPdfLoad }: SlideStageProps) {
  const total = material.totalPages;
  const hasImage = Boolean(material.pageImageUrls?.[page - 1]);

  return (
    <div className="nx-slide-stage">
      <button
        className="nx-slide-nav-arrow is-left"
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Previous slide"
        title="Previous slide"
      >
        <ChevronLeft size={14} />
      </button>

      <article className="nx-slide" aria-label={`Slide ${page} of ${total || '?'}`}>
        {pdfUrl ? (
          <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
            <PdfViewer url={pdfUrl} page={page} onLoadSuccess={onPdfLoad} />
          </div>
        ) : hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={material.pageImageUrls![page - 1]}
            alt={`Slide ${page}`}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : page === 12 ? (
          <DemoMasterTheoremSlide page={page} total={total} />
        ) : (
          <PlaceholderSlide page={page} total={total} />
        )}
      </article>

      <button
        className="nx-slide-nav-arrow is-right"
        onClick={onNext}
        disabled={page >= (total || 1)}
        aria-label="Next slide"
        title="Next slide"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

/* ─── PDF loading skeleton ───────────────────────────────── */

function PdfLoadingSkeleton() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--nx-fg-muted)" }}>
      <span className="nx-spin" />
      <span style={{ fontSize: 13 }}>Loading PDF…</span>
    </div>
  );
}

/* ─── slide content (V1 demo) ────────────────────────────── */

function DemoMasterTheoremSlide({ page, total }: { page: number; total: number }) {
  return (
    <div className="nx-slide-inner">
      <div>
        <div className="nx-slide-eyebrow">
          <span>Master Theorem</span>
          <span className="nx-slide-eyebrow-rule" />
          <span className="nx-slide-eyebrow-pg">Case 2</span>
        </div>
        <h2 className="nx-slide-title">The Logarithmic Boundary</h2>
        <p className="nx-slide-subtitle">when f(n) = Θ(n^log_b(a))</p>
        <ul className="nx-slide-bullets">
          <li><span /><span>Given the recurrence <em>T(n) = a·T(n/b) + f(n)</em>, where a ≥ 1 and b &gt; 1.</span></li>
          <li><span /><span>If f(n) and <em>n^log_b(a)</em> grow at the same asymptotic rate, the recursion does equal work at every level.</span></li>
          <li><span /><span>The total cost telescopes to <em>T(n) = Θ(n^log_b(a) · log n)</em>.</span></li>
          <li><span /><span>Intuition: there are <em>log_b(n)</em> levels, and each contributes the same Θ(n^log_b(a)) work.</span></li>
        </ul>
      </div>

      <aside className="nx-slide-aside">
        <div className="nx-slide-caption">Recursion tree · uniform work per level</div>
        <RecursionTree />
      </aside>

      <div className="nx-slide-foot">
        <span>CS-401 · Master Theorem</span>
        <span className="nx-slide-foot-pgnum">{page} / {total}</span>
      </div>
    </div>
  );
}

function PlaceholderSlide({ page, total }: { page: number; total: number }) {
  return (
    <div className="nx-slide-inner is-single">
      <div className="nx-slide-placeholder">
        <div className="nx-slide-placeholder-pg">{String(page).padStart(2, "0")}</div>
        <div className="nx-slide-placeholder-label">Slide {page} · placeholder</div>
      </div>
      <div className="nx-slide-foot">
        <span>CS-401 · Master Theorem</span>
        <span className="nx-slide-foot-pgnum">{page} / {total}</span>
      </div>
    </div>
  );
}

function RecursionTree() {
  return (
    <svg
      width="100%"
      height="220"
      viewBox="0 0 320 220"
      aria-hidden
      style={{ display: "block" }}
    >
      <g stroke="var(--slide-muted)" strokeWidth="1" fill="none">
        <path d="M160 26 L80 70  M160 26 L160 70  M160 26 L240 70" />
        <path d="M80 86  L50 130 M80 86  L80 130 M80 86  L110 130" />
        <path d="M160 86 L140 130 M160 86 L180 130" />
        <path d="M240 86 L220 130 M240 86 L270 130" />
        <path d="M50 146 L40 186 M50 146 L60 186" />
        <path d="M270 146 L260 186 M270 146 L280 186" />
      </g>
      <g>
        <circle cx="160" cy="22" r="14" fill="color-mix(in oklab, var(--accent) 18%, var(--slide-bg))" stroke="var(--accent)" strokeWidth="1.4" />
        <text x="160" y="25" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="600" fill="var(--slide-ink)">n</text>

        {[80, 160, 240].map(x => (
          <g key={x}>
            <circle cx={x} cy="78" r="11" fill="var(--slide-bg)" stroke="var(--slide-ink)" strokeWidth="1.2" />
            <text x={x} y="81" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="9" fill="var(--slide-muted)">n/b</text>
          </g>
        ))}
        {[50, 80, 110, 140, 180, 220, 270].map(x => (
          <circle key={x} cx={x} cy="138" r="8" fill="var(--slide-bg)" stroke="var(--slide-ink)" strokeWidth="1.2" />
        ))}
        {[40, 60, 260, 280].map(x => (
          <circle key={x} cx={x} cy="194" r="5" fill="var(--slide-bg)" stroke="var(--slide-ink)" strokeWidth="1.2" />
        ))}
      </g>
      <g fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="600" fill="var(--slide-ink)">
        <text x="315" y="25"  textAnchor="end">level 0 → Θ(n^k)</text>
        <text x="315" y="81"  textAnchor="end">level 1 → Θ(n^k)</text>
        <text x="315" y="141" textAnchor="end">level 2 → Θ(n^k)</text>
        <text x="315" y="201" textAnchor="end">log_b(n) levels</text>
      </g>
    </svg>
  );
}
