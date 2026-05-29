"use client";

import React, { useState, useEffect } from "react";
import { useCourses } from "@/lib/hooks/use-courses";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useSections } from "@/lib/hooks/use-sections";
import { useUsers } from "@/lib/hooks/use-users";
import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import type { Course, CreateCourseRequest, Section } from "@/lib/types/course.types";

const EMPTY_COURSE: CreateCourseRequest = { name: "", code: "", description: "", departmentId: "", credits: undefined };

// ─── Sections panel (rendered when course row is expanded) ─────────────────
function SectionsPanel({
  course,
  deptIndex,
  onToast,
  onSectionsLoaded,
}: {
  course: Course;
  deptIndex: number;
  onToast: (t: { kind: "success" | "error"; msg: string }) => void;
  onSectionsLoaded?: (count: number) => void;
}) {
  const { sections, loading, error, createSection, updateSection, deleteSection } = useSections(course._id);
  const { users: instructors } = useUsers({ role: "instructor", limit: 200 });
  const [addOpen, setAddOpen] = useState(false);
  const [sectionIdInput, setSectionIdInput] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [instructorId, setInstructorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [editTarget, setEditTarget] = useState<Section | null>(null);
  const [editInstructorId, setEditInstructorId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) onSectionsLoaded?.(sections.length);
  }, [sections.length, loading]);  // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = async () => {
    setSectionIdInput("");
    setInstructorId("");
    setFormError(null);
    setAddOpen(true);
    setPreviewLoading(true);
    try {
      const res = await apiClient.get<{ nextId: number }>(API_ENDPOINTS.ADMIN_COURSE_SECTION_NEXT_ID(course._id));
      if (res.status === "success" && res.data) setSectionIdInput(String(res.data.nextId));
    } catch {
      // preview unavailable — still let user submit, backend will assign
    } finally {
      setPreviewLoading(false);
    }
  };
  const closeAdd = () => { if (!saving) setAddOpen(false); };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = sectionIdInput.trim();
    const parsedId = trimmedId ? Number(trimmedId) : NaN;
    if (trimmedId && (!Number.isInteger(parsedId) || parsedId < 10001 || parsedId > 99999)) {
      setFormError("Section ID must be a number between 10001 and 99999.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const sec = await createSection({
        sectionId: trimmedId ? parsedId : undefined,
        instructorId: instructorId || undefined,
      });
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

  const openEdit = (sec: Section) => {
    setEditTarget(sec);
    setEditInstructorId(
      sec.instructorId
        ? typeof sec.instructorId === "object"
          ? sec.instructorId._id
          : sec.instructorId
        : ""
    );
    setEditError(null);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateSection(editTarget._id, {
        instructorId: editInstructorId || undefined,
      });
      onToast({ kind: "success", msg: `Section ${editTarget.sectionId} updated.` });
      setEditTarget(null);
    } catch (err: unknown) {
      setEditError((err as Error)?.message || "Failed to update section.");
    } finally {
      setEditSaving(false);
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
          <div style={{ padding: "10px 0 4px", fontSize: 13, color: "var(--nx-danger)" }}>{error}</div>
        ) : (
          <>
            {sections.length === 0 && (
              <div style={{ padding: "12px 0 4px", fontSize: 12.5, color: "var(--nx-fg-subtle)", fontStyle: "italic" }}>
                No sections yet — add one below.
              </div>
            )}
            {sections.map(sec => (
              <div key={sec._id} className="nx-row" style={{
                padding: "9px 12px",
                background: "var(--nx-bg-elev)",
                border: "1px solid var(--nx-border)",
                borderRadius: 6,
                marginTop: 8,
              }}>
                <div className="nx-row-main" style={{ gridTemplateColumns: "100px 1fr" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: "var(--nx-fg)" }}>
                    {sec.sectionId}
                  </span>
                  <span style={{
                    fontSize: 13,
                    minWidth: 0,
                    color: sec.instructorId ? "var(--nx-fg)" : "var(--nx-fg-subtle)",
                    fontStyle: sec.instructorId ? "normal" : "italic",
                  }}>
                    {sec.instructorId
                      ? typeof sec.instructorId === "object"
                        ? sec.instructorId.name.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                        : "Assigned"
                      : "No instructor assigned"}
                  </span>
                </div>
                <div className="nx-row-actions">
                  <button
                    className="nx-btn nx-btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => openEdit(sec)}
                  >
                    Edit
                  </button>
                  <button
                    className="nx-btn nx-btn-ghost"
                    style={{ fontSize: 12, color: "var(--nx-danger)" }}
                    onClick={() => setDeleteTarget(sec)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Add section — always visible so user can add even before backend endpoint exists */}
        {!loading && (
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
                <div>
                  <span className="nx-field-label">Section ID</span>
                  <input
                    type="number"
                    min={10001}
                    max={99999}
                    value={sectionIdInput}
                    onChange={e => setSectionIdInput(e.target.value)}
                    placeholder={previewLoading ? "calculating…" : "auto"}
                    disabled={previewLoading}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 18,
                      fontWeight: 600,
                      color: sectionIdInput ? "var(--nx-fg)" : "var(--nx-fg-subtle)",
                      padding: "8px 12px",
                      background: "var(--nx-bg-sub)",
                      border: "1px solid var(--nx-border)",
                      borderRadius: 6,
                      letterSpacing: "0.08em",
                      outline: "none",
                    }}
                  />
                  <p style={{ fontSize: 11.5, color: "var(--nx-fg-subtle)", margin: "4px 0 0" }}>
                    Leave blank to auto-generate · dept slot {deptIndex + 1}
                  </p>
                </div>
                <div>
                  <span className="nx-field-label">Instructor</span>
                  <select
                    className="nx-select"
                    style={{ width: "100%" }}
                    value={instructorId}
                    onChange={e => setInstructorId(e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {instructors.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </option>
                    ))}
                  </select>
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

      {/* Edit section modal */}
      {editTarget && (
        <div className="nx-modal-backdrop" onClick={() => !editSaving && setEditTarget(null)}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">
                Edit section{" "}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>{editTarget.sectionId}</span>
              </h3>
            </div>
            <form onSubmit={submitEdit}>
              <div className="nx-modal-body">
                {editError && <div className="nx-login-error" role="alert"><span>{editError}</span></div>}
                <div>
                  <span className="nx-field-label">Instructor</span>
                  <select
                    className="nx-select"
                    style={{ width: "100%" }}
                    value={editInstructorId}
                    onChange={e => setEditInstructorId(e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {instructors.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="nx-modal-foot">
                <button type="button" className="nx-btn nx-btn-ghost" disabled={editSaving} onClick={() => setEditTarget(null)}>Cancel</button>
                <button type="submit" className="nx-btn nx-btn-primary" disabled={editSaving}>
                  {editSaving ? <><span className="nx-spin" /> Saving…</> : "Save changes"}
                </button>
              </div>
            </form>
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
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});

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
                    className="nx-row"
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      background: isOpen ? "var(--nx-bg-hover)" : undefined,
                      userSelect: "none",
                    }}
                    onClick={() => toggle(course._id)}
                  >
                    <div className="nx-row-main" style={{ gridTemplateColumns: "28px 110px 1fr" }}>
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
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{course.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--nx-fg-subtle)", marginTop: 1 }}>
                          {deptName(course.departmentId)}{course.credits != null ? ` · ${course.credits} credit` : ""}{sectionCounts[course._id] != null ? ` · ${sectionCounts[course._id]} section${sectionCounts[course._id] !== 1 ? "s" : ""}` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Actions — stop propagation so clicks don't toggle expand */}
                    <div className="nx-row-actions" onClick={e => e.stopPropagation()}>
                      <button className="nx-btn nx-btn-ghost" onClick={() => openEdit(course)}>Edit</button>
                      <button className="nx-btn nx-btn-ghost" style={{ color: "var(--nx-danger)" }} onClick={() => setDeleteTarget(course)}>Delete</button>
                    </div>
                  </div>

                  {/* Sections panel — only mounted when open */}
                  {isOpen && (
                    <SectionsPanel
                      course={course}
                      deptIndex={di}
                      onToast={setToast}
                      onSectionsLoaded={count => setSectionCounts(prev => ({ ...prev, [course._id]: count }))}
                    />
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
