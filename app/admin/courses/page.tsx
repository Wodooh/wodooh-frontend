"use client";

import React, { useState, useEffect } from "react";
import { useCourses } from "@/lib/hooks/use-courses";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useSections } from "@/lib/hooks/use-sections";
import type { Course, CreateCourseRequest, Section } from "@/lib/types/course.types";

const EMPTY_COURSE: CreateCourseRequest = { name: "", code: "", description: "", departmentId: "", credits: undefined };

// dept sorted by createdAt index (0-based) → first digit = index + 1
// e.g. dept[0] → 10001–19999, dept[1] → 20001–29999
function genSectionId(deptIndex: number): number {
  return (deptIndex + 1) * 10000 + Math.floor(Math.random() * 9999) + 1;
}

// ─── Capacity bar ─────────────────────────────────────────────────────────
function CapBar({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, (enrolled / capacity) * 100) : 0;
  const fill = pct >= 100 ? "var(--nx-danger)" : pct >= 75 ? "var(--nx-warning)" : "var(--nx-success)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--nx-fg-muted)", fontVariantNumeric: "tabular-nums" }}>
      <div style={{ width: 60, height: 4, background: "var(--nx-bg-active)", borderRadius: 999, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: fill }} />
      </div>
      <span>{enrolled}/{capacity}</span>
    </div>
  );
}

// ─── Sections panel (rendered when course row is expanded) ─────────────────
function SectionsPanel({
  course,
  deptIndex,
  onToast,
}: {
  course: Course;
  deptIndex: number;
  onToast: (t: { kind: "success" | "error"; msg: string }) => void;
}) {
  const { sections, loading, error, createSection, deleteSection } = useSections(course._id);
  const [addOpen, setAddOpen] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);

  const openAdd = () => { setCapacity(""); setFormError(null); setAddOpen(true); };
  const closeAdd = () => { if (!saving) setAddOpen(false); };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cap = Number(capacity);
    if (!capacity || cap < 1) { setFormError("Capacity must be at least 1."); return; }
    setSaving(true);
    setFormError(null);
    try {
      const sec = await createSection({ sectionId: genSectionId(deptIndex), capacity: cap });
      setAddOpen(false);
      onToast({ kind: "success", msg: `Section ${sec.sectionId} added.` });
    } catch (err: unknown) {
      setFormError((err as Error)?.message || "Failed to create section.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteSection(deleteTarget._id);
      onToast({ kind: "success", msg: `Section ${deleteTarget.sectionId} deleted.` });
      setDeleteTarget(null);
    } catch (err: unknown) {
      onToast({ kind: "error", msg: (err as Error)?.message || "Failed to delete section." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{
        background: "var(--nx-bg-sub)",
        padding: "4px 16px 16px 58px",
        borderTop: "1px solid var(--nx-border)",
      }}>
        {loading ? (
          <div style={{ padding: "14px 0", fontSize: 13, color: "var(--nx-fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="nx-spin" />Loading sections…
          </div>
        ) : error ? (
          <div style={{ padding: "14px 0", fontSize: 13, color: "var(--nx-danger)" }}>{error}</div>
        ) : (
          <>
            {sections.length === 0 && (
              <div style={{ padding: "12px 0 4px", fontSize: 12.5, color: "var(--nx-fg-subtle)", fontStyle: "italic" }}>
                No sections yet — add one below.
              </div>
            )}
            {sections.map(sec => (
              <div key={sec._id} style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 180px auto",
                gap: 14,
                alignItems: "center",
                padding: "9px 12px",
                background: "var(--nx-bg-elev)",
                border: "1px solid var(--nx-border)",
                borderRadius: 6,
                marginTop: 8,
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: "var(--nx-fg)" }}>
                  {sec.sectionId}
                </span>
                <span style={{
                  fontSize: 13,
                  color: sec.instructorId ? "var(--nx-fg)" : "var(--nx-fg-subtle)",
                  fontStyle: sec.instructorId ? "normal" : "italic",
                }}>
                  {sec.instructorId ? sec.instructorId : "No instructor assigned"}
                </span>
                <CapBar enrolled={sec.enrolledCount ?? 0} capacity={sec.capacity} />
                <button
                  className="nx-btn nx-btn-ghost"
                  style={{ fontSize: 12, color: "var(--nx-danger)" }}
                  onClick={() => setDeleteTarget(sec)}
                >
                  Delete
                </button>
              </div>
            ))}

            {/* Add section row */}
            <div
              role="button"
              tabIndex={0}
              onClick={openAdd}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openAdd(); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 8,
                padding: "10px 12px",
                border: "1px dashed var(--nx-border-strong)",
                borderRadius: 6,
                color: "var(--nx-fg-muted)",
                fontSize: 12.5,
                cursor: "pointer",
                userSelect: "none",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--nx-bg-hover)"; (e.currentTarget as HTMLDivElement).style.color = "var(--nx-fg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ""; (e.currentTarget as HTMLDivElement).style.color = "var(--nx-fg-muted)"; }}
            >
              + Add section
            </div>
          </>
        )}
      </div>

      {/* Add section modal */}
      {addOpen && (
        <div className="nx-modal-backdrop" onClick={closeAdd}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">Add section — {course.name}</h3>
            </div>
            <form onSubmit={submitAdd}>
              <div className="nx-modal-body">
                {formError && <div className="nx-login-error" role="alert"><span>{formError}</span></div>}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <span className="nx-field-label" style={{ margin: 0, flexShrink: 0 }}>Section ID</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--nx-fg-muted)" }}>
                    auto-assigned · dept range {deptIndex + 1}xxxx
                  </span>
                </div>
                <div>
                  <span className="nx-field-label">Capacity *</span>
                  <input
                    className="nx-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={e => setCapacity(e.target.value)}
                    placeholder="e.g. 40"
                    autoFocus
                  />
                </div>
              </div>
              <div className="nx-modal-foot">
                <button type="button" className="nx-btn nx-btn-ghost" disabled={saving} onClick={closeAdd}>Cancel</button>
                <button type="submit" className="nx-btn nx-btn-primary" disabled={saving}>
                  {saving ? <><span className="nx-spin" /> Adding…</> : "Add section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete section confirm */}
      {deleteTarget && (
        <div className="nx-modal-backdrop" onClick={() => !saving && setDeleteTarget(null)}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">Delete section</h3>
            </div>
            <div className="nx-modal-body">
              <p style={{ margin: 0, color: "var(--nx-fg-muted)" }}>
                Delete section <strong style={{ color: "var(--nx-fg)", fontFamily: "'JetBrains Mono', monospace" }}>{deleteTarget.sectionId}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="nx-modal-foot">
              <button className="nx-btn nx-btn-ghost" disabled={saving} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="nx-btn nx-btn-primary"
                style={{ background: "var(--nx-danger)", borderColor: "var(--nx-danger)" }}
                disabled={saving}
                onClick={confirmDelete}
              >
                {saving ? <><span className="nx-spin" /> Deleting…</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function AdminCoursesPage() {
  const [page, setPage] = useState(1);
  const { courses, pagination, loading, error, refetch, createCourse, updateCourse, deleteCourse } = useCourses({ page, limit: 20 });
  const { departments } = useDepartments();

  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: Course } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [form, setForm] = useState<CreateCourseRequest>(EMPTY_COURSE);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Departments sorted by creation order → determines section ID range per dept
  const sortedDepts = [...departments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const deptName = (id?: string) => departments.find(d => d._id === id)?.name ?? "—";
  const getDeptIndex = (id?: string) => {
    if (!id) return 0;
    const idx = sortedDepts.findIndex(d => d._id === id);
    return idx === -1 ? 0 : idx;
  };

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openCreate = () => { setForm(EMPTY_COURSE); setFormError(null); setModal({ mode: "create" }); };
  const openEdit = (c: Course) => {
    setForm({ name: c.name, code: c.code, description: c.description ?? "", departmentId: c.departmentId ?? "", credits: c.credits });
    setFormError(null);
    setModal({ mode: "edit", item: c });
  };
  const closeModal = () => { if (!saving) setModal(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setFormError("Name and code are required."); return; }
    setSaving(true);
    setFormError(null);
    const payload: CreateCourseRequest = {
      ...form,
      departmentId: form.departmentId || undefined,
      credits: form.credits ? Number(form.credits) : undefined,
    };
    try {
      if (modal?.mode === "edit" && modal.item) {
        await updateCourse(modal.item._id, payload);
        setToast({ kind: "success", msg: `"${form.name}" updated.` });
      } else {
        await createCourse(payload);
        setToast({ kind: "success", msg: `"${form.name}" created.` });
      }
      setModal(null);
    } catch (err: unknown) {
      setFormError((err as Error)?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteCourse(deleteTarget._id);
      setToast({ kind: "success", msg: `"${deleteTarget.name}" deleted.` });
      setOpenIds(prev => { const next = new Set(prev); next.delete(deleteTarget._id); return next; });
      setDeleteTarget(null);
    } catch (err: unknown) {
      setToast({ kind: "error", msg: (err as Error)?.message || "Failed to delete." });
    } finally {
      setSaving(false);
    }
  };

  const total = pagination?.totalUsers ?? 0;

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Courses</h1>
          <p className="nx-page-sub">{total} course{total !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="nx-btn nx-btn-ghost" disabled={loading} onClick={refetch}>
            {loading ? <><span className="nx-spin" /> Checking…</> : "↻ Refresh"}
          </button>
          <button className="nx-btn nx-btn-primary" onClick={openCreate}>+ New course</button>
        </div>
      </div>

      {/* Course list */}
      <div className="nx-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="nx-loading"><span className="nx-spin" /> Loading courses…</div>
        ) : error ? (
          <div className="nx-empty">
            <div className="nx-empty-title" style={{ color: "var(--nx-danger)" }}>Failed to load</div>
            <div className="nx-empty-sub">{error}</div>
          </div>
        ) : courses.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">No courses yet</div>
            <div className="nx-empty-sub">Click "+ New course" to create the first one.</div>
          </div>
        ) : (
          <>
            {courses.map((course, i) => {
              const isOpen = openIds.has(course._id);
              const di = getDeptIndex(course.departmentId);
              return (
                <div key={course._id} style={{ borderBottom: i < courses.length - 1 ? "1px solid var(--nx-border)" : undefined }}>
                  {/* Course header row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 110px 1fr auto",
                      gap: 14,
                      alignItems: "center",
                      padding: "12px 16px",
                      cursor: "pointer",
                      background: isOpen ? "var(--nx-bg-hover)" : undefined,
                      userSelect: "none",
                    }}
                    onClick={() => toggle(course._id)}
                  >
                    {/* Chevron */}
                    <span style={{
                      display: "inline-block",
                      color: "var(--nx-fg-subtle)",
                      fontSize: 12,
                      transition: "transform 150ms",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    }}>▶</span>

                    {/* Course code */}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--nx-fg-muted)", fontWeight: 500 }}>
                      {course.code}
                    </span>

                    {/* Name + dept/credits meta */}
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{course.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--nx-fg-subtle)", marginTop: 1 }}>
                        {deptName(course.departmentId)}{course.credits ? ` · ${course.credits} cr` : ""}
                      </div>
                    </div>

                    {/* Actions — stop propagation so clicks don't toggle expand */}
                    <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button className="nx-btn nx-btn-ghost" onClick={() => openEdit(course)}>Edit</button>
                      <button className="nx-btn nx-btn-ghost" style={{ color: "var(--nx-danger)" }} onClick={() => setDeleteTarget(course)}>Delete</button>
                    </div>
                  </div>

                  {/* Sections panel — only mounted when open */}
                  {isOpen && (
                    <SectionsPanel course={course} deptIndex={di} onToast={setToast} />
                  )}
                </div>
              );
            })}

            {pagination && pagination.totalPages > 1 && (
              <div className="nx-pagination">
                <span className="nx-pagination-info">Page {pagination.currentPage} of {pagination.totalPages}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit course modal */}
      {modal && (
        <div className="nx-modal-backdrop" onClick={closeModal}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">{modal.mode === "create" ? "New course" : "Edit course"}</h3>
            </div>
            <form onSubmit={submit}>
              <div className="nx-modal-body">
                {formError && <div className="nx-login-error" role="alert"><span>{formError}</span></div>}
                <div>
                  <span className="nx-field-label">Name *</span>
                  <input
                    className="nx-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Introduction to Programming"
                    autoFocus
                  />
                </div>
                <div>
                  <span className="nx-field-label">Code *</span>
                  <input
                    className="nx-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. CS101"
                  />
                </div>
                <div>
                  <span className="nx-field-label">Description</span>
                  <input
                    className="nx-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={form.description ?? ""}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <span className="nx-field-label">Department</span>
                  <select
                    className="nx-select"
                    style={{ width: "100%" }}
                    value={form.departmentId ?? ""}
                    onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  >
                    <option value="">— None —</option>
                    {sortedDepts.map((d, idx) => (
                      <option key={d._id} value={d._id}>{d.name} ({d.code}) — sections: {idx + 1}xxxx</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="nx-field-label">Credits</span>
                  <input
                    className="nx-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    type="number"
                    min={1}
                    value={form.credits ?? ""}
                    onChange={e => setForm(f => ({ ...f, credits: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="e.g. 3"
                  />
                </div>
              </div>
              <div className="nx-modal-foot">
                <button type="button" className="nx-btn nx-btn-ghost" disabled={saving} onClick={closeModal}>Cancel</button>
                <button type="submit" className="nx-btn nx-btn-primary" disabled={saving}>
                  {saving ? <><span className="nx-spin" /> Saving…</> : modal.mode === "create" ? "Create" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete course confirm */}
      {deleteTarget && (
        <div className="nx-modal-backdrop" onClick={() => !saving && setDeleteTarget(null)}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">Delete course</h3>
            </div>
            <div className="nx-modal-body">
              <p style={{ margin: "0 0 12px" }}>
                Are you sure you want to delete <strong style={{ color: "var(--nx-fg)" }}>{deleteTarget.name}</strong>?
              </p>
              <div style={{
                background: "color-mix(in srgb, var(--nx-danger) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--nx-danger) 30%, transparent)",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--nx-danger)" }}>
                  This will permanently delete:
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--nx-fg-muted)", fontSize: 13 }}>
                  <li>All sections belonging to this course</li>
                  <li>All enrollment records for those sections</li>
                </ul>
                <p style={{ margin: 0, fontSize: 12, color: "var(--nx-fg-muted)", marginTop: 2 }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="nx-modal-foot">
              <button className="nx-btn nx-btn-ghost" disabled={saving} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="nx-btn nx-btn-primary"
                style={{ background: "var(--nx-danger)", borderColor: "var(--nx-danger)" }}
                disabled={saving}
                onClick={confirmDelete}
              >
                {saving ? <><span className="nx-spin" /> Deleting…</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="nx-toast-region">
          <div className={`nx-toast nx-toast-${toast.kind}`}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}
