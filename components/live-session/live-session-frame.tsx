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

import { useCallback, useEffect, useState } from "react";
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
  // Persisted user preference. Initialised lazily so SSR sees the default and
  // the first client paint reads the stored value before layout settles.
  const [userCollapsed, setUserCollapsed] = useState<boolean>(false);
  // Forced-collapsed by a narrow viewport. Overrides user preference until
  // the viewport widens again; user preference is preserved through resize.
  const [forcedCollapsed, setForcedCollapsed] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RAIL_STORAGE_KEY);
      if (raw === "1") setUserCollapsed(true);
    } catch { /* localStorage blocked — fall back to default */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onResize = () => setForcedCollapsed(window.innerWidth < NARROW_BREAKPOINT_PX);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const collapsed = userCollapsed || forcedCollapsed;

  const toggleRail = useCallback(() => {
    setUserCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0"); }
      catch { /* ignore */ }
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
