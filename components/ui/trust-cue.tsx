import * as React from "react"

import { cn } from "@/lib/utils"

interface TrustCueProps {
  icon: string
  title: string
  children: React.ReactNode
  className?: string
}

function TrustCue({ icon, title, children, className }: TrustCueProps) {
  return (
    <div
      data-slot="trust-cue"
      className={cn(
        "flex items-start gap-3 p-4 bg-wd-surface-mid rounded-wd-small border-l-2 border-wd-primary/20",
        className
      )}
    >
      <span
        className="material-symbols-outlined text-wd-muted-text mt-0.5"
        style={{ fontSize: 18 }}
      >
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-wd-body-text">{title}</p>
        <p className="text-[11px] leading-relaxed text-wd-muted-text">
          {children}
        </p>
      </div>
    </div>
  )
}

export { TrustCue }
