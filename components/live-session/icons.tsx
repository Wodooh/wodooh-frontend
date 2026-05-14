/**
 * Inline stroke-based icons used across the live-session surface.
 * Defined here (rather than imported per file) so both the instructor and
 * the future student page can share a single canonical set.
 *
 * Per Nexus DESIGN.md §Iconography: viewBox 0 0 24 24, fill="none",
 * stroke="currentColor", stroke-width 1.6, stroke-linecap/linejoin round.
 */

import type { SVGProps } from "react";

type IconProps = { size?: number } & Omit<SVGProps<SVGSVGElement>, "viewBox">;

const Base = ({ size = 15, children, ...rest }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

export const ChevronLeft  = (p: IconProps) => <Base {...p}><path d="M15 5l-7 7 7 7" /></Base>;
export const ChevronRight = (p: IconProps) => <Base {...p}><path d="M9 5l7 7-7 7" /></Base>;
export const SkipBack     = (p: IconProps) => <Base {...p}><path d="M5 5v14M19 5l-9 7 9 7z" /></Base>;
export const SkipForward  = (p: IconProps) => <Base {...p}><path d="M19 5v14M5 5l9 7-9 7z" /></Base>;
export const PullUp       = (p: IconProps) => <Base {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Base>;
export const ZoomOut      = (p: IconProps) => <Base {...p}><path d="M5 12h14" /></Base>;
export const ZoomIn       = (p: IconProps) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>;
export const Fullscreen   = (p: IconProps) => <Base {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Base>;
export const Search       = (p: IconProps) => <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Base>;
export const Eye          = (p: IconProps) => <Base {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Base>;
export const MuteIcon     = (p: IconProps) => <Base {...p}><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m22 9-6 6M16 9l6 6" /></Base>;
export const Flag         = (p: IconProps) => <Base {...p}><path d="M4 21V4l5 2 5-2 6 3-2 6 2 6-6-3-5 2-5-2z" /></Base>;
export const Ungroup      = (p: IconProps) => <Base {...p}><path d="M3 6h7M14 6h7M3 12h18M3 18h7M14 18h7" /></Base>;
export const Cluster      = (p: IconProps) => <Base {...p}><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="M7.4 7.5 10.6 16.5M16.6 7.5 13.4 16.5M8 6h8" /></Base>;
export const Copy         = (p: IconProps) => <Base {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Base>;
export const StopSquare   = (p: IconProps) => <Base {...p}><rect x="6" y="6" width="12" height="12" rx="2" /></Base>;
export const Check        = (p: IconProps) => <Base {...p}><path d="m5 13 4 4 10-10" /></Base>;
export const Close        = (p: IconProps) => <Base {...p}><path d="M6 6l12 12M18 6 6 18" /></Base>;
export const AlertCircle  = (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></Base>;
