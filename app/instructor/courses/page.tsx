"use client";

/**
 * Instructor → My Courses.
 *
 * FR-06: start a live session (US-C1)
 * FR-08: manage section materials (US-C3) — Materials button opens modal
 */

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMyCourses } from "@/lib/hooks/use-my-courses";
import { useSessions } from "@/lib/hooks/use-sessions";
import { UploadMaterialModal } from "@/components/lecture/upload-material-modal";
import { MaterialsModal } from "@/components/lecture/materials-modal";
import { uploadFileToSession, attachLibraryMaterialToSession, type LibraryMaterial } from "@/lib/hooks/use-session-materials";
import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { ApiErrorHandler } from "@/lib/api/error-handler";
import type { SessionPopulated } from "@/lib/types/session.types";

function sectionIdFromSession(s: SessionPopulated): string | null {
  if (!s.sectionId) return null;
  return typeof s.sectionId === "string" ? s.sectionId : s.sectionId._id;
}

export default function InstructorCoursesPage() {
  const router = useRouter();
  const { courses, loading, error } = useMyCourses();
  const { sessions: liveSessions, loading: liveLoading, startSession } = useSessions({ status: "live" });
  const [actionError, setActionError] = useState<string | null>(null);

  // Holds the section the instructor wants to start — modal shown before any API call.
  const [uploadState, setUploadState] = useState<{ sectionId: string; courseId: string } | null>(null);

  // Materials modal state: holds sectionDbId of the row being managed
  const [materialsSection, setMaterialsSection] = useState<{ sectionDbId: string; label: string } | null>(null);

  const liveBySection = useMemo(() => {
    const map = new Map<string, SessionPopulated>();
    for (const s of liveSessions) {
      const sid = sectionIdFromSession(s);
      if (sid) map.set(sid, s);
    }
    return map;
  }, [liveSessions]);

  // Show modal immediately — no API call until instructor chooses a file.
  const onStartClick = (sectionDbId: string, courseId: string | undefined) => {
    if (!courseId) return;
    setActionError(null);
    setUploadState({ sectionId: sectionDbId, courseId });
  };

  // Called by the modal only after the instructor has confirmed a file choice.
  // Either `file` (new upload) or `lib` (existing library item) is set.
  const handleStartSession = async (
    file: File | null,
    lib: LibraryMaterial | null,
    setProgress: (p: number) => void,
  ) => {
    if (!uploadState) return;

    let sessionId: string;
    try {
      const created = await startSession({ courseId: uploadState.courseId, sectionId: uploadState.sectionId });
      sessionId = created._id;
    } catch (err) {
      if (err instanceof ApiErrorHandler && err.status === 409 && uploadState.sectionId) {
        const existing = await apiClient.get<{ _id: string }[]>(
          `${API_ENDPOINTS.SESSIONS}?sectionId=${uploadState.sectionId}&status=live`,
        );
        const liveSession = existing.data?.[0];
        if (!liveSession?._id) throw new Error("Could not find the existing live session");
        sessionId = liveSession._id;
      } else {
        throw err;
      }
    }

    if (file) {
      await uploadFileToSession(sessionId, file, setProgress);
    } else if (lib) {
      await attachLibraryMaterialToSession(sessionId, lib._id);
    }
    setUploadState(null);
    router.push(`/instructor/sessions/${sessionId}/live`);
  };

  return (
    <>
      {/* File picker — shown before the session is created (pre-session mode). */}
      {uploadState && (
        <UploadMaterialModal
          sectionId={uploadState.sectionId}
          courseId={uploadState.courseId}
          onStart={handleStartSession}
          onCancel={() => setUploadState(null)}
        />
      )}

      {/* Materials management modal */}
      {materialsSection && (
        <MaterialsModal
          sectionId={materialsSection.sectionDbId}
          sectionLabel={materialsSection.label}
          mode="instructor"
          onClose={() => setMaterialsSection(null)}
        />
      )}

      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">My Courses</h1>
          <p className="nx-page-sub">Sections you teach this semester. Start a live session in one click.</p>
        </div>
      </div>

      {actionError && (
        <div className="nx-card" style={{ borderColor: "var(--nx-danger)" }}>
          <div className="nx-card-head">
            <div>
              <h3 className="nx-card-title" style={{ color: "var(--nx-danger)" }}>Couldn&apos;t start session</h3>
              <p className="nx-card-sub">{actionError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Assigned sections</h3>
            <p className="nx-card-sub">Each section can have at most one live session at a time.</p>
          </div>
          {!loading && !error && courses.length > 0 && (
            <span className="nx-filter-bar-count">{courses.length} assigned</span>
          )}
        </div>

        {loading ? (
          <div className="nx-empty"><span className="nx-spin" /></div>
        ) : error ? (
          <div className="nx-empty">
            <div className="nx-empty-title">Couldn&apos;t load courses</div>
            <div className="nx-empty-sub">{error}</div>
          </div>
        ) : courses.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">No assigned sections</div>
            <div className="nx-empty-sub">You haven&apos;t been assigned any sections yet.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Section</th>
                  <th scope="col">Enrolled</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const live = liveBySection.get(c.sectionDbId);
                  const sectionLabel = `${c.course?.code ?? "—"} · Section ${c.sectionId}`;
                  return (
                    <tr key={c.sectionDbId}>
                      <td>
                        <div className="nx-user-cell-name">
                          {c.course?.code ?? "—"} · {c.course?.name ?? "Unknown course"}
                        </div>
                      </td>
                      <td className="nx-tbl-mono">{c.sectionId}</td>
                      <td className="nx-tbl-mono">
                        {c.enrolledCount}{c.capacity != null ? ` / ${c.capacity}` : ""}
                      </td>
                      <td>
                        {liveLoading ? (
                          <span className="nx-badge"><span className="nx-badge-dot" />…</span>
                        ) : live ? (
                          <span className="nx-badge nx-role-student">
                            <span className="nx-badge-dot" />
                            Live now
                          </span>
                        ) : (
                          <span className="nx-badge">
                            <span className="nx-badge-dot" />
                            Idle
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button
                          className="nx-btn nx-btn-ghost"
                          onClick={() => setMaterialsSection({ sectionDbId: c.sectionDbId, label: sectionLabel })}
                        >
                          Materials
                        </button>
                        {live ? (
                          <Link href={`/instructor/sessions/${live._id}/live`} className="nx-btn nx-btn-primary">
                            Resume session
                          </Link>
                        ) : (
                          <button
                            className="nx-btn nx-btn-primary"
                            onClick={() => onStartClick(c.sectionDbId, c.course?._id)}
                            disabled={!c.course?._id}
                          >
                            Start session
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
