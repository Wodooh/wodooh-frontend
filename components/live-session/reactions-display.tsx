/**
 * Live reaction tallies (US-D3 / FR-13). Read-only display — both the
 * instructor (aggregate) and the (future) student (their own submitted
 * tallies) consume this same component.
 *
 * The `incrementedKind` prop drives a 240ms scale-pop on the matching tile,
 * so when a new reaction streams in via Ably the cell quietly pulses
 * without re-laying out the grid.
 */

import { cn } from "@/lib/utils";
import type { ReactionKind, ReactionTallies } from "@/lib/types/live-session.types";

interface ReactionsDisplayProps {
  tallies: ReactionTallies;
  /** Optional sub-label for the right of the head (e.g. "slide 12 · last 60s"). */
  contextLabel?: string;
  /** Most recently incremented kind. Triggers a one-shot scale-pop on its tile. */
  incrementedKind?: ReactionKind | null;
}

const ORDER: { kind: ReactionKind; label: string }[] = [
  { kind: "too_fast",   label: "Too fast"  },
  { kind: "too_slow",   label: "Too slow"  },
  { kind: "understood", label: "Understood" },
  { kind: "not_clear",  label: "Not clear" },
];

export function ReactionsDisplay({ tallies, contextLabel, incrementedKind }: ReactionsDisplayProps) {
  return (
    <div className="nx-card nx-reactions-card" aria-label="Live reaction tallies">
      <div className="nx-reactions-head">
        <span className="nx-reactions-eyebrow">
          <span className="nx-live-mini" aria-hidden /> Reactions · live
        </span>
        {contextLabel && <span className="nx-reactions-meta">{contextLabel}</span>}
      </div>
      <div className="nx-reactions-grid">
        {ORDER.map(({ kind, label }) => {
          const tally = tallies[kind];
          const isPulse = incrementedKind === kind;
          const arrow = tally.trend === "up" ? " ↑" : tally.trend === "down" ? " ↓" : "";
          // Key includes the running total so React remounts the tile on each
          // increment — that re-runs the CSS keyframe animation without any
          // imperative state. The total alone is enough; `isPulse` decides
          // whether the animation class is applied.
          return (
            <div
              key={`${kind}-${tally.total}`}
              className={cn("nx-react-tile", isPulse && "is-incr")}
              data-kind={kind}
            >
              <div className="nx-react-tile-lbl-row">
                <span className="nx-react-tile-dot" aria-hidden />
                <span className="nx-react-tile-lbl">{label}</span>
              </div>
              <span className="nx-react-tile-val">{tally.total}</span>
              <span className="nx-react-tile-delta">
                {tally.ratePerMin.toFixed(1)} / min{arrow}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
