import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  meta?: string
  greeting?: string
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

function PageHeader({
  meta,
  greeting,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-8", className)}>
      <div className="min-w-0">
        {meta && (
          <p className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8] mb-1">
            {meta}
          </p>
        )}
        {greeting && (
          <p className="text-sm text-[#64748B] mb-0.5">{greeting}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[#64748B] leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}

export { PageHeader }
export type { PageHeaderProps }
