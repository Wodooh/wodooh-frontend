"use client";

/**
 * LiveSessionFrame — shared layout skeleton for the instructor and student
 * live-session pages.
 *
 * The frame owns:
 *   - viewport-filling layout (banner / top bar / slide / bottom strip / rail)
 *   - the collapsible right rail toggle and its persisted state
 *   - auto-collapse on narrow viewports
 *
 * It does not own any content — every region is a slot. Page-level code
 * composes the inner structure of the top bar, bottom strip, and rail.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "./icons";

const RAIL_STORAGE_KEY = "wodooh_live_rail_collapsed";
const NARROW_BREAKPOINT_PX = 900;

interface LiveSessionFrameProps {
  /** Optional banner area at the very top (e.g. auto-close warning, ended notice). */
  banner?: ReactNode;
  /** Single-row, ~48px tall. Compose left/right inside with `.nx-lsf-topbar-left/right`. */
  topBar: ReactNode;
  /** Dominant slide region. Renders into a dark surface; child fills via flex. */
  slide: ReactNode;
  /** Thin bar under the slide. Compose left/center/right with `.nx-lsf-bottom-*`. */
  bottomStrip: ReactNode;
  /** Right-rail contents. Hidden when the rail is collapsed. */
  rail: ReactNode;
}

export function LiveSessionFrame({
  banner,
  topBar,
  slide,
  bottomStrip,
  rail,
}: LiveSessionFrameProps) {
  // Single source of truth for the rail. Narrow viewports default to collapsed
  // (the rail becomes a full-screen overlay there, so it must start closed),
  // but the user can still open it via the toggle. On wide viewports the
  // collapsed state is a persisted preference.
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);
  // Tracks the last-seen viewport category so resize only re-derives the
  // default when crossing the narrow/wide boundary — never clobbering a
  // manual toggle within the same category.
  const wasNarrow = useRef<boolean | null>(null);

  const readStoredCollapsed = () => {
    try { return localStorage.getItem(RAIL_STORAGE_KEY) === "1"; }
    catch { return false; }
  };

  useEffect(() => {
    const narrow = window.innerWidth < NARROW_BREAKPOINT_PX;
    wasNarrow.current = narrow;
    setCollapsed(narrow ? true : readStoredCollapsed());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const narrow = window.innerWidth < NARROW_BREAKPOINT_PX;
      if (narrow === wasNarrow.current) return;
      wasNarrow.current = narrow;
      setCollapsed(narrow ? true : readStoredCollapsed());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleRail = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      // Persist only as a wide-screen preference; on phones the rail is a
      // transient overlay and shouldn't stick across sessions.
      if (window.innerWidth >= NARROW_BREAKPOINT_PX) {
        try { localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0"); }
        catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  return (
    <div className="nx-lsf" data-rail-collapsed={collapsed ? "true" : "false"} data-hydrated={hydrated ? "true" : "false"}>
      {banner && <div className="nx-lsf-banner">{banner}</div>}

      <div className="nx-lsf-topbar" role="banner">{topBar}</div>

      <div className="nx-lsf-body">
        <div className="nx-lsf-stage">
          <div className="nx-lsf-slide">{slide}</div>
          <div className="nx-lsf-bottom" role="toolbar" aria-label="Slide controls">
            {bottomStrip}
          </div>
        </div>

        {/* Mobile-only scrim behind the rail overlay; tap to dismiss.
            Hidden on desktop via CSS. */}
        <div
          className="nx-lsf-rail-scrim"
          onClick={() => { if (!collapsed) toggleRail(); }}
          aria-hidden="true"
        />

        <button
          type="button"
          className="nx-lsf-rail-toggle"
          onClick={toggleRail}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Show side panel" : "Hide side panel"}
          title={collapsed ? "Show side panel" : "Hide side panel"}
        >
          {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <aside
          className="nx-lsf-rail"
          aria-hidden={collapsed}
          {...(collapsed ? { inert: true } : {})}
        >
          <div className="nx-lsf-rail-inner">{rail}</div>
        </aside>
      </div>
    </div>
  );
}
