"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export interface NavItem {
  label: string
  href: string
  icon: string
}

interface SidebarNavigationProps {
  items: NavItem[]
  logo?: React.ReactNode
  footer?: React.ReactNode
  /** Tailwind classes applied to the active nav item (bg + text) */
  activeClass?: string
  /** Tailwind bg class for the active icon container */
  accentBg?: string
  /** Tailwind text class for the active item label */
  accentText?: string
  /** Tailwind bg class for the user avatar */
  avatarBg?: string
  userName?: string
  userRole?: string
  userInitials?: string
  className?: string
}

function SidebarNavigation({
  items,
  logo,
  footer,
  activeClass   = "bg-[#EEF2FF] text-[#1040C0]",
  accentBg      = "bg-[#1040C0]",
  accentText    = "text-[#1040C0]",
  avatarBg      = "bg-[#1040C0]",
  userName,
  userRole,
  userInitials,
  className,
}: SidebarNavigationProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "w-64 shrink-0 bg-white border-r border-[#E2E8F0] flex flex-col",
        className
      )}
    >
      {logo && (
        <div className="px-6 py-5 border-b border-[#E2E8F0]">{logo}</div>
      )}

      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Sidebar navigation">
        <ul className="space-y-0.5" role="list">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? activeClass
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-[18px] leading-none",
                      isActive ? accentText : "text-[#94A3B8]"
                    )}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {(userName || footer) && (
        <div className="px-3 py-4 border-t border-[#E2E8F0]">
          {userName && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                  avatarBg
                )}
                aria-hidden="true"
              >
                {userInitials ?? userName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F172A] truncate capitalize">{userName}</p>
                {userRole && (
                  <p className="text-xs text-[#94A3B8] capitalize">{userRole}</p>
                )}
              </div>
            </div>
          )}
          {footer}
        </div>
      )}
    </aside>
  )
}

export { SidebarNavigation }
export type { SidebarNavigationProps }
