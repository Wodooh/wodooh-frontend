"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChairmanStudents, useDeanonymize } from "@/lib/hooks/use-chairman";

interface RevealTarget {
  anonymousCourseId: string;
  courseCode?: string;
}

export default function ChairmanStudentsPage() {
  const search = useSearchParams();
  const { data: groups, loading, error } = useChairmanStudents();

  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [target, setTarget] = useState<RevealTarget | null>(null);
  const [justification, setJustification] = useState("");
  const { data: revealed, loading: revealing, error: revealError, run: doReveal, reset } = useDeanonymize();
  const [manualId, setManualId] = useState("");

  // Default-open the first course once data loads.
  useEffect(() => {
    if (!openCourse && groups.length > 0) {
      setOpenCourse(groups[0].courseId);
    }
  }, [groups, openCourse]);

  // Auto-open reveal modal when ?anonymousCourseId=… is set (alerts deep-link).
  const deepLinkId = search?.get("anonymousCourseId");
  const courseByAnon = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) {
      for (const s of g.students) m.set(s.anonymousCourseId, g.courseCode);
    }
    return m;
  }, [groups]);

  useEffect(() => {
    if (deepLinkId && !target) {
      setTarget({ anonymousCourseId: deepLinkId, courseCode: courseByAnon.get(deepLinkId) });
    }
  }, [deepLinkId, courseByAnon, target]);

  const closeModal = () => {
    if (revealing) return;
    setTarget(null);
    setJustification("");
    reset();
  };

  const trimmed = justification.trim();
  const canReveal = trimmed.length >= 10 && !revealing;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target || !canReveal) return;
    try {
      await doReveal({ anonymousCourseId: target.anonymousCourseId, justification: trimmed });
    } catch {
      /* surfaced via hook state */
    }
  }

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Students</h1>
          <p className="nx-page-sub">
            Anonymous roster grouped by course — names and emails are revealed only through the audited de-anonymize flow.
          </p>
        </div>
      </div>

      {error ? <div className="nx-card" style={{ padding: 16, color: "var(--nx-danger)" }}>{error}</div> : null}

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Manual lookup</h3>
            <p className="nx-card-sub">Paste an anonymous course ID (e.g. from an alert) to reveal its student.</p>
          </div>
        </div>
        <form
          style={{ display: "flex", gap: 8, padding: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (manualId.trim()) {
              setTarget({ anonymousCourseId: manualId.trim(), courseCode: courseByAnon.get(manualId.trim()) });
              setManualId("");
            }
          }}
        >
          <input
            className="nx-input"
            type="text"
            placeholder="anonymousCourseId…"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            style={{ flex: 1, maxWidth: 360 }}
          />
          <button className="nx-btn" type="submit" disabled={!manualId.trim()}>Reveal identity</button>
        </form>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Roster by course</h3>
            <p className="nx-card-sub">
              {loading
                ? "Loading…"
                : groups.length === 0
                  ? "No courses in this department."
                  : `${groups.length} course${groups.length === 1 ? "" : "s"} · ${groups.reduce((n, g) => n + g.studentCount, 0)} (student × course) pair${groups.reduce((n, g) => n + g.studentCount, 0) === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div style={{ padding: "0 0 4px" }}>
          {groups.map(g => {
            const open = openCourse === g.courseId;
            return (
              <div key={g.courseId} style={{ borderBottom: "1px solid var(--nx-border)" }}>
                <button
                  type="button"
                  onClick={() => setOpenCourse(open ? null : g.courseId)}
                  aria-expanded={open}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    color: "var(--nx-fg)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="nx-version-pill">{g.courseCode}</span>
                    <span style={{ fontWeight: 500 }}>{g.courseName}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 16, color: "var(--nx-fg-muted)" }}>
                    <span className="nx-tbl-mono">
                      {g.studentCount} student{g.studentCount === 1 ? "" : "s"}
                    </span>
                    <span style={{ width: 12, transition: "transform 150ms", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </span>
                  </span>
                </button>
                {open && (
                  <div className="nx-tbl-wrap" style={{ background: "var(--nx-bg-sub)" }}>
                    <table className="nx-tbl">
                      <thead>
                        <tr>
                          <th scope="col" style={{ paddingLeft: 32 }}>Anonymous ID</th>
                          <th scope="col">Sections in this course</th>
                          <th scope="col" style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.students.length === 0 ? (
                          <tr><td colSpan={3} style={{ color: "var(--nx-fg-muted)", paddingLeft: 32 }}>No students enrolled.</td></tr>
                        ) : g.students.map(s => (
                          <tr key={s.anonymousCourseId}>
                            <td className="nx-tbl-mono" style={{ paddingLeft: 32 }}>{s.anonymousCourseId}</td>
                            <td className="nx-tbl-mono">{s.sectionCount}</td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                className="nx-btn nx-btn-ghost"
                                onClick={() => setTarget({ anonymousCourseId: s.anonymousCourseId, courseCode: g.courseCode })}
                              >
                                Reveal identity
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {target && (
        <div className="nx-modal-backdrop" onClick={closeModal}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">Reveal identity</h3>
            </div>
            <div className="nx-modal-body">
              <p style={{ margin: 0, fontSize: 13, color: "var(--nx-fg-muted)" }}>
                Reveals the student behind <strong style={{ color: "var(--nx-fg)" }} className="nx-tbl-mono">{target.anonymousCourseId}</strong>
                {target.courseCode ? <> in <strong style={{ color: "var(--nx-fg)" }}>{target.courseCode}</strong></> : null}.
                Every lookup is logged to the audit trail.
              </p>

              {!revealed ? (
                <form onSubmit={submit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="nx-field-label">Justification (≥ 10 characters · {trimmed.length})</span>
                    <textarea
                      className="nx-input"
                      rows={4}
                      value={justification}
                      onChange={(e) => { setJustification(e.target.value); }}
                      required
                      autoFocus
                      placeholder="e.g. Absence threshold review per committee policy."
                    />
                  </label>
                  {revealError ? (
                    <div style={{ color: "var(--nx-danger)", fontSize: 13 }}>{revealError}</div>
                  ) : null}
                </form>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      background: "color-mix(in srgb, var(--nx-warning) 12%, transparent)",
                      color: "var(--nx-warning)",
                      border: "1px solid var(--nx-warning)",
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      marginBottom: 12,
                    }}
                  >
                    This action was logged to the audit trail (entry {revealed.auditEntryId}).
                  </div>
                  <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, fontSize: 13 }}>
                    <dt style={{ color: "var(--nx-fg-muted)" }}>Name</dt><dd>{revealed.name}</dd>
                    <dt style={{ color: "var(--nx-fg-muted)" }}>Email</dt><dd className="nx-tbl-mono">{revealed.email}</dd>
                    <dt style={{ color: "var(--nx-fg-muted)" }}>Student ID</dt><dd className="nx-tbl-mono">{revealed.studentId}</dd>
                  </dl>
                </div>
              )}
            </div>
            <div className="nx-modal-foot">
              <button className="nx-btn nx-btn-ghost" onClick={closeModal} disabled={revealing}>
                {revealed ? "Close" : "Cancel"}
              </button>
              {!revealed ? (
                <button className="nx-btn nx-btn-primary" disabled={!canReveal} onClick={submit}>
                  {revealing ? <><span className="nx-spin" /> Revealing…</> : "Reveal"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
