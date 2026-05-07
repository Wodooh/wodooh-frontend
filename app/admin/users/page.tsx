"use client";

import * as React from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { USERS_COLLECTION } from "@/lib/admin/collections";
import {
  useAdminUsersList,
  useBulkChangeRole,
  useBulkSoftDelete,
  usePasswordReset,
  useSoftDeleteAdminUser,
} from "@/lib/hooks/use-admin-users";
import type { UserResponse, UserRole } from "@/lib/types/user-doc.types";
import { USER_ROLES } from "@/lib/types/user-doc.types";
import { downloadCsv, rowsToCsv } from "@/lib/admin/csv";

type SortDir = "asc" | "desc";

// Role accent colors — Bauhaus palette.
// student → blue, instructor → yellow, chairman → red, admin → black.
const ROLE_ACCENT: Record<UserRole, string> = {
  student: "#1040C0",
  instructor: "#F0C020",
  chairman: "#D02020",
  admin: "#121212",
};

interface TableColumn {
  key: keyof UserResponse;
  label: string;
  sortable: boolean;
}

const TABLE_COLUMNS: TableColumn[] = [
  { key: "uid", label: "User ID", sortable: false },
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "role", label: "Role", sortable: true },
  { key: "active", label: "Status", sortable: false },
  { key: "createdAt", label: "Created", sortable: true },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2";

function RoleBadge({ role }: { role: UserRole }) {
  // Per Bauhaus rules: student blue, instructor yellow fill, chairman red, admin black.
  const badgeClass: Record<UserRole, string> = {
    student:
      "border-2 border-[#1040C0] text-[#1040C0] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5",
    instructor:
      "border-2 border-[#F0C020] bg-[#F0C020] text-[#121212] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5",
    chairman:
      "border-2 border-[#D02020] text-[#D02020] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5",
    admin:
      "border-2 border-[#121212] text-[#121212] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5",
  };
  return (
    <span className={badgeClass[role] ?? badgeClass.admin}>{role}</span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const styles = active
    ? { background: "#DCFCE7", color: "#166534", border: "#166534" }
    : { background: "#FEE2E2", color: "#991B1B", border: "#991B1B" };
  const label = active ? "Active" : "Inactive";
  return (
    <span
      role="status"
      className="text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold border-2"
      style={{
        backgroundColor: styles.background,
        color: styles.color,
        borderColor: styles.border,
      }}
    >
      {label}
    </span>
  );
}

const PAGE_SIZE = 20;

export default function UsersListPage() {
  const [includeDeleted, setIncludeDeleted] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<UserRole | "">("");
  const [sortField, setSortField] = React.useState<keyof UserResponse>(
    USERS_COLLECTION.defaultSort.field as keyof UserResponse
  );
  const [sortDir, setSortDir] = React.useState<SortDir>(
    USERS_COLLECTION.defaultSort.direction
  );
  const [page, setPage] = React.useState(1);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const { data, loading, error } = useAdminUsersList(
    { limit: 100, includeDeleted },
    [refreshKey, includeDeleted]
  );

  const users = data?.users ?? [];

  const fuse = React.useMemo(
    () =>
      new Fuse(users, {
        keys: USERS_COLLECTION.columns
          .map(String)
          .filter((k) => k !== "active" && k !== "createdAt"),
        threshold: 0.3,
      }),
    [users]
  );

  const filtered = React.useMemo(() => {
    let rows = filter ? fuse.search(filter).map((r) => r.item) : users;
    if (roleFilter) rows = rows.filter((u) => u.role === roleFilter);
    return rows;
  }, [filter, fuse, users, roleFilter]);

  const sorted = React.useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, {
        numeric: true,
      });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  React.useEffect(() => {
    // reset to first page when filters change
    setPage(1);
  }, [filter, roleFilter, includeDeleted]);

  const refresh = () => setRefreshKey((n) => n + 1);

  const { softDelete, loading: deleting } = useSoftDeleteAdminUser();
  const { resetPassword } = usePasswordReset();
  // bulk hooks retained to preserve hook usage from original page
  useBulkSoftDelete();
  useBulkChangeRole();

  const [confirmDelete, setConfirmDelete] =
    React.useState<UserResponse | null>(null);

  const handleRowDelete = async () => {
    if (!confirmDelete) return;
    try {
      await softDelete(confirmDelete.uid);
      toast.success(`${confirmDelete.name} deleted`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleResetPassword = async (u: UserResponse) => {
    try {
      const result = await resetPassword(u.uid);
      if (result.emailSent) {
        toast.success(`Password reset email sent to ${u.email}`);
      } else {
        toast.warning(
          `No email transport configured. Reset link copied to clipboard for ${u.email}.`,
          { duration: 8000 }
        );
        try {
          await navigator.clipboard.writeText(result.link);
        } catch {
          /* clipboard may be denied */
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Password reset failed");
    }
  };

  const exportCsv = () => {
    const cols = USERS_COLLECTION.columns;
    const csv = rowsToCsv(sorted, cols as ReadonlyArray<keyof UserResponse>);
    const filename = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, csv);
  };

  const toggleSort = (field: keyof UserResponse) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const ariaSortFor = (
    field: keyof UserResponse
  ): "ascending" | "descending" | "none" => {
    if (sortField !== field) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  };

  const totalUsers = data?.pagination?.totalUsers ?? users.length;

  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      {/* Breadcrumb */}
      <p className="text-xs uppercase tracking-widest text-[#808080] mb-3 font-bold">
        Admin / Users
      </p>

      {/* Page header */}
      <header className="border-b-4 border-[#121212] pb-6 mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tight leading-none text-[#121212]">
            Users
          </h1>
          <p className="text-sm text-[#121212] mt-3 leading-relaxed">
            Manage every account across the institution. Search, filter by role,
            and edit individual records.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-4xl font-black leading-none text-[#121212]">
            {totalUsers}
          </p>
          <p className="text-xs uppercase tracking-widest text-[#808080] mt-1 font-bold">
            total users
            {includeDeleted && (
              <span className="text-[#D02020]"> · incl. deleted</span>
            )}
          </p>
        </div>
      </header>

      {/* Toolbar */}
      <section className="flex items-end gap-4 flex-wrap mb-6">
        {/* Search */}
        <div className="flex-1 min-w-[260px]">
          <label
            htmlFor="user-search"
            className="text-xs uppercase tracking-widest text-[#808080] block mb-1 font-bold"
          >
            Search
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[#808080] pointer-events-none select-none font-bold"
            >
              /
            </span>
            <input
              id="user-search"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name, email, ID…"
              style={{ borderRadius: 0 }}
              className={`border-4 border-[#D0D0D0] focus:border-[#121212] focus:shadow-[4px_4px_0px_0px_#121212] bg-[#F0F0F0] pl-6 pr-3 py-2 text-sm w-full focus-visible:outline-none transition-colors duration-200 min-h-[44px] text-[#121212] ${FOCUS_RING}`}
            />
          </div>
        </div>

        {/* Role filter */}
        <div className="min-w-[200px]">
          <label
            htmlFor="role-filter"
            className="text-xs uppercase tracking-widest text-[#808080] block mb-1 font-bold"
          >
            Role
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
            style={{ borderRadius: 0 }}
            className={`border-4 border-[#D0D0D0] focus:border-[#121212] bg-[#F0F0F0] px-2 py-2 text-sm w-full uppercase tracking-widest focus-visible:outline-none transition-colors duration-200 min-h-[44px] text-[#121212] font-bold ${FOCUS_RING}`}
          >
            <option value="">All Roles</option>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-4 ml-auto flex-wrap">
          {/* Show Deleted */}
          <label className="flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
            <span
              className={`relative inline-flex w-5 h-5 border-4 border-[#D0D0D0] shrink-0 items-center justify-center bg-transparent transition-colors duration-150 ${includeDeleted ? "bg-[#121212] border-[#121212]" : ""}`}
              style={{ borderRadius: 0 }}
            >
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className={`sr-only ${FOCUS_RING}`}
              />
              {includeDeleted && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 10 8"
                  className="w-2.5 h-2 text-[#F0F0F0] fill-none stroke-current stroke-2"
                >
                  <polyline points="1,4 4,7 9,1" />
                </svg>
              )}
            </span>
            <span className="text-xs uppercase tracking-widest text-[#121212] font-bold">
              Show Deleted
            </span>
          </label>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportCsv}
            className={`border-4 border-[#121212] text-[#121212] text-xs uppercase tracking-widest font-bold px-4 py-2 hover:bg-[#121212] hover:text-[#F0F0F0] transition-colors duration-200 min-h-[44px] ${FOCUS_RING}`}
            style={{ borderRadius: 0 }}
          >
            Export CSV
          </button>

          {/* New User */}
          <Link
            href="/admin/users/new"
            className={`bg-[#121212] text-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#505050] hover:-translate-x-0.5 hover:-translate-y-0.5 uppercase font-black tracking-widest text-xs px-6 py-3 transition-transform duration-150 min-h-[44px] inline-flex items-center ${FOCUS_RING}`}
            style={{ borderRadius: 0 }}
          >
            + New User
          </Link>
        </div>
      </section>

      {/* Running metadata */}
      <p className="text-xs text-[#808080] mb-4 uppercase tracking-widest font-bold">
        Wodooh · Office of the Registrar · Spring 2026 ·
        Generated: {generatedDate}
      </p>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="border-4 border-[#D02020] bg-[#FEE2E2] text-[#D02020] text-sm px-4 py-3 mb-4 uppercase tracking-widest font-bold"
          style={{ borderRadius: 0 }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[640px] border-collapse border-4 border-[#121212] text-sm"
          style={{ borderRadius: 0 }}
        >
          <caption className="sr-only">All users across the platform</caption>
          <thead>
            <tr className="bg-[#121212] text-[#F0F0F0]">
              {TABLE_COLUMNS.map((col) => {
                const isSorted = sortField === col.key;
                const sortable = col.sortable;
                return (
                  <th
                    key={String(col.key)}
                    scope="col"
                    aria-sort={sortable ? ariaSortFor(col.key) : undefined}
                    className="border border-[#333] px-4 py-3 text-left uppercase tracking-widest text-[10px] font-bold text-[#808080] border-b-4 border-[#121212]"
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1.5 uppercase tracking-widest font-bold text-[10px] hover:text-[#F0F0F0] transition-colors duration-150 ${FOCUS_RING}`}
                      >
                        {col.label}
                        <span aria-hidden="true" className="opacity-70">
                          {isSorted ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
              <th
                scope="col"
                className="border border-[#333] px-4 py-3 text-left uppercase tracking-widest text-[10px] font-bold text-[#808080] border-b-4 border-[#121212]"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length + 1}
                  className="border border-[#D0D0D0] px-4 py-10 text-center text-xs uppercase tracking-widest text-[#808080] font-bold"
                >
                  Loading users…
                </td>
              </tr>
            )}

            {!loading && pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length + 1}
                  className="border border-[#D0D0D0] px-4 py-14 text-center"
                >
                  <p className="text-lg font-black uppercase tracking-tight text-[#121212]">
                    No users found
                  </p>
                  <p className="text-sm text-[#808080] mt-1">
                    {filter || roleFilter
                      ? "Try clearing your search or role filter."
                      : "Add your first user to get started."}
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              pageRows.map((u) => {
                const role = u.role as UserRole;
                const created = u.createdAt
                  ? new Date(u.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";
                return (
                  <tr
                    key={u.uid}
                    className="border-b-2 border-[#D0D0D0] hover:bg-[#F0F0F0] transition-colors duration-150"
                  >
                    <td className="border border-[#D0D0D0] px-4 py-3 text-xs text-[#808080] font-mono">
                      {u.uid.slice(0, 12)}
                    </td>
                    <td className="border border-[#D0D0D0] px-4 py-3 font-bold text-[#121212]">
                      {u.name || "—"}
                    </td>
                    <td className="border border-[#D0D0D0] px-4 py-3 text-xs font-mono text-[#121212]">
                      {u.email}
                    </td>
                    <td className="border border-[#D0D0D0] px-4 py-3">
                      <RoleBadge role={role} />
                    </td>
                    <td className="border border-[#D0D0D0] px-4 py-3">
                      <StatusBadge active={u.active} />
                    </td>
                    <td className="border border-[#D0D0D0] px-4 py-3 text-xs font-mono text-[#808080]">
                      {created}
                    </td>
                    <td className="border border-[#D0D0D0] px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/users/${u.uid}`}
                          className={`text-xs uppercase tracking-widest font-bold px-3 py-1.5 border-4 border-transparent hover:border-[#121212] hover:bg-[#F0F0F0] transition-all duration-150 min-h-[36px] inline-flex items-center underline underline-offset-4 decoration-[#121212] text-[#121212] ${FOCUS_RING}`}
                          style={{ borderRadius: 0 }}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(u)}
                          className={`text-xs uppercase tracking-widest font-bold px-3 py-1.5 border-4 border-transparent hover:border-[#121212] hover:bg-[#F0F0F0] transition-all duration-150 min-h-[36px] text-[#121212] ${FOCUS_RING}`}
                          style={{ borderRadius: 0 }}
                        >
                          Reset
                        </button>
                        {u.active && (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(u)}
                            className={`text-xs uppercase tracking-widest font-bold px-3 py-1.5 border-4 border-[#D02020] text-[#D02020] hover:bg-[#D02020] hover:text-white transition-all duration-200 min-h-[36px] ${FOCUS_RING}`}
                            style={{ borderRadius: 0 }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <footer className="mt-6 flex items-center justify-between gap-4 border-t-4 border-[#121212] pt-4 flex-wrap">
        <p className="text-xs uppercase tracking-widest text-[#808080] font-bold">
          Page {safePage} of {totalPages} · Showing {pageRows.length} of{" "}
          {sorted.length}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className={`border-4 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:-translate-x-0.5 hover:-translate-y-0.5 text-[#121212] font-bold uppercase tracking-widest text-xs px-6 py-3 transition-transform duration-150 min-h-[44px] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 bg-[#F0F0F0] ${FOCUS_RING}`}
            style={{ borderRadius: 0 }}
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className={`border-4 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:-translate-x-0.5 hover:-translate-y-0.5 text-[#121212] font-bold uppercase tracking-widest text-xs px-6 py-3 transition-transform duration-150 min-h-[44px] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 bg-[#F0F0F0] ${FOCUS_RING}`}
            style={{ borderRadius: 0 }}
          >
            Next →
          </button>
        </div>
      </footer>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete user?"
        description={
          confirmDelete ? (
            <>
              <strong>{confirmDelete.name}</strong> ({confirmDelete.email}) will
              be soft-deleted and disabled in Firebase Auth. They can be
              restored from the &quot;Show Deleted&quot; view.
            </>
          ) : null
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleRowDelete}
      />
    </>
  );
}
