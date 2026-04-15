import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "w-full bg-wd-surface-low border border-wd-border-subtle rounded-wd-small px-4 py-3 text-wd-body-text transition-all",
        "placeholder:text-wd-muted-text/50",
        "focus:border-wd-primary focus:ring-1 focus:ring-wd-primary/20 focus:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
