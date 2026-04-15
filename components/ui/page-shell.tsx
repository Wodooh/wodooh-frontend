"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface PageShellProps {
  children: React.ReactNode
  footer?: boolean
  className?: string
}

function PageShell({ children, footer = true, className }: PageShellProps) {
  return (
    <div className={cn("flex flex-col min-h-screen", className)}>
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
        {children}
      </main>
      {footer && (
        <footer className="flex flex-col items-center justify-center w-full py-10 gap-4 border-t border-wd-border-subtle/50">
          <div className="flex gap-8">
            <a
              className="text-[11px] uppercase tracking-widest text-wd-muted-text hover:text-wd-primary transition-colors cursor-pointer"
              href="#"
            >
              Anonymity Guaranteed
            </a>
            <a
              className="text-[11px] uppercase tracking-widest text-wd-muted-text hover:text-wd-primary transition-colors cursor-pointer"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="text-[11px] uppercase tracking-widest text-wd-muted-text hover:text-wd-primary transition-colors cursor-pointer"
              href="#"
            >
              Security Audit
            </a>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-wd-muted-text/60">
            WODOH Secure Gateway &bull; Unified Access
          </p>
        </footer>
      )}
    </div>
  )
}

export { PageShell }
