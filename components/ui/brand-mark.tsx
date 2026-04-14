import { cn } from "@/lib/utils"

const sizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
} as const

interface BrandMarkProps {
  size?: keyof typeof sizeClasses
  tagline?: boolean
  className?: string
}

function BrandMark({ size = "md", tagline = false, className }: BrandMarkProps) {
  return (
    <div className={cn("text-center space-y-6", className)}>
      <div
        className={cn(
          "font-bold tracking-tight text-wd-primary flex items-center justify-center gap-3",
          sizeClasses[size]
        )}
      >
        WODOH{" "}
        <span className="text-wd-muted-text font-normal">|</span>{" "}
        <span className="font-normal text-wd-muted-text" lang="ar" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
          وضوح
        </span>
      </div>
      {tagline && (
        <p className="text-wd-muted-text text-sm uppercase tracking-[0.2em] font-medium">
          Institutional Clarity
        </p>
      )}
    </div>
  )
}

export { BrandMark }
