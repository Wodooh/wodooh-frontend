"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { collections } from "@/lib/admin/collections";

/**
 * Admin sidebar. Reads from the collection registry — every collection that
 * lands in lib/admin/collections.ts gets a sidebar entry automatically.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r-4 border-[#121212] bg-white">
      <div className="px-5 py-6 border-b-4 border-[#121212] bg-[#121212]">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50">
            Admin
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white">
            Dashboard
          </span>
        </Link>
      </div>
      <nav className="flex flex-col gap-0 px-3 py-4">
        <SidebarGroup label="Collections">
          {collections.map((c) => {
            const href = `/admin/${c.slug}`;
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={c.slug}
                href={href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-[11px] uppercase tracking-wider font-bold border-2 border-transparent transition-colors",
                  active
                    ? "bg-[#121212] text-white border-2 border-[#121212] border-l-4 border-l-[#F0C020] shadow-[3px_3px_0px_0px_#505050]"
                    : "text-[#808080] hover:text-[#121212] hover:bg-[#F0F0F0] hover:border-[#D0D0D0]"
                )}
              >
                {c.displayName}
              </Link>
            );
          })}
        </SidebarGroup>
      </nav>
    </aside>
  );
}

function SidebarGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0 mb-2">
      <div className="px-2 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#808080]">
        {label}
      </div>
      {children}
    </div>
  );
}
