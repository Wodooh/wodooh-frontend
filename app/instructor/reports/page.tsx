"use client";

/**
 * Instructor → Reports.
 *
 * Backlog: US-E1 / FR-20 — instructor generates a Student Engagement Report
 * for a specific session ("Generate Session Engagement Report" use case).
 *
 * The backend does not yet expose an aggregated report endpoint, so this
 * page composes its summary client-side from the data the API already
 * returns: session metadata (`GET /sessions?instructorId=`) plus per-session
 * question feed (`GET /questions?sessionId=`). When the backend report
 * endpoint lands, replace `useSessions` + `useSessionQuestions` with a
 * `useSessionReport(sessionId)` hook.
 */

import React, { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { useSessions } from "@/lib/hooks/use-sessions";
import { useSessionQuestions } from "@/lib/hooks/use-session-questions";
import type { SessionPopulated } from "@/lib/types/session.types";

function courseLabel(s: SessionPopulated): string {
  if (!s.courseId || typeof s.courseId === "string") return "Course";
  return `${s.courseId.code ?? ""} · ${s.courseId.name ?? ""}`.trim();
}

function sectionLabel(s: SessionPopulated): string {
  if (!s.sectionId || typeof s.sectionId === "string") return "—";
  return String(s.sectionId.sectionId);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationMinutes(startIso: string, endIso?: string): number {
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  return Math.max(0, Math.floor((end - new Date(startIso).getTime()) / 60000));
}

function durationFmt(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function InstructorReportsPage() {
  return (
    <Suspense fallback={<div className="nx-empty"><span className="nx-spin" /></div>}>
      <ReportsBody />
    </Suspense>
  );
}

function ReportsBody() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const selectedId = params.get("sessionId");

  const { sessions, loading, error } = useSessions(
    user?._id ? { instructorId: user._id } : {},
  );

  const ended = useMemo(
    () => sessions.filter((s) => s.status === "ended"),
    [sessions],
  );

  const selected = useMemo(
    () => sessions.find((s) => s._id === selectedId) ?? null,
    [sessions, selectedId],
  );

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Reports</h1>
          <p className="nx-page-sub">Engagement reports for each session you&apos;ve run.</p>
        </div>
        {selected && (
          <button
            className="nx-btn nx-btn-ghost"
            onClick={() => router.push("/instructor/reports")}
          >
            Back to all reports
          </button>
        )}
      </div>

      {selected ? (
        <SessionReportCard session={selected} />
      ) : loading ? (
        <div className="nx-empty"><span className="nx-spin" /></div>
      ) : error ? (
        <div className="nx-empty">
          <div className="nx-empty-title">Couldn&apos;t load sessions</div>
          <div className="nx-empty-sub">{error}</div>
        </div>
      ) : (
        <div className="nx-card">
          <div className="nx-card-head">
            <div>
              <h3 className="nx-card-title">Ended sessions</h3>
              <p className="nx-card-sub">Pick a session to see its engagement report.</p>
            </div>
            <span className="nx-filter-bar-count">{ended.length} total</span>
          </div>
          {ended.length === 0 ? (
            <div className="nx-empty">
              <div className="nx-empty-title">No reports yet</div>
              <div className="nx-empty-sub">Reports are generated when you end a session.</div>
            </div>
          ) : (
            <div className="nx-tbl-wrap">
              <table className="nx-tbl">
                <thead>
                  <tr>
                    <th scope="col">Course</th>
                    <th scope="col">Section</th>
                    <th scope="col">Ended</th>
                    <th scope="col">Duration</th>
                    <th scope="col" style={{ textAlign: "right" }}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {ended.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <div className="nx-user-cell-name">{courseLabel(s)}</div>
                      </td>
                      <td className="nx-tbl-mono">{sectionLabel(s)}</td>
                      <td className="nx-tbl-mono">
                        {s.endedAt ? formatDateTime(s.endedAt) : "—"}
                      </td>
                      <td className="nx-tbl-mono">
                        {durationFmt(durationMinutes(s.startedAt, s.endedAt))}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/instructor/reports?sessionId=${s._id}`}
                          className="nx-btn nx-btn-primary"
                        >
                          Open report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function SessionReportCard({ session }: { session: SessionPopulated }) {
  const { questions, loading, error } = useSessionQuestions(session._id);
  const mins = durationMinutes(session.startedAt, session.endedAt);

  const visibleQuestions = useMemo(
    () => questions.filter((q) => q.visibilityStatus === "visible"),
    [questions],
  );
  const hiddenCount = questions.length - visibleQuestions.length;
  const resolvedCount = useMemo(
    () => questions.filter((q) => q.postSessionStatus === "resolved").length,
    [questions],
  );
  const uniqueAuthors = useMemo(
    () => new Set(questions.map((q) => q.authorAnonymousCourseId)).size,
    [questions],
  );

  return (
    <>
      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">
              {courseLabel(session)} · Section {sectionLabel(session)}
            </h3>
            <p className="nx-card-sub">
              {session.status === "ended" && session.endedAt
                ? `Ended ${formatDateTime(session.endedAt)} · ran ${durationFmt(mins)}`
                : `Started ${formatDateTime(session.startedAt)} · still running`}
            </p>
          </div>
          <span className={`nx-badge ${session.status === "ended" ? "nx-role-instructor" : "nx-role-student"}`}>
            <span className="nx-badge-dot" />
            {session.status === "ended" ? "Ended" : "Live"}
          </span>
        </div>

        <div className="nx-kpi-strip" style={{ padding: "0 20px 20px" }}>
          <KPI label="Duration" value={durationFmt(mins)} />
          <KPI label="Questions" value={loading ? "…" : String(questions.length)} />
          <KPI label="Unique authors" value={loading ? "…" : String(uniqueAuthors)} />
          <KPI label="Resolved" value={loading ? "…" : `${resolvedCount} / ${questions.length || 0}`} />
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Question feed</h3>
            <p className="nx-card-sub">
              Anonymous questions submitted during the session
              {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}
            </p>
          </div>
          {!loading && !error && (
            <span className="nx-filter-bar-count">{questions.length} total</span>
          )}
        </div>

        {loading ? (
          <div className="nx-empty"><span className="nx-spin" /></div>
        ) : error ? (
          <div className="nx-empty">
            <div className="nx-empty-title">Couldn&apos;t load questions</div>
            <div className="nx-empty-sub">{error}</div>
          </div>
        ) : questions.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">No questions submitted</div>
            <div className="nx-empty-sub">No students sent questions during this session.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Author</th>
                  <th scope="col">Question</th>
                  <th scope="col">Visibility</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q._id}>
                    <td className="nx-tbl-mono">
                      {new Date(q.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="nx-tbl-mono">{q.authorAnonymousCourseId.slice(0, 8)}</td>
                    <td>{q.content}</td>
                    <td>
                      <span className={`nx-badge ${q.visibilityStatus === "hidden" ? "" : "nx-role-student"}`}>
                        <span className="nx-badge-dot" />
                        {q.visibilityStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`nx-badge ${q.postSessionStatus === "resolved" ? "nx-role-instructor" : ""}`}>
                        <span className="nx-badge-dot" />
                        {q.postSessionStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="nx-kpi">
      <p className="nx-kpi-label">{label}</p>
      <div className="nx-kpi-value">{value}</div>
    </div>
  );
}
