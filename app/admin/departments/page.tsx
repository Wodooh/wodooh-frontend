"use client";

import React, { useState, useEffect } from "react";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useColleges } from "@/lib/hooks/use-colleges";
import { useUsersByRole } from "@/lib/hooks/use-users";
import { useAssignChairman } from "@/lib/hooks/use-chairman";
import type { Department, CreateDepartmentRequest } from "@/lib/types/department.types";

const EMPTY_FORM: CreateDepartmentRequest = { name: "", code: "", description: "", collegeId: null };

export default function AdminDepartmentsPage() {
  const { departments, loading, error, refetch, createDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const { colleges } = useColleges();
  const { users: chairmen } = useUsersByRole("chairman", { limit: 100 });
  const { assign: assignChairman } = useAssignChairman();
  const collegeNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    colleges.forEach(c => m.set(c._id, c.name));
    return m;
  }, [colleges]);
  const chairmanNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    chairmen.forEach(c => m.set(c._id, c.name));
    return m;
  }, [chairmen]);

  const [chairmanModal, setChairmanModal] = useState<{ dept: Department } | null>(null);
  const [chairmanSel, setChairmanSel] = useState<string>("");

  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: Department } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [form, setForm] = useState<CreateDepartmentRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ mode: "create" });
  };

  const openEdit = (dept: Department) => {
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description ?? "",
      collegeId: dept.collegeId ?? null,
    });
    setFormError(null);
    setModal({ mode: "edit", item: dept });
  };

  const closeModal = () => { if (!saving) setModal(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setFormError("Name and code are required."); return; }
    setSaving(true);
    setFormError(null);
    try {
      if (modal?.mode === "edit" && modal.item) {
        await updateDepartment(modal.item._id, form);
        setToast({ kind: "success", msg: `"${form.name}" updated.` });
      } else {
        await createDepartment(form);
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
      await deleteDepartment(deleteTarget._id);
      setToast({ kind: "success", msg: `"${deleteTarget.name}" deleted.` });
      setDeleteTarget(null);
    } catch (err: any) {
      setToast({ kind: "error", msg: err?.message || "Failed to delete." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Departments</h1>
          <p className="nx-page-sub">{departments.length} department{departments.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="nx-btn nx-btn-ghost" disabled={loading} onClick={refetch}>
            {loading ? <><span className="nx-spin" /> Checking…</> : "↻ Refresh"}
          </button>
          <button className="nx-btn nx-btn-primary" onClick={openCreate}>+ New department</button>
        </div>
      </div>

      <div className="nx-card">
        {loading ? (
          <div className="nx-loading"><span className="nx-spin" /> Loading departments…</div>
        ) : error ? (
          <div className="nx-empty">
            <div className="nx-empty-title" style={{ color: "var(--nx-danger)" }}>Failed to load</div>
            <div className="nx-empty-sub">{error}</div>
          </div>
        ) : departments.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">No departments yet</div>
            <div className="nx-empty-sub">Click "+ New department" to create the first one.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Name</th>
                  <th style={{ width: "8%" }}>Code</th>
                  <th style={{ width: "18%" }}>College</th>
                  <th style={{ width: "18%" }}>Chairman</th>
                  <th style={{ width: "16%" }}>Description</th>
                  <th style={{ width: "16%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept._id}>
                    <td>
                      <span style={{ fontWeight: 500 }}>{dept.name}</span>
                    </td>
                    <td><span className="nx-tbl-mono">{dept.code}</span></td>
                    <td style={{ color: "var(--nx-fg-muted)", fontSize: 13 }}>
                      {dept.collegeId ? (collegeNameById.get(dept.collegeId) ?? "—") : "—"}
                    </td>
                    <td style={{ color: "var(--nx-fg-muted)", fontSize: 13 }}>
                      {dept.chairmanId ? (chairmanNameById.get(dept.chairmanId) ?? "Assigned") : "—"}
                    </td>
                    <td style={{ color: "var(--nx-fg-muted)", fontSize: 13 }}>{dept.description || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          className="nx-btn nx-btn-ghost"
                          onClick={() => { setChairmanSel(dept.chairmanId ?? ""); setChairmanModal({ dept }); }}
                        >
                          Chairman
                        </button>
                        <button className="nx-btn nx-btn-ghost" onClick={() => openEdit(dept)}>Edit</button>
                        <button className="nx-btn nx-btn-ghost" style={{ color: "var(--nx-danger)" }} onClick={() => setDeleteTarget(dept)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <div className="nx-modal-backdrop" onClick={closeModal}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">{modal.mode === "create" ? "New department" : "Edit department"}</h3>
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
                    placeholder="e.g. Computer Science"
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
                    placeholder="e.g. CS"
                  />
                </div>
                <div>
                  <span className="nx-field-label">College</span>
                  <select
                    className="nx-select"
                    style={{ width: "100%" }}
                    value={form.collegeId ?? ""}
                    onChange={e => setForm(f => ({ ...f, collegeId: e.target.value || null }))}
                  >
                    <option value="">— Unassigned —</option>
                    {colleges.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
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
              <h3 className="nx-modal-title">Delete department</h3>
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
                  <li>All courses belonging to this department</li>
                  <li>All sections within those courses</li>
                  <li>All instructor assignments for those sections</li>
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

      {chairmanModal && (
        <div className="nx-modal-backdrop" onClick={() => !saving && setChairmanModal(null)}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">Department chairman</h3>
            </div>
            <div className="nx-modal-body">
              <p style={{ margin: "0 0 12px", fontSize: 13 }}>
                Assign or unassign a chairman for <strong>{chairmanModal.dept.name}</strong>. A user must already have the
                chairman role; one chairman per department.
              </p>
              <div>
                <span className="nx-field-label">Chairman</span>
                <select
                  className="nx-select"
                  style={{ width: "100%" }}
                  value={chairmanSel}
                  onChange={e => setChairmanSel(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {chairmen.map(c => (
                    <option key={c._id} value={c._id}>{c.name} · {c.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="nx-modal-foot">
              <button className="nx-btn nx-btn-ghost" disabled={saving} onClick={() => setChairmanModal(null)}>Cancel</button>
              <button
                className="nx-btn nx-btn-primary"
                disabled={saving}
                onClick={async () => {
                  if (!chairmanModal) return;
                  setSaving(true);
                  try {
                    await assignChairman(chairmanModal.dept._id, chairmanSel || null);
                    setToast({ kind: "success", msg: chairmanSel ? "Chairman assigned." : "Chairman unassigned." });
                    setChairmanModal(null);
                    refetch();
                  } catch (err: any) {
                    setToast({ kind: "error", msg: err?.message || "Failed to update chairman." });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? <><span className="nx-spin" /> Saving…</> : "Save"}
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
