/**
 * Anonymous-author chip. Renders an `authorAnonymousCourseID` (e.g.
 * `anon-7f3a`) or an `anonymousSessionId` (e.g. `sess-x4f2`) with a small
 * derived color glyph so the instructor can recognize "the same anonymous
 * voice" within a session without ever seeing the real identity.
 *
 * Privacy invariant: NEVER pair this chip with a real `studentNumber`.
 * The hue is derived deterministically from the pseudonym itself, not from
 * any identified field.
 */

import { cn } from "@/lib/utils";

interface AnonChipProps {
  id: string;
  className?: string;
}

// Stable string-to-hue so the same pseudonym always gets the same dot color.
function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export function AnonChip({ id, className }: AnonChipProps) {
  const hue = hueFor(id);
  return (
    <span className={cn("nx-anon-chip", className)}>
      <span
        className="nx-anon-chip-glyph"
        style={{ backgroundColor: `hsl(${hue} 70% 78%)` }}
        aria-hidden
      />
      {id}
    </span>
  );
}
