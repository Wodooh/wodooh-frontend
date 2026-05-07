"use client";

import { collections } from "@/lib/admin/collections";

/**
 * Admin landing — Bauhaus design system. Black-and-white geometric blocking:
 * KPI strip, quick actions, recent activity, and a single inverted black
 * system-status section. Sidebar lives in app/admin/layout.tsx.
 */
export default function AdminLandingPage() {
  const totalCollections = collections.length;
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-[#121212] -mx-8 -my-6">
      <section className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Running metadata header */}
        <p className="text-xs text-[#808080] mb-4 uppercase tracking-widest">
          Wodooh &middot; Office of the Registrar &middot; Admin Console &middot;
          Vol. 2026 &middot; Generated: {today}
        </p>

        {/* H1 */}
        <header className="border-b-4 border-[#121212] pb-6 mb-8">
          <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080] mb-2">
            Administration
          </p>
          <h1 className="text-8xl font-black uppercase tracking-tight text-[#121212]">
            Admin portal
          </h1>
          <p className="text-sm lg:text-base text-[#121212] mt-3 leading-relaxed max-w-3xl">
            Manage Firestore collections, onboard new accounts, and audit the
            running state of the platform through their typed APIs.
          </p>
        </header>

        {/* Row 1: KPI grid */}
        <h2 className="sr-only">Key metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 mb-12 border-4 border-[#121212] divide-x-0 lg:divide-x-4 lg:divide-[#121212]">
          <KpiStatCard
            label="Total Users"
            value="3,847"
            delta="+ 124 THIS WEEK"
            dotColor="green"
          />
          <KpiStatCard
            label="Pending Users"
            value="42"
            delta="AWAITING REVIEW"
            dotColor="amber"
          />
          <KpiStatCard
            label="Active Sessions"
            value="618"
            delta="LIVE NOW"
            dotColor="green"
          />
          <KpiStatCard
            label="Recent Signups"
            value="89"
            delta="LAST 24 HOURS"
            dotColor="green"
          />
        </div>

        {/* Section ornament */}
        <div className="py-2 text-center text-xs text-[#808080] tracking-[1em] uppercase">
          &middot; &middot; &middot; &middot; &middot;
        </div>

        {/* Row 2: Quick Actions */}
        <section
          aria-labelledby="quick-actions-heading"
          className="border-4 border-[#121212] bg-[#F0F0F0] p-6 mb-12"
        >
          <div className="flex items-baseline justify-between border-b-4 border-[#121212] pb-4 mb-6">
            <h2
              id="quick-actions-heading"
              className="font-black text-2xl lg:text-3xl uppercase tracking-tight"
            >
              Quick actions
            </h2>
            <span className="bg-[#121212] text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
              {totalCollections} Collection{totalCollections === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <a
              href="/admin/users/new"
              className="bg-[#121212] text-white border-4 border-[#121212] font-black uppercase tracking-widest text-xs px-6 py-4 hover:bg-[#F0F0F0] hover:text-[#121212] transition-all duration-200 min-h-[48px] flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2"
            >
              Create user
            </a>
            <a
              href="/admin/users"
              className="border-4 border-[#121212] text-[#121212] font-black uppercase tracking-widest text-xs px-6 py-4 hover:bg-[#121212] hover:text-white transition-all duration-200 min-h-[48px] flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2"
            >
              Manage users
            </a>
            <a
              href="/admin/onboarding"
              className="border-4 border-[#121212] text-[#121212] font-black uppercase tracking-widest text-xs px-6 py-4 hover:bg-[#121212] hover:text-white transition-all duration-200 min-h-[48px] flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2"
            >
              Onboarding queue
            </a>
            <a
              href="/admin/settings"
              className="border-4 border-[#121212] text-[#121212] font-black uppercase tracking-widest text-xs px-6 py-4 hover:bg-[#121212] hover:text-white transition-all duration-200 min-h-[48px] flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2"
            >
              System settings
            </a>
          </div>

          {/* Collection discovery cards */}
          <div className="mt-8 pt-6 border-t-4 border-[#121212]">
            <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080] mb-4">
              Registered collections
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((c) => (
                <a
                  key={c.slug}
                  href={`/admin/${c.slug}`}
                  className="border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] bg-white p-5 hard-shadow-hover transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2 block group"
                >
                  <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080]">
                    Collection
                  </p>
                  <h3 className="text-lg lg:text-xl font-black uppercase mt-1 group-hover:underline underline-offset-2">
                    {c.displayName}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2 border-t-4 border-[#121212] pt-3">
                    <span className="border-4 border-[#121212] text-xs px-2 py-0.5 uppercase tracking-wide bg-white font-black">
                      {c.columns.length} col
                    </span>
                    <span className="bg-[#121212] text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                      ↑ {String(c.defaultSort.field)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Row 3: Recent Activity table */}
        <section aria-labelledby="recent-activity-heading" className="mb-12">
          <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080] mb-4">
            Wodooh &middot; Audit Log &middot; Spring 2026 &middot; Last 24
            Hours
          </p>
          <h2
            id="recent-activity-heading"
            className="font-black text-2xl lg:text-3xl uppercase tracking-tight mb-4"
          >
            Recent activity
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse border-4 border-[#121212] text-sm">
              <thead>
                <tr className="bg-[#121212] text-white">
                  <th
                    scope="col"
                    className="border-4 border-[#121212] px-4 py-3 text-left uppercase tracking-widest text-[10px] font-black"
                  >
                    Timestamp
                  </th>
                  <th
                    scope="col"
                    className="border-4 border-[#121212] px-4 py-3 text-left uppercase tracking-widest text-[10px] font-black"
                  >
                    Actor
                  </th>
                  <th
                    scope="col"
                    className="border-4 border-[#121212] px-4 py-3 text-left uppercase tracking-widest text-[10px] font-black"
                  >
                    Action
                  </th>
                  <th
                    scope="col"
                    className="border-4 border-[#121212] px-4 py-3 text-left uppercase tracking-widest text-[10px] font-black"
                  >
                    Target
                  </th>
                  <th
                    scope="col"
                    className="border-4 border-[#121212] px-4 py-3 text-left uppercase tracking-widest text-[10px] font-black"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                <ActivityRow
                  ts="03 May 2026 09:42:11"
                  actor="admin@wodooh.com"
                  action="USER.ROLE.UPDATE"
                  target="2024-CS-0041"
                  status="ok"
                  index={0}
                />
                <ActivityRow
                  ts="03 May 2026 09:31:04"
                  actor="admin@wodooh.com"
                  action="USER.CREATE"
                  target="m.alharbi@wodooh.com"
                  status="ok"
                  index={1}
                />
                <ActivityRow
                  ts="03 May 2026 08:58:37"
                  actor="system"
                  action="ONBOARDING.QUEUE.FLUSH"
                  target="batch-2026-05-03-a"
                  status="pending"
                  index={2}
                />
                <ActivityRow
                  ts="03 May 2026 08:12:55"
                  actor="admin@wodooh.com"
                  action="USER.DEACTIVATE"
                  target="2023-EE-0118"
                  status="ok"
                  index={3}
                />
                <ActivityRow
                  ts="02 May 2026 23:04:18"
                  actor="system"
                  action="FIRESTORE.HEALTHCHECK"
                  target="us-central1"
                  status="fail"
                  index={4}
                />
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {/* Inverted black section: System Status — exactly one per dashboard */}
      <section
        aria-labelledby="system-status-heading"
        className="bg-[#121212] text-white py-12 px-6 relative"
      >
        <div className="max-w-screen-xl mx-auto">
          <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080] mb-3">
            Operations &middot; Live Status &middot; Updated {today} 09:42 UTC
          </p>
          <h2
            id="system-status-heading"
            className="font-black text-3xl lg:text-5xl uppercase tracking-tight mb-8"
          >
            System status
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-4 border-[#333]">
            <InvertedStat
              label="API Uptime"
              value="99.98%"
              note="30-DAY ROLLING"
            />
            <InvertedStat
              label="Firestore Latency"
              value="42ms"
              note="P95 READS"
            />
            <InvertedStat
              label="Active Tokens"
              value="618"
              note="JWT 1H TTL"
            />
            <InvertedStat
              label="Failed Logins"
              value="07"
              note="LAST 60 MIN"
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <span
              role="status"
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 uppercase tracking-wide bg-[#1040C0] text-white border-4 border-[#1040C0] font-black"
            >
              <span className="w-1.5 h-1.5 shrink-0 bg-white" />
              Auth: operational
            </span>
            <span
              role="status"
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 uppercase tracking-wide bg-[#1040C0] text-white border-4 border-[#1040C0] font-black"
            >
              <span className="w-1.5 h-1.5 shrink-0 bg-white" />
              Firestore: operational
            </span>
            <span
              role="status"
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 uppercase tracking-wide bg-[#F0C020] text-[#121212] border-4 border-[#F0C020] font-black"
            >
              <span className="w-1.5 h-1.5 shrink-0 bg-[#121212]" />
              Mail relay: degraded
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type DotColor = "green" | "amber" | "red";

const dotColorMap: Record<DotColor, string> = {
  green: "bg-[#1040C0]",
  amber: "bg-[#808080]",
  red: "bg-[#D02020]",
};

function KpiStatCard({
  label,
  value,
  delta,
  dotColor,
}: {
  label: string;
  value: string;
  delta: string;
  dotColor: DotColor;
}) {
  return (
    <div className="border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] bg-white p-6 relative border-t-4 lg:border-t-0 first:border-t-4 transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0px_0px_#121212]">
      <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080] mb-1">
        {label}
      </p>
      <p className="text-6xl font-black tracking-tight leading-none">{value}</p>
      <p className="text-xs text-[#121212] mt-3 uppercase tracking-widest flex items-center gap-1.5 font-bold">
        <span
          className={`w-1.5 h-1.5 shrink-0 ${dotColorMap[dotColor]}`}
        />
        {delta}
      </p>
    </div>
  );
}

function ActivityRow({
  ts,
  actor,
  action,
  target,
  status,
  index,
}: {
  ts: string;
  actor: string;
  action: string;
  target: string;
  status: "ok" | "pending" | "fail";
  index: number;
}) {
  const statusStyles =
    status === "ok"
      ? "bg-[#1040C0] text-white border-[#1040C0]"
      : status === "pending"
        ? "bg-[#F0C020] text-[#121212] border-[#F0C020]"
        : "bg-[#D02020] text-white border-[#D02020]";
  const statusLabel =
    status === "ok" ? "Success" : status === "pending" ? "Pending" : "Failed";
  const rowBg = index % 2 === 1 ? "bg-[#F0F0F0]" : "bg-white";
  return (
    <tr className={`${rowBg} hover:bg-[#E8E8E8] transition-colors duration-150`}>
      <td className="border-4 border-[#121212] px-4 py-3 text-xs font-mono">
        {ts}
      </td>
      <td className="border-4 border-[#121212] px-4 py-3 text-xs font-mono">
        {actor}
      </td>
      <td className="border-4 border-[#121212] px-4 py-3 text-xs font-mono">
        <span className="border-4 border-[#121212] text-xs px-2 py-0.5 uppercase tracking-wide font-black">
          {action}
        </span>
      </td>
      <td className="border-4 border-[#121212] px-4 py-3 text-xs font-mono">
        {target}
      </td>
      <td className="border-4 border-[#121212] px-4 py-3">
        <span
          className={`text-xs px-2 py-0.5 uppercase tracking-wide border-4 font-black ${statusStyles}`}
        >
          {statusLabel}
        </span>
      </td>
    </tr>
  );
}

function InvertedStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="p-6 border-[#333] border-t-4 sm:border-t-0 sm:border-l-4 first:border-l-0 first:border-t-0">
      <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080] mb-1">
        {label}
      </p>
      <p className="text-5xl font-black tracking-tight leading-none text-white">
        {value}
      </p>
      <p className="text-xs text-[#808080] mt-3 uppercase tracking-widest font-bold">
        {note}
      </p>
    </div>
  );
}
