"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUsers } from "@/lib/hooks/use-users";
import { useUpdateRole } from "@/lib/hooks/use-update-role";
import { useCreateAdminUser } from "@/lib/hooks/use-admin-users";
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

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(() => ({
    page,
    limit: 20,
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(search ? { query: search } : {}),
  }), [page, roleFilter, search]);

  const { users, pagination, loading, error, refetch } = useUsers(params);
  const { updateRole, loading: updating } = useUpdateRole();
  const { create: createUser, loading: creating } = useCreateAdminUser();

  const [modal, setModal] = useState<{ user: UserSafe; newRole: UserRole } | null>(null);

  const EMPTY_NEW_USER: CreateUserRequest = { email: "", displayName: "", role: "student" };
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserRequest>(EMPTY_NEW_USER);
  const [addFieldErrors, setAddFieldErrors] = useState<{ email?: string; displayName?: string }>({});
  const [setupLink, setSetupLink] = useState<string | null>(null);

  const openAdd = () => { setNewUser(EMPTY_NEW_USER); setAddFieldErrors({}); setSetupLink(null); setAddOpen(true); };
  const closeAdd = () => { if (creating) return; setAddOpen(false); setSetupLink(null); };

  const submitAdd = async () => {
    const fe: { email?: string; displayName?: string } = {};
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

  const onChangeRole = (u: UserSafe) => setModal({ user: u, newRole: u.role });

  const submitRoleChange = async () => {
    if (!modal) return;
    try {
      await updateRole(modal.user._id, { role: modal.newRole });
      setToast({ kind: "success", msg: `${displayName(modal.user)} is now ${modal.newRole}.` });
      setModal(null);
      refetch();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setToast({ kind: "error", msg: err?.message || "Failed to update role." });
    }
  };

  // Auto-dismiss toast
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
                      <button className="nx-btn nx-btn-ghost" onClick={() => onChangeRole(u)}>
                        Change role
                      </button>
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
              <button
                className="nx-btn nx-btn-ghost"
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >Prev</button>
              <button
                className="nx-btn nx-btn-ghost"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage(p => p + 1)}
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Change role modal */}
      {modal && (
        <div className="nx-modal-backdrop" onClick={() => !updating && setModal(null)}>
          <div className="nx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nx-modal-head">
              <h3 className="nx-modal-title">Change role</h3>
            </div>
            <div className="nx-modal-body">
              <div>
                <span className="nx-field-label">User</span>
                <div className="nx-user-cell">
                  <div className="nx-avatar">{initials(modal.user.name)}</div>
                  <div>
                    <div className="nx-user-cell-name">{displayName(modal.user)}</div>
                    <div className="nx-user-cell-email">{modal.user.email}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <span className="nx-field-label">Current</span>
                  <RoleBadge role={modal.user.role} />
                </div>
                <div style={{ color: "var(--nx-fg-subtle)", fontSize: 18 }}>→</div>
                <div style={{ flex: 1 }}>
                  <span className="nx-field-label">New role</span>
                  <select
                    className="nx-select"
                    value={modal.newRole}
                    onChange={(e) => setModal({ ...modal, newRole: e.target.value as UserRole })}
                    style={{ width: "100%" }}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {me?._id === modal.user._id && modal.newRole !== "admin" && (
                <div className="nx-login-error" role="alert" style={{ background: "var(--nx-warning-soft)", borderColor: "var(--nx-warning)", color: "var(--nx-warning)" }}>
                  <span>You are demoting yourself out of admin. You will lose access immediately.</span>
                </div>
              )}
            </div>
            <div className="nx-modal-foot">
              <button className="nx-btn nx-btn-ghost" disabled={updating} onClick={() => setModal(null)}>Cancel</button>
              <button
                className="nx-btn nx-btn-primary"
                disabled={updating || modal.newRole === modal.user.role}
                onClick={submitRoleChange}
              >
                {updating ? <><span className="nx-spin" /> Saving…</> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add user modal */}
      {addOpen && (
        <div className="nx-modal-backdrop" onClick={closeAdd}>
          <div className="nx-modal" onClick={(e) => e.stopPropagation()}>
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
                  <input
                    className={`nx-input${addFieldErrors.displayName ? " nx-input-error" : ""}`}
                    style={{ width: "100%" }}
                    placeholder="e.g. Jane Smith"
                    value={newUser.displayName}
                    onChange={(e) => { setNewUser(u => ({ ...u, displayName: e.target.value })); setAddFieldErrors(f => ({ ...f, displayName: undefined })); }}
                    disabled={creating}
                  />
                  {addFieldErrors.displayName && <div className="nx-field-error">{addFieldErrors.displayName}</div>}
                </div>
                <div>
                  <span className="nx-field-label">Email</span>
                  <input
                    className={`nx-input${addFieldErrors.email ? " nx-input-error" : ""}`}
                    style={{ width: "100%" }}
                    placeholder="e.g. jane@university.edu"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => { setNewUser(u => ({ ...u, email: e.target.value })); setAddFieldErrors(f => ({ ...f, email: undefined })); }}
                    disabled={creating}
                  />
                  {addFieldErrors.email && <div className="nx-field-error">{addFieldErrors.email}</div>}
                </div>
                <div>
                  <span className="nx-field-label">Role</span>
                  <select
                    className="nx-select"
                    style={{ width: "100%" }}
                    value={newUser.role}
                    onChange={(e) => setNewUser(u => ({ ...u, role: e.target.value as UserRole }))}
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
