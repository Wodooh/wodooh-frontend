"use client";

import React, { useState, useEffect } from "react";
import { useCourses } from "@/lib/hooks/use-courses";
import { useDepartments } from "@/lib/hooks/use-departments";
import type { Course, CreateCourseRequest } from "@/lib/types/course.types";

const EMPTY_FORM: CreateCourseRequest = { name: "", code: "", description: "", departmentId: "", capacity: undefined, credits: undefined };

export default function AdminCoursesPage() {
  const [page, setPage] = useState(1);
  const { courses, pagination, loading, error, refetch, createCourse, updateCourse, deleteCourse } = useCourses({ page, limit: 20 });
  const { departments } = useDepartments();

  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: Course } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [form, setForm] = useState<CreateCourseRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const deptName = (id?: string) => departments.find(d => d._id === id)?.name ?? "—";

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (course: Course) => {
    setForm({
      name: course.name,
      code: course.code,
      description: course.description ?? "",
      departmentId: course.departmentId ?? "",
      capacity: course.capacity,
      credits: course.credits,
    });
    setFormError(null);
    setModal({ mode: "edit", item: course });
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
      capacity: form.capacity ? Number(form.capacity) : undefined,
      credits:  form.credits  ? Number(form.credits)  : undefined,
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
    } catch (err: any) {
      setFormError(err?.message || "Something went wrong.");
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
      setDeleteTarget(null);
    } catch (err: any) {
      setToast({ kind: "error", msg: err?.message || "Failed to delete." });
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

      <div className="nx-card">
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
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Name</th>
                  <th style={{ width: "10%" }}>Code</th>
                  <th style={{ width: "22%" }}>Department</th>
                  <th style={{ width: "10%" }}>Credits</th>
                  <th style={{ width: "10%" }}>Capacity</th>
                  <th style={{ width: "20%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td><span className="nx-tbl-mono">{c.code}</span></td>
                    <td style={{ color: "var(--nx-fg-muted)" }}>{deptName(c.departmentId)}</td>
                    <td className="nx-tbl-mono">{c.credits ?? "—"}</td>
                    <td className="nx-tbl-mono">{c.capacity ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="nx-btn nx-btn-ghost" onClick={() => openEdit(c)}>Edit</button>
                        <button className="nx-btn nx-btn-ghost" style={{ color: "var(--nx-danger)" }} onClick={() => setDeleteTarget(c)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="nx-pagination">
            <span className="nx-pagination-info">Page {pagination.currentPage} of {pagination.totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasNextPage}  onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <div className="nx-modal-backdrop" onClick={closeModal}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">{modal.mode === "create" ? "New course" : "Edit course"}</h3>
            </div>
            <form onSubmit={submit}>
              <div className="nx-modal-body">
                {formError && (
                  <div className="nx-login-error" role="alert"><span>{formError}</span></div>
                )}
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
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span className="nx-field-label">Credits</span>
                    <input
                      className="nx-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                      type="number" min={1}
                      value={form.credits ?? ""}
                      onChange={e => setForm(f => ({ ...f, credits: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div>
                    <span className="nx-field-label">Capacity</span>
                    <input
                      className="nx-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                      type="number" min={1}
                      value={form.capacity ?? ""}
                      onChange={e => setForm(f => ({ ...f, capacity: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="e.g. 40"
                    />
                  </div>
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

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="nx-modal-backdrop" onClick={() => !saving && setDeleteTarget(null)}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">Delete course</h3>
            </div>
            <div className="nx-modal-body">
              <p style={{ color: "var(--nx-fg-muted)", margin: 0 }}>
                Delete <strong style={{ color: "var(--nx-fg)" }}>{deleteTarget.name}</strong>? This cannot be undone.
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

      {toast && (
        <div className="nx-toast-region">
          <div className={`nx-toast nx-toast-${toast.kind}`}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}
