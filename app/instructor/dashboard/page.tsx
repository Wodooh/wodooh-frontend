"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-provider";
import { useMyCourses, type MyCourseEntry } from "@/lib/hooks/use-my-courses";
import { useMySessions } from "@/lib/hooks/use-my-sessions";
import { UploadMaterialModal } from "@/components/lecture/upload-material-modal";
import { uploadFileToSession, attachLibraryMaterialToSession } from "@/lib/hooks/use-session-materials";
import type { LibraryMaterial } from "@/lib/hooks/use-session-materials";
import { displayFirstName, timeGreeting } from "@/lib/utils";

function formatSessionStarted(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, today)) return `Today · ${time}`;
  if (sameDay(d, yesterday)) return `Yesterday · ${time}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ` · ${time}`;
}

// Sessions whose `startedAt` lies within the last 7 days (inclusive of now).
function isThisWeek(iso: string): boolean {
  const startedAt = new Date(iso).getTime();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return startedAt >= weekAgo;
}

export default function InstructorDashboardPage() {
  const { user } = useAuth();
  const { courses, loading: coursesLoading, error: coursesError } = useMyCourses();
  const { sessions, loading: sessionsLoading } = useMySessions();
  const router = useRouter();
  const [pendingEntry, setPendingEntry] = useState<MyCourseEntry | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const now = new Date();
  const today = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const greeting = timeGreeting(now.getHours());
  const firstName = displayFirstName(user);

  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);
  const sessionsThisWeek = useMemo(
    () => sessions.filter(s => isThisWeek(s.startedAt)).length,
    [sessions],
  );
  // First-time empty state — instructor has never run a session and has at
  // least one assigned section. Without sections, we show the no-sections
  // empty state instead.
  const isFirstTimeInstructor =
    !sessionsLoading && sessions.length === 0 && courses.length > 0;

  const handleStartClick = (entry: MyCourseEntry) => {
    if (!entry.course) return;
    setPendingEntry(entry);
    setPickerOpen(false);
  };

  // Called by the modal only after the instructor has chosen a file.
  // Either `file` (new upload) or `lib` (existing library item) is set.
  const handleStartSession = async (
    file: File | null,
    lib: LibraryMaterial | null,
    setProgress: (p: number) => void,
  ) => {
    if (!pendingEntry?.course) return;
    const res = await apiClient.post<{ _id: string }>(API_ENDPOINTS.SESSIONS, {
      courseId: pendingEntry.course._id,
      sectionId: pendingEntry.sectionDbId,
    });
    if (res.status !== "success" || !res.data?._id) {
      throw new Error(res.message || "Failed to start session");
    }
    const sessionId = res.data._id;
    if (file) {
      await uploadFileToSession(sessionId, file, setProgress);
    } else if (lib) {
      await attachLibraryMaterialToSession(sessionId, lib._id);
    }
    setPendingEntry(null);
    router.push(`/instructor/sessions/${sessionId}/live`);
  };

  return (
    <>
      {pendingEntry && (
        <UploadMaterialModal
          sectionId={pendingEntry.sectionDbId}
          courseId={pendingEntry.course?._id}
          onStart={handleStartSession}
          onCancel={() => setPendingEntry(null)}
        />
      )}

      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">{greeting}, {firstName}</h1>
          <p className="nx-page-sub">{today}</p>
        </div>
      </div>

      {/* Hero — Start a session. Affordance shape depends on section count. */}
      {!coursesLoading && !coursesError && courses.length > 0 && (
        <StartSessionHero
          courses={courses}
          onStart={handleStartClick}
          isFirstTime={isFirstTimeInstructor}
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
        />
      )}

      {/* Empty state: only when the instructor has no assigned sections at all. */}
      {!coursesLoading && !coursesError && courses.length === 0 && (
        <div className="nx-card">
          <div className="nx-empty">
            <div className="nx-empty-title">No assigned sections</div>
            <div className="nx-empty-sub">You haven&apos;t been assigned any sections yet. Contact your administrator if this is unexpected.</div>
          </div>
        </div>
      )}

      {coursesError && (
        <div className="nx-card">
          <div className="nx-empty">
            <div className="nx-empty-title">Couldn&apos;t load your sections</div>
            <div className="nx-empty-sub">{coursesError}</div>
          </div>
        </div>
      )}

      {/* Two-up: Recent sessions + This week counter. Only renders when there
          is at least one past session — first-time state is owned by the hero. */}
      {!sessionsLoading && sessions.length > 0 && (
        <div className="nx-dash-two-up">
          <div className="nx-card">
            <div className="nx-card-head">
              <div>
                <h3 className="nx-card-title">Recent sessions</h3>
                <p className="nx-card-sub">Your last {Math.min(5, sessions.length)} session{sessions.length === 1 ? "" : "s"}</p>
              </div>
            </div>
            <div className="nx-tbl-wrap">
              <table className="nx-tbl">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Course</th>
                    <th scope="col">Section</th>
                    <th scope="col" style={{ textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map(s => (
                    <tr key={s._id}>
                      <td>{formatSessionStarted(s.startedAt)}</td>
                      <td>
                        <div className="nx-user-cell-name">
                          {s.courseId?.code ?? "—"} · {s.courseId?.name ?? "Unknown course"}
                        </div>
                      </td>
                      <td className="nx-tbl-mono">{s.sectionId?.sectionId ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          className="nx-btn nx-btn-ghost"
                          href={`/instructor/reports?sessionId=${s._id}`}
                        >
                          View report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="nx-card nx-stat-card">
            <div className="nx-card-head">
              <div>
                <h3 className="nx-card-title">This week</h3>
                <p className="nx-card-sub">Sessions started in the last 7 days</p>
              </div>
            </div>
            <div className="nx-stat-card-body">
              <div className="nx-stat-card-value">{sessionsThisWeek}</div>
              <div className="nx-stat-card-label">
                {sessionsThisWeek === 1 ? "session" : "sessions"}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hero variant by section count:
//   - 1 section  → a single primary button.
//   - 2–5         → inline segmented buttons.
//   - 6+          → dropdown trigger that reveals the full list.
// First-time copy ("Start your first session") overrides the title when the
// instructor has never run a session.
function StartSessionHero({
  courses,
  onStart,
  isFirstTime,
  pickerOpen,
  setPickerOpen,
}: {
  courses: MyCourseEntry[];
  onStart: (entry: MyCourseEntry) => void;
  isFirstTime: boolean;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
}) {
  const startable = courses.filter(c => c.course?._id);
  if (startable.length === 0) return null;

  const title = isFirstTime ? "Start your first session" : "Start a session";
  const sub = isFirstTime
    ? "Pick a section and you’re live — students join with one click."
    : "Open a live session for one of your sections.";

  return (
    <div className="nx-card nx-hero-card">
      <div className="nx-card-head">
        <div>
          <h3 className="nx-card-title">{title}</h3>
          <p className="nx-card-sub">{sub}</p>
        </div>
      </div>
      <div className="nx-hero-body">
        {startable.length === 1 ? (
          <button
            className="nx-btn nx-btn-primary nx-btn-lg"
            onClick={() => onStart(startable[0])}
          >
            Start session · {startable[0].course?.code} · {startable[0].sectionId}
          </button>
        ) : startable.length <= 5 ? (
          <div className="nx-hero-section-grid">
            {startable.map(entry => (
              <button
                key={entry.sectionDbId}
                className="nx-btn nx-btn-primary"
                onClick={() => onStart(entry)}
              >
                {entry.course?.code} · {entry.sectionId}
              </button>
            ))}
          </div>
        ) : (
          <div className="nx-hero-dropdown">
            <button
              className="nx-btn nx-btn-primary nx-btn-lg"
              onClick={() => setPickerOpen(!pickerOpen)}
              aria-expanded={pickerOpen}
            >
              Start session · pick a section ({startable.length})
            </button>
            {pickerOpen && (
              <ul className="nx-hero-dropdown-menu" role="menu">
                {startable.map(entry => (
                  <li key={entry.sectionDbId}>
                    <button
                      className="nx-hero-dropdown-item"
                      onClick={() => onStart(entry)}
                      role="menuitem"
                    >
                      <span>{entry.course?.code} · {entry.course?.name}</span>
                      <span className="nx-tbl-mono">{entry.sectionId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
