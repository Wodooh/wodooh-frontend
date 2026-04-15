import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-white rounded-wd-large border border-wd-border-subtle shadow-[0_2px_8px_rgba(0,0,0,0.05)]",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-8", className)}
      {...props}
    />
  )
}

export { Card, CardContent }
