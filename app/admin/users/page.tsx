"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUsers } from "@/lib/hooks/use-users";
import { useCreateAdminUser, usePatchAdminUser, useHardDeleteAdminUser } from "@/lib/hooks/use-admin-users";
import type { UserRole, UserSafe } from "@/lib/types/user.types";
import type { CreateUserRequest } from "@/lib/types/admin-user.types";
import { useAuth } from "@/lib/auth/auth-provider";

const ROLES: UserRole[] = ["admin", "instructor", "chairman", "student"];

function initials(name: string | undefined) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function displayName(u: { name?: string; email: string }) {
  return u.name || u.email.split("@")[0];
}

function RoleBadge({ role }: { role: UserRole | undefined }) {
  if (!role) return <span className="nx-badge" style={{ background: "var(--nx-bg-hover)", color: "var(--nx-fg-muted)" }}>no role</span>;
  return (
    <span className={`nx-badge nx-role-${role}`}>
      <span className="nx-badge-dot" />
      {role[0].toUpperCase() + role.slice(1)}
    </span>
  );
}

// ── Kebab row-actions menu ────────────────────────────────────────────────────
function RowActions({
  user, onEdit, onToggleActive, onDelete,
}: {
  user: UserSafe;
  onEdit: (u: UserSafe) => void;
  onToggleActive: (u: UserSafe) => void;
  onDelete: (u: UserSafe) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuH = 132; // approx: 3 items + separator
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < menuH + 8 ? rect.top - menuH - 4 : rect.bottom + 4;
      setMenuPos({ top, left: rect.right - 168 });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;

    const reposition = () => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const menuH = 132;
      const top = window.innerHeight - rect.bottom < menuH + 8
        ? rect.top - menuH - 4
        : rect.bottom + 4;
      setMenuPos({ top, left: rect.right - 168 });
    };

    const onDoc = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", reposition, { capture: true, passive: true });
    window.addEventListener("resize", reposition, { passive: true });

    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", reposition, { capture: true });
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const isActive = user.active !== false;

  const menu = open && createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed", top: menuPos.top, left: menuPos.left, minWidth: 168,
        background: "var(--nx-bg-elev)", border: "1px solid var(--nx-border)", borderRadius: 8,
        boxShadow: "0 8px 24px rgba(15,23,42,.12)", padding: 4, zIndex: 9999,
      }}
    >
          {/* Edit */}
          <button
            role="menuitem"
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", fontSize: 13, color: "var(--nx-fg)", background: "transparent", border: "none", borderRadius: 5, cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--nx-bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            onClick={() => { setOpen(false); onEdit(user); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            Edit user
          </button>

          <div style={{ height: 1, background: "var(--nx-border)", margin: "4px 0" }} />

          {/* Deactivate / Activate toggle */}
          <button
            role="menuitem"
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px",
              fontSize: 13, color: isActive ? "var(--nx-warning)" : "var(--nx-success)",
              background: "transparent", border: "none", borderRadius: 5, cursor: "pointer", textAlign: "left",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isActive ? "var(--nx-warning-soft)" : "var(--nx-success-soft)"; }}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            onClick={() => { setOpen(false); onToggleActive(user); }}
          >
            {isActive ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M4.93 4.93l14.14 14.14" />
                </svg>
                Deactivate
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M8 12l2.5 2.5L16 9" />
                </svg>
                Activate
              </>
            )}
          </button>

          {/* Delete (permanent) — only enabled after deactivation */}
          <button
            role="menuitem"
            disabled={isActive}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px",
              fontSize: 13, color: isActive ? "var(--nx-fg-faint)" : "var(--nx-danger)",
              background: "transparent", border: "none", borderRadius: 5,
              cursor: isActive ? "not-allowed" : "pointer", textAlign: "left",
              opacity: isActive ? 0.45 : 1,
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--nx-danger-soft)"; }}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            onClick={() => { if (!isActive) { setOpen(false); onDelete(user); } }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Delete user
          </button>
    </div>,
    document.body
  );

  return (
    <div style={{ display: "inline-block" }}>
      <button
        ref={btnRef}
        className={`nx-btn nx-btn-ghost${open ? " active" : ""}`}
        style={{ width: 28, height: 28, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        aria-label="Open actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
      {menu}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const EMPTY_NEW_USER: CreateUserRequest = { email: "", displayName: "", role: "student" };

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(() => ({
    page,
    limit: 20,
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(search ? { query: search } : {}),
  }), [page, roleFilter, search]);

  const { users, pagination, loading, error, refetch } = useUsers(params);
  const { patch: patchUser, loading: patching } = usePatchAdminUser();
  const { hardDelete: hardDeleteUser, loading: deleting } = useHardDeleteAdminUser();
  const { create: createUser, loading: creating } = useCreateAdminUser();

  // ── Edit modal ──────────────────────────────────────────────────────────────
  const [editModal, setEditModal] = useState<{
    user: UserSafe;
    form: { displayName: string; email: string; role: UserRole };
  } | null>(null);
  const [editErrors, setEditErrors] = useState<{ displayName?: string; email?: string }>({});

  const openEdit = (u: UserSafe) => {
    setEditErrors({});
    setEditModal({ user: u, form: { displayName: u.name || "", email: u.email || "", role: u.role } });
  };
  const closeEdit = () => { if (patching) return; setEditModal(null); };

  const submitEdit = async () => {
    if (!editModal) return;
    const f = editModal.form;
    const fe: typeof editErrors = {};
    if (!f.displayName.trim()) fe.displayName = "Name is required.";
    if (!f.email.trim()) fe.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) fe.email = "Enter a valid email.";
    if (Object.keys(fe).length) { setEditErrors(fe); return; }

    const body: Record<string, string> = {};
    if (f.displayName.trim() !== (editModal.user.name || "")) body.displayName = f.displayName.trim();
    if (f.email.trim().toLowerCase() !== (editModal.user.email || "").toLowerCase()) body.email = f.email.trim().toLowerCase();
    if (f.role !== editModal.user.role) body.role = f.role;
    if (Object.keys(body).length === 0) { setEditModal(null); return; }

    try {
      await patchUser(editModal.user._id, body);
      setToast({ kind: "success", msg: `${f.displayName.trim() || displayName(editModal.user)} updated.` });
      setEditModal(null);
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setToast({ kind: "error", msg: err?.message || "Failed to update user." });
    }
  };

  // ── Toggle-active modal (deactivate / activate) ──────────────────────────
  const [activeModal, setActiveModal] = useState<{ user: UserSafe } | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  const openToggleActive = (u: UserSafe) => setActiveModal({ user: u });
  const closeActiveModal = () => { if (togglingActive) return; setActiveModal(null); };

  const submitToggleActive = async () => {
    if (!activeModal) return;
    const isActive = activeModal.user.active !== false;
    setTogglingActive(true);
    try {
      await patchUser(activeModal.user._id, { active: !isActive });
      setToast({ kind: "success", msg: `${displayName(activeModal.user)} ${isActive ? "deactivated" : "activated"}.` });
      setActiveModal(null);
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setToast({ kind: "error", msg: err?.message || "Failed to update user." });
    } finally {
      setTogglingActive(false);
    }
  };

  // ── Permanent delete modal ──────────────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState<{ user: UserSafe; confirm: string } | null>(null);

  const openDelete = (u: UserSafe) => setDeleteModal({ user: u, confirm: "" });
  const closeDelete = () => { if (deleting) return; setDeleteModal(null); };

  const submitDelete = async () => {
    if (!deleteModal) return;
    try {
      await hardDeleteUser(deleteModal.user._id);
      setToast({ kind: "success", msg: `${displayName(deleteModal.user)} permanently deleted.` });
      setDeleteModal(null);
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setToast({ kind: "error", msg: err?.message || "Failed to delete user." });
    }
  };

  // ── Add modal ───────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserRequest>(EMPTY_NEW_USER);
  const [addFieldErrors, setAddFieldErrors] = useState<{ email?: string; displayName?: string }>({});
  const [setupLink, setSetupLink] = useState<string | null>(null);

  const openAdd = () => { setNewUser(EMPTY_NEW_USER); setAddFieldErrors({}); setSetupLink(null); setAddOpen(true); };
  const closeAdd = () => { if (creating) return; setAddOpen(false); setSetupLink(null); };

  const submitAdd = async () => {
    const fe: typeof addFieldErrors = {};
    if (!newUser.email.trim()) fe.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email.trim())) fe.email = "Enter a valid email.";
    if (!newUser.displayName.trim()) fe.displayName = "Name is required.";
    if (Object.keys(fe).length) { setAddFieldErrors(fe); return; }

    try {
      const res = await createUser({
        email: newUser.email.trim().toLowerCase(),
        displayName: newUser.displayName.trim().toLowerCase(),
        role: newUser.role,
      });
      if (!res.setup.emailSent && res.setup.link) {
        setSetupLink(res.setup.link);
      } else {
        setToast({ kind: "success", msg: `${newUser.displayName.trim()} added — setup email sent.` });
        closeAdd();
      }
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setToast({ kind: "error", msg: err?.message || "Failed to create user." });
    }
  };

  // ── Toast auto-dismiss ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const total = pagination?.totalUsers ?? 0;
  const start = total === 0 ? 0 : ((pagination?.currentPage ?? 1) - 1) * 20 + 1;
  const end = Math.min(start + (users.length - 1), total);

  return (
    <>
      {/* Page header */}
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Users</h1>
          <p className="nx-page-sub">{total} users · manage roles and access</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="nx-btn nx-btn-ghost" onClick={() => refetch()} disabled={loading} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            Refresh
          </button>
          <button className="nx-btn nx-btn-primary" onClick={openAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add user
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="nx-card">
        <div className="nx-filter-bar">
          <div className="nx-input-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--nx-fg-subtle)" }}>
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="nx-input"
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="nx-select"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as UserRole | ""); setPage(1); }}
          >
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
          </select>
          <div className="nx-filter-bar-spacer" />
          <span className="nx-filter-bar-count">{loading ? "…" : `${users.length} of ${total}`}</span>
        </div>

        {loading ? (
          <div className="nx-loading"><span className="nx-spin" /> Loading users…</div>
        ) : error ? (
          <div className="nx-empty">
            <div className="nx-empty-title" style={{ color: "var(--nx-danger)" }}>Failed to load users</div>
            <div className="nx-empty-sub">{error}</div>
          </div>
        ) : users.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">No users match</div>
            <div className="nx-empty-sub">Try adjusting your search or filter.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>User</th>
                  <th style={{ width: "16%" }}>Role</th>
                  <th style={{ width: "20%" }}>Joined</th>
                  <th style={{ width: "auto", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="nx-user-cell">
                        <div className="nx-avatar">{initials(u.name)}</div>
                        <div>
                          <div className="nx-user-cell-name">
                            {displayName(u)} {me?._id === u._id && <span style={{ color: "var(--nx-fg-subtle)", fontWeight: 400, fontSize: 11 }}>· you</span>}
                          </div>
                          <div className="nx-user-cell-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="nx-tbl-mono">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <RowActions user={u} onEdit={openEdit} onToggleActive={openToggleActive} onDelete={openDelete} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="nx-pagination">
            <span className="nx-pagination-info">{start}–{end} of {total}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
              <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit user modal ── */}
      {editModal && (
        <div className="nx-modal-backdrop" onClick={closeEdit}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">Edit user</h3>
            </div>
            <div className="nx-modal-body">
              <div className="nx-user-cell" style={{ paddingBottom: 4 }}>
                <div className="nx-avatar">{initials(editModal.form.displayName || editModal.user.name)}</div>
                <div>
                  <div className="nx-user-cell-name">{displayName(editModal.user)}</div>
                  <div className="nx-user-cell-email">Joined {editModal.user.createdAt ? new Date(editModal.user.createdAt).toLocaleDateString() : "—"}</div>
                </div>
              </div>

              <div>
                <span className="nx-field-label">Full name</span>
                <div className={`nx-input-wrap${editErrors.displayName ? " has-error" : ""}`} style={{ width: "100%" }}>
                  <input
                    className="nx-input"
                    value={editModal.form.displayName}
                    onChange={e => { setEditModal(m => m && ({ ...m, form: { ...m.form, displayName: e.target.value } })); setEditErrors(f => ({ ...f, displayName: undefined })); }}
                    disabled={patching}
                  />
                </div>
                {editErrors.displayName && <div className="nx-field-error">{editErrors.displayName}</div>}
              </div>

              <div>
                <span className="nx-field-label">Email</span>
                <div className={`nx-input-wrap${editErrors.email ? " has-error" : ""}`} style={{ width: "100%" }}>
                  <input
                    className="nx-input"
                    type="email"
                    value={editModal.form.email}
                    onChange={e => { setEditModal(m => m && ({ ...m, form: { ...m.form, email: e.target.value } })); setEditErrors(f => ({ ...f, email: undefined })); }}
                    disabled={patching}
                  />
                </div>
                {editErrors.email && <div className="nx-field-error">{editErrors.email}</div>}
              </div>

              <div>
                <span className="nx-field-label">Role</span>
                <select
                  className="nx-select"
                  style={{ width: "100%" }}
                  value={editModal.form.role}
                  onChange={e => setEditModal(m => m && ({ ...m, form: { ...m.form, role: e.target.value as UserRole } }))}
                  disabled={patching}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>

              {me?._id === editModal.user._id && editModal.form.role !== "admin" && (
                <div className="nx-login-error" role="alert" style={{ background: "var(--nx-warning-soft)", borderColor: "var(--nx-warning)", color: "var(--nx-warning)" }}>
                  <span>You are demoting yourself out of admin. You will lose access immediately.</span>
                </div>
              )}
            </div>
            <div className="nx-modal-foot">
              <button className="nx-btn nx-btn-ghost" disabled={patching} onClick={closeEdit}>Cancel</button>
              <button className="nx-btn nx-btn-primary" disabled={patching} onClick={submitEdit}>
                {patching ? <><span className="nx-spin" /> Saving…</> : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate / Activate modal ── */}
      {activeModal && (() => {
        const isActive = activeModal.user.active !== false;
        return (
          <div className="nx-modal-backdrop" onClick={closeActiveModal}>
            <div className="nx-modal" onClick={e => e.stopPropagation()}>
              <div className="nx-modal-head">
                <h3 className="nx-modal-title">{isActive ? "Deactivate user" : "Activate user"}</h3>
              </div>
              <div className="nx-modal-body">
                <div className="nx-user-cell">
                  <div className="nx-avatar">{initials(activeModal.user.name)}</div>
                  <div>
                    <div className="nx-user-cell-name">{displayName(activeModal.user)}</div>
                    <div className="nx-user-cell-email">{activeModal.user.email}</div>
                  </div>
                </div>
                {isActive ? (
                  <div style={{ background: "var(--nx-warning-soft)", border: "1px solid color-mix(in oklab, var(--nx-warning) 40%, transparent)", color: "var(--nx-warning)", borderRadius: 6, padding: "10px 12px", fontSize: 12, lineHeight: 1.5 }}>
                    This will revoke their access immediately. The account is kept and can be permanently deleted afterwards.
                  </div>
                ) : (
                  <div style={{ background: "var(--nx-success-soft)", border: "1px solid color-mix(in oklab, var(--nx-success) 40%, transparent)", color: "var(--nx-success)", borderRadius: 6, padding: "10px 12px", fontSize: 12, lineHeight: 1.5 }}>
                    This will restore their access and allow them to sign in again.
                  </div>
                )}
              </div>
              <div className="nx-modal-foot">
                <button className="nx-btn nx-btn-ghost" disabled={togglingActive} onClick={closeActiveModal}>Cancel</button>
                <button
                  className="nx-btn"
                  style={{
                    background: isActive ? "var(--nx-warning)" : "var(--nx-success)",
                    color: isActive ? "#000" : "#fff",
                    fontWeight: 600,
                  }}
                  disabled={togglingActive}
                  onClick={submitToggleActive}
                >
                  {togglingActive
                    ? <><span className="nx-spin" /> {isActive ? "Deactivating…" : "Activating…"}</>
                    : isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Delete user modal ── */}
      {deleteModal && (
        <div className="nx-modal-backdrop" onClick={closeDelete}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">Delete user</h3>
            </div>
            <div className="nx-modal-body">
              <div className="nx-user-cell">
                <div className="nx-avatar">{initials(deleteModal.user.name)}</div>
                <div>
                  <div className="nx-user-cell-name">{displayName(deleteModal.user)}</div>
                  <div className="nx-user-cell-email">{deleteModal.user.email}</div>
                </div>
              </div>
              <div style={{ background: "var(--nx-danger-soft)", border: "1px solid color-mix(in oklab, var(--nx-danger) 40%, transparent)", color: "var(--nx-danger)", borderRadius: 6, padding: "10px 12px", fontSize: 12, lineHeight: 1.5 }}>
                This will permanently remove the user and revoke their access. <strong>This action cannot be undone.</strong>
              </div>
              <div>
                <span className="nx-field-label">Type the user&apos;s email to confirm</span>
                <div className="nx-input-wrap" style={{ width: "100%" }}>
                  <input
                    className="nx-input"
                    placeholder={deleteModal.user.email}
                    value={deleteModal.confirm}
                    onChange={e => setDeleteModal(m => m && ({ ...m, confirm: e.target.value }))}
                    disabled={deleting}
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <div className="nx-modal-foot">
              <button className="nx-btn nx-btn-ghost" disabled={deleting} onClick={closeDelete}>Cancel</button>
              <button
                className="nx-btn"
                style={{ background: "var(--nx-danger, #dc2626)", color: "#fff", fontWeight: 600, opacity: (deleting || deleteModal.confirm.trim().toLowerCase() !== (deleteModal.user.email || "").toLowerCase()) ? 0.45 : 1, cursor: (deleting || deleteModal.confirm.trim().toLowerCase() !== (deleteModal.user.email || "").toLowerCase()) ? "not-allowed" : "pointer" }}
                disabled={deleting || deleteModal.confirm.trim().toLowerCase() !== (deleteModal.user.email || "").toLowerCase()}
                onClick={submitDelete}
              >
                {deleting ? <><span className="nx-spin" /> Deleting…</> : "Delete user"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add user modal ── */}
      {addOpen && (
        <div className="nx-modal-backdrop" onClick={closeAdd}>
          <div className="nx-modal" onClick={e => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">{setupLink ? "User created" : "Add user"}</h3>
            </div>

            {setupLink ? (
              <div className="nx-modal-body">
                <p style={{ fontSize: 13, color: "var(--nx-fg-muted)", marginBottom: 8 }}>
                  Email could not be sent. Share this setup link with the user:
                </p>
                <div style={{ background: "var(--nx-bg-hover)", borderRadius: 6, padding: "8px 10px", wordBreak: "break-all", fontSize: 12, fontFamily: "monospace", color: "var(--nx-fg)" }}>
                  {setupLink}
                </div>
                <button
                  className="nx-btn nx-btn-ghost"
                  style={{ marginTop: 8, fontSize: 12 }}
                  onClick={() => { navigator.clipboard.writeText(setupLink); setToast({ kind: "success", msg: "Link copied." }); }}
                >
                  Copy link
                </button>
              </div>
            ) : (
              <div className="nx-modal-body">
                <div>
                  <span className="nx-field-label">Full name</span>
                  <div className={`nx-input-wrap${addFieldErrors.displayName ? " has-error" : ""}`} style={{ width: "100%" }}>
                    <input
                      className="nx-input"
                      placeholder="e.g. Jane Smith"
                      value={newUser.displayName}
                      onChange={e => { setNewUser(u => ({ ...u, displayName: e.target.value })); setAddFieldErrors(f => ({ ...f, displayName: undefined })); }}
                      disabled={creating}
                    />
                  </div>
                  {addFieldErrors.displayName && <div className="nx-field-error">{addFieldErrors.displayName}</div>}
                </div>
                <div>
                  <span className="nx-field-label">Email</span>
                  <div className={`nx-input-wrap${addFieldErrors.email ? " has-error" : ""}`} style={{ width: "100%" }}>
                    <input
                      className="nx-input"
                      type="email"
                      placeholder="e.g. jane@university.edu"
                      value={newUser.email}
                      onChange={e => { setNewUser(u => ({ ...u, email: e.target.value })); setAddFieldErrors(f => ({ ...f, email: undefined })); }}
                      disabled={creating}
                    />
                  </div>
                  {addFieldErrors.email && <div className="nx-field-error">{addFieldErrors.email}</div>}
                </div>
                <div>
                  <span className="nx-field-label">Role</span>
                  <select
                    className="nx-select"
                    style={{ width: "100%" }}
                    value={newUser.role}
                    onChange={e => setNewUser(u => ({ ...u, role: e.target.value as UserRole }))}
                    disabled={creating}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="nx-modal-foot">
              <button className="nx-btn nx-btn-ghost" disabled={creating} onClick={closeAdd}>
                {setupLink ? "Done" : "Cancel"}
              </button>
              {!setupLink && (
                <button className="nx-btn nx-btn-primary" disabled={creating} onClick={submitAdd}>
                  {creating ? <><span className="nx-spin" /> Creating…</> : "Create user"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast region */}
      {toast && (
        <div className="nx-toast-region">
          <div className={`nx-toast nx-toast-${toast.kind}`}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}
