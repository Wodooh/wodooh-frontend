"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PermanentDeleteDialog } from "@/components/admin/permanent-delete-dialog";
import {
  patchUserFormSchema,
  type PatchUserFormValues,
} from "@/lib/admin/userSchema";
import {
  useAdminUser,
  useHardDeleteAdminUser,
  usePasswordReset,
  usePatchAdminUser,
  useSetUserGpa,
  useSoftDeleteAdminUser,
} from "@/lib/hooks/use-admin-users";
import { USER_ROLES, type UserRole } from "@/lib/types/user-doc.types";
import {
  useAdminUserAbsences,
  useDeleteAbsence,
  useUpsertAbsence,
} from "@/lib/hooks/use-admin-absences";
import { useCourses } from "@/lib/hooks/use-courses";

// -------------------------------------------------------------------------
// Bauhaus design tokens. Role badge colors per spec.
// -------------------------------------------------------------------------
const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin:      "nx-badge nx-role-admin",
  instructor: "nx-badge nx-role-instructor",
  student:    "nx-badge nx-role-student",
  chairman:   "nx-badge nx-role-chairman",
};

const BH_INPUT_CLASS =
  "w-full px-3 py-2 text-sm bg-[var(--nx-bg-elev)] text-[var(--nx-fg)] border border-[var(--nx-border-strong)] rounded-md focus-visible:outline-none focus-visible:border-[var(--nx-accent)] disabled:opacity-50 transition-colors duration-150";

const BH_PRIMARY_BTN = "nx-btn nx-btn-primary";

const BH_OUTLINE_BTN = "nx-btn nx-btn-ghost";

const BH_DESTRUCTIVE_BTN = "nx-btn nx-btn-danger";

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const uid = params?.id ?? null;

  const { user, loading, error, refetch } = useAdminUser(uid);
  const { patch, loading: saving } = usePatchAdminUser();
  const { setGpa, loading: savingGpa } = useSetUserGpa();
  const { softDelete, loading: deleting } = useSoftDeleteAdminUser();
  const { hardDelete, loading: hardDeleting } = useHardDeleteAdminUser();
  const { resetPassword } = usePasswordReset();

  // GPA lives on the Student role doc behind a dedicated endpoint, so it's a
  // separate controlled input rather than part of the react-hook-form patch.
  const [gpaInput, setGpaInput] = React.useState("");
  React.useEffect(() => {
    if (user?.role === "student") {
      setGpaInput(user.gpa != null ? String(user.gpa) : "");
    }
  }, [user?.role, user?.gpa]);

  const form = useForm<PatchUserFormValues>({
    resolver: zodResolver(patchUserFormSchema),
    values: user
      ? {
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          active: user.active,
        }
      : undefined,
  });

  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmPermanent, setConfirmPermanent] = React.useState(false);
  const [tab, setTab] = React.useState<"edit" | "raw">("edit");

  if (loading) {
    return (
      <section
        className="py-16 flex flex-col gap-4 bg-[var(--nx-bg-sub)]"
        aria-busy="true"
      >
        <div className="border border-[var(--nx-border)] p-8 max-w-sm bg-white">
          <p className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)] mb-2">
            Please wait
          </p>
          <p className="text-4xl font-semibold uppercase  text-[var(--nx-fg)]">
            Loading…
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 flex flex-col gap-4 bg-[var(--nx-bg-sub)]">
        <div
          role="alert"
          className="border border-[var(--nx-danger)] bg-white p-8 max-w-sm"
        >
          <p className="uppercase  text-[10px] font-bold text-[var(--nx-danger)] mb-2">
            Error
          </p>
          <p className="text-4xl font-semibold uppercase  text-[var(--nx-danger)] mb-3">
            Load Failed.
          </p>
          <p className="text-sm font-semibold text-[var(--nx-danger)]">{error}</p>
        </div>
      </section>
    );
  }

  if (!user || !uid) {
    return (
      <section className="py-16 flex flex-col gap-4 bg-[var(--nx-bg-sub)]">
        <div className="border border-[var(--nx-border)] bg-white p-8 max-w-sm">
          <p className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)] mb-2">
            404 · Not Found
          </p>
          <p className="text-4xl font-semibold uppercase  text-[var(--nx-fg)]">
            No user record matches this ID.
          </p>
        </div>
      </section>
    );
  }

  const initials = (user.displayName || user.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const onSubmit = async (values: PatchUserFormValues) => {
    // Send only changed fields, not the whole shape — matches PATCH semantics.
    const patchBody: Partial<PatchUserFormValues> = {};
    if (values.email !== user.email) patchBody.email = values.email;
    if (values.displayName !== user.displayName)
      patchBody.displayName = values.displayName;
    if (values.role !== user.role) patchBody.role = values.role;
    if (values.active !== user.active) patchBody.active = values.active;
    if (Object.keys(patchBody).length === 0) {
      toast.info("No changes.");
      return;
    }
    try {
      await patch(uid, patchBody);
      toast.success("User updated");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleSaveGpa = async () => {
    if (!uid) return;
    const value = Number(gpaInput);
    if (gpaInput.trim() === "" || !Number.isFinite(value) || value < 0 || value > 5) {
      toast.error("Enter a GPA between 0 and 5.");
      return;
    }
    try {
      await setGpa(uid, value);
      toast.success("GPA updated");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "GPA update failed");
    }
  };

  const handleSoftDelete = async () => {
    try {
      await softDelete(uid);
      toast.success("User deleted");
      setConfirmDelete(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      setConfirmDelete(false);
    }
  };

  const handleHardDelete = async () => {
    try {
      await hardDelete(uid);
      toast.success("User permanently deleted");
      router.push("/admin/users");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Permanent delete failed");
    } finally {
      setConfirmPermanent(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      const result = await resetPassword(uid);
      if (result.emailSent) {
        toast.success(`Reset email sent to ${user.email}`);
      } else {
        try {
          await navigator.clipboard.writeText(result.link);
        } catch {
          /* ignore */
        }
        toast.warning(
          "No email transport configured — link copied to clipboard.",
          { duration: 8000 }
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Password reset failed");
    }
  };

  const errors = form.formState.errors;
  const fieldValues = form.watch();

  return (
    <section className="min-h-screen bg-[var(--nx-bg-sub)]">
      {/* Running metadata */}
      <p className="text-[10px] text-[var(--nx-fg-muted)] mb-4 uppercase  font-bold">
        Wodooh · Admin Portal · User Record · Generated: {todayLabel()}
      </p>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 uppercase  text-xs font-bold text-[var(--nx-fg-muted)]">
          <li>
            <Link
              href="/admin"
              className="hover:text-[var(--nx-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nx-fg)] focus-visible:ring-offset-2"
            >
              Admin
            </Link>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li>
            <Link
              href="/admin/users"
              className="hover:text-[var(--nx-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nx-fg)] focus-visible:ring-offset-2"
            >
              Users
            </Link>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li className="text-[var(--nx-fg)] break-all" aria-current="page">
            {user.uid}
          </li>
        </ol>
      </nav>

      {/* Title block */}
      <header className="border-b border-[var(--nx-border)] pb-6 mb-8 flex flex-col gap-3">
        <h1 className="text-5xl font-semibold uppercase  text-[var(--nx-fg)]">
          {user.displayName}
        </h1>
        <p className="text-sm font-semibold text-[var(--nx-fg)]">{user.email}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={ROLE_BADGE_CLASS[user.role]}>{user.role}</span>
          {user.active ? (
            <span
              role="status"
              className="border-2 border-[var(--nx-border)] text-[var(--nx-fg)] bg-[var(--nx-warning)] uppercase font-bold text-[10px]  px-2 py-0.5"
            >
              Active
            </span>
          ) : (
            <span
              role="status"
              className="border-2 border-[var(--nx-danger)] text-[var(--nx-danger)] uppercase font-bold text-[10px]  px-2 py-0.5"
            >
              Inactive
            </span>
          )}
          {user.isSeed && (
            <span className="border-2 border-[var(--nx-border)] text-[var(--nx-fg)] uppercase font-bold text-[10px]  px-2 py-0.5">
              Seed Account
            </span>
          )}
        </div>
      </header>

      <div role="tablist" aria-label="User detail views" className="nx-tabs">
        <button
          role="tab"
          aria-selected={tab === "edit"}
          aria-controls="panel-edit"
          id="tab-edit"
          onClick={() => setTab("edit")}
          className="nx-tab"
          data-active={tab === "edit"}
        >
          Edit
        </button>
        <button
          role="tab"
          aria-selected={tab === "raw"}
          aria-controls="panel-raw"
          id="tab-raw"
          onClick={() => setTab("raw")}
          className="nx-tab"
          data-active={tab === "raw"}
        >
          Raw JSON
        </button>
      </div>

      {/* Edit panel */}
      {tab === "edit" && (
        <div
          id="panel-edit"
          role="tabpanel"
          aria-labelledby="tab-edit"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Identity panel */}
          <aside
            className="bg-white border border-[var(--nx-border)] p-6 flex flex-col gap-4"
            aria-label="Identity"
          >
            <h2 className="text-2xl lg:text-3xl font-semibold uppercase  text-[var(--nx-fg)]">
              Identity
            </h2>

            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="academic-texture bg-[var(--nx-fg)] text-white border border-[var(--nx-border)] w-20 h-20 flex items-center justify-center font-semibold text-3xl uppercase shrink-0"
              >
                {initials || "?"}
              </div>
              <div className="flex flex-col gap-1">
                <p className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]">
                  Display Name
                </p>
                <p className="text-base font-semibold text-[var(--nx-fg)]">
                  {user.displayName}
                </p>
              </div>
            </div>

            <dl className="flex flex-col mt-2">
              <FieldRow label="User ID" value={user.uid} mono />
              <FieldRow label="Email" value={user.email} mono />
              <FieldRow
                label="Role"
                value={user.role}
                renderValue={() => (
                  <span className={ROLE_BADGE_CLASS[user.role]}>
                    {user.role}
                  </span>
                )}
              />
              <FieldRow
                label="Status"
                value={user.active ? "Active" : "Inactive"}
                renderValue={() =>
                  user.active ? (
                    <span className="border-2 border-[var(--nx-border)] text-[var(--nx-fg)] bg-[var(--nx-warning)] uppercase font-bold text-[10px]  px-2 py-0.5">
                      Active
                    </span>
                  ) : (
                    <span className="border-2 border-[var(--nx-danger)] text-[var(--nx-danger)] uppercase font-bold text-[10px]  px-2 py-0.5">
                      Inactive
                    </span>
                  )
                }
              />
              <FieldRow
                label="Created"
                value={formatTimestamp(user.createdAt)}
                mono
              />
              <FieldRow
                label="Updated"
                value={formatTimestamp(user.updatedAt)}
                mono
              />
              <FieldRow
                label="Deleted At"
                value={formatTimestamp(user.deletedAt)}
                mono
              />
              <FieldRow
                label="Section IDs"
                value={
                  user.sectionIds.length === 0 ? "—" : user.sectionIds.join(", ")
                }
                mono
              />
              <FieldRow
                label="Course IDs"
                value={
                  user.courseIds.length === 0 ? "—" : user.courseIds.join(", ")
                }
                mono
                last
              />
            </dl>
          </aside>

          {/* Action / details panel */}
          <div
            className="bg-white border border-[var(--nx-border)] p-6 flex flex-col gap-6"
            aria-label="Edit and actions"
          >
            <h2 className="text-2xl lg:text-3xl font-semibold uppercase  text-[var(--nx-fg)]">
              Edit Record
            </h2>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
              noValidate
            >
              <div>
                <label
                  htmlFor="user-email"
                  className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)] block mb-1"
                >
                  Email
                </label>
                <input
                  id="user-email"
                  type="email"
                  style={{ }}
                  className={BH_INPUT_CLASS}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "user-email-error" : undefined}
                  {...form.register("email")}
                />
                {errors.email && (
                  <p
                    id="user-email-error"
                    role="alert"
                    className="text-xs font-semibold text-[var(--nx-danger)] mt-1"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="user-displayName"
                  className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)] block mb-1"
                >
                  Display Name
                </label>
                <input
                  id="user-displayName"
                  type="text"
                  style={{ }}
                  className={BH_INPUT_CLASS}
                  aria-invalid={!!errors.displayName}
                  aria-describedby={
                    errors.displayName ? "user-displayName-error" : undefined
                  }
                  {...form.register("displayName")}
                />
                {errors.displayName && (
                  <p
                    id="user-displayName-error"
                    role="alert"
                    className="text-xs font-semibold text-[var(--nx-danger)] mt-1"
                  >
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="user-role"
                  className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)] block mb-1"
                >
                  Role
                </label>
                <div className="relative">
                  <select
                    id="user-role"
                    style={{ }}
                    className="border border-[var(--nx-border-strong)] bg-[var(--nx-bg-sub)] focus:border-[var(--nx-border)] uppercase font-bold appearance-none cursor-pointer pr-8 px-3 py-2 text-sm w-full focus-visible:outline-none min-h-[44px] transition-colors duration-200"
                    aria-invalid={!!errors.role}
                    aria-describedby={errors.role ? "user-role-error" : undefined}
                    {...form.register("role")}
                  >
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--nx-fg-muted)] font-bold"
                  >
                    ▾
                  </span>
                </div>
                {errors.role && (
                  <p
                    id="user-role-error"
                    role="alert"
                    className="text-xs font-semibold text-[var(--nx-danger)] mt-1"
                  >
                    {errors.role.message}
                  </p>
                )}
              </div>

              <div className="border border-[var(--nx-border)] p-4 flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="user-active"
                    className="uppercase  text-[10px] font-bold text-[var(--nx-fg)]"
                  >
                    Active
                  </label>
                  <p className="text-xs font-semibold text-[var(--nx-fg-muted)] leading-relaxed max-w-xs">
                    Toggling off soft-deletes the user (sets deletedAt and
                    disables Auth login).
                  </p>
                </div>
                <input
                  id="user-active"
                  type="checkbox"
                  className="w-6 h-6 accent-[var(--nx-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nx-fg)] focus-visible:ring-offset-2 min-h-[44px]"
                  style={{ }}
                  checked={!!fieldValues.active}
                  onChange={(e) =>
                    form.setValue("active", e.target.checked, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>

              <div className="flex gap-3 pt-2 border-t border-[var(--nx-border)]">
                <button
                  type="submit"
                  disabled={saving}
                  style={{ }}
                  className={BH_PRIMARY_BTN}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>

            {/* Cumulative GPA — students only. Separate endpoint, not the patch form. */}
            {user.role === "student" && (
              <div className="border-t border-[var(--nx-border)] pt-6 flex flex-col gap-4">
                <h3 className="text-lg lg:text-xl font-semibold uppercase  text-[var(--nx-fg)]">
                  Cumulative GPA
                </h3>
                <p className="text-xs font-semibold text-[var(--nx-fg-muted)] leading-relaxed max-w-md">
                  5.0 scale. Saving marks the value as manually entered, which
                  overrides any future SIS sync.
                  {user.gpa != null && (
                    <>
                      {" "}
                      Current:{" "}
                      <span className="font-mono">{user.gpa.toFixed(2)}</span>
                      {user.gpaSource ? ` (${user.gpaSource})` : ""}.
                    </>
                  )}
                </p>
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="user-gpa"
                      className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]"
                    >
                      GPA (0–5)
                    </label>
                    <input
                      id="user-gpa"
                      type="number"
                      min={0}
                      max={5}
                      step={0.01}
                      inputMode="decimal"
                      value={gpaInput}
                      onChange={(e) => setGpaInput(e.target.value)}
                      className={BH_INPUT_CLASS}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingGpa}
                    onClick={handleSaveGpa}
                    className={BH_PRIMARY_BTN}
                  >
                    {savingGpa ? "Saving…" : "Save GPA"}
                  </button>
                </div>
              </div>
            )}

            {/* Absences — students only. Feeds the chairman's Attendance ×
                Engagement × GPA report. Separate endpoint, manual entries
                override SIS sync. */}
            {user.role === "student" && <AbsencesSection userId={uid} />}

            {/* Account actions */}
            <div className="border-t border-[var(--nx-border)] pt-6 flex flex-col gap-4">
              <h3 className="text-lg lg:text-xl font-semibold uppercase  text-[var(--nx-fg)]">
                Account Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  style={{ }}
                  className={BH_OUTLINE_BTN}
                >
                  Send Password Reset
                </button>
                {user.active ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    style={{ }}
                    className={BH_DESTRUCTIVE_BTN}
                    aria-haspopup="dialog"
                  >
                    Deactivate User
                  </button>
                ) : (
                  // Hard-delete is ONLY surfaced for already-soft-deleted
                  // users. The two-step backend ordering (must soft-delete
                  // before permanent) is mirrored as a two-step admin flow.
                  <button
                    type="button"
                    onClick={() => setConfirmPermanent(true)}
                    style={{ }}
                    className={BH_DESTRUCTIVE_BTN}
                    aria-haspopup="dialog"
                  >
                    Permanently Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON panel */}
      {tab === "raw" && (
        <div
          id="panel-raw"
          role="tabpanel"
          aria-labelledby="tab-raw"
          className="bg-white border border-[var(--nx-border)] p-6 flex flex-col gap-4"
        >
          <p className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]">
            Firestore Document · Raw
          </p>
          <p className="text-sm font-semibold text-[var(--nx-fg)] leading-relaxed">
            The Firestore document as it actually is. Use this when the form
            abstraction lies and you need to see what&apos;s on disk.
          </p>
          <pre className="text-xs bg-[var(--nx-fg)] text-white p-6 overflow-auto border border-[var(--nx-border)]">
            {JSON.stringify(user, null, 2)}
          </pre>
          <div>
            <button
              type="button"
              style={{ }}
              className={BH_OUTLINE_BTN}
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(user, null, 2));
                toast.success("Copied to clipboard");
              }}
            >
              Copy JSON
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete user?"
        description={
          <>
            <strong>{user.displayName}</strong> ({user.email}) will be soft-
            deleted and disabled in Firebase Auth. Restore from the &quot;Show
            deleted&quot; view on the users list.
          </>
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleSoftDelete}
      />
      <PermanentDeleteDialog
        open={confirmPermanent}
        onOpenChange={setConfirmPermanent}
        email={user.email}
        loading={hardDeleting}
        onConfirm={handleHardDelete}
      />
    </section>
  );
}

function AbsencesSection({ userId }: { userId: string }) {
  const { data: absences, loading, error, refetch } = useAdminUserAbsences(userId);
  const { upsert, loading: saving } = useUpsertAbsence();
  const { remove, loading: deleting } = useDeleteAbsence();
  // The course picker needs the full catalog; the demo has a handful of
  // courses, so a generous page size keeps it to one request.
  const { courses } = useCourses({ limit: 200 });

  const [courseId, setCourseId] = React.useState("");
  const [excused, setExcused] = React.useState("0");
  const [unexcused, setUnexcused] = React.useState("0");

  // Picking a course that already has a record prefills the form so the admin
  // is editing the existing value rather than blindly overwriting it.
  const onPickCourse = (id: string) => {
    setCourseId(id);
    const existing = absences.find((a) => a.courseId === id);
    setExcused(existing ? String(existing.excused) : "0");
    setUnexcused(existing ? String(existing.unexcused) : "0");
  };

  const handleSave = async () => {
    if (!courseId) {
      toast.error("Select a course.");
      return;
    }
    const ex = Number(excused);
    const un = Number(unexcused);
    if (![ex, un].every((n) => Number.isInteger(n) && n >= 0)) {
      toast.error("Excused and unexcused must be whole numbers ≥ 0.");
      return;
    }
    try {
      await upsert(userId, { courseId, excused: ex, unexcused: un });
      toast.success("Absence recorded");
      setCourseId("");
      setExcused("0");
      setUnexcused("0");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record absence");
    }
  };

  const handleDelete = async (cid: string) => {
    try {
      await remove(userId, cid);
      toast.success("Absence removed");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove absence");
    }
  };

  return (
    <div className="border-t border-[var(--nx-border)] pt-6 flex flex-col gap-4">
      <h3 className="text-lg lg:text-xl font-semibold uppercase  text-[var(--nx-fg)]">
        Absences
      </h3>
      <p className="text-xs font-semibold text-[var(--nx-fg-muted)] leading-relaxed max-w-md">
        Per-course absence counts feed the chairman&apos;s Attendance ×
        Engagement × GPA report. Saving marks the record as manually entered,
        which overrides any future SIS sync.
      </p>

      {error && (
        <p role="alert" className="text-xs font-semibold text-[var(--nx-danger)]">
          {error}
        </p>
      )}

      {/* Existing records */}
      {loading ? (
        <p className="text-xs font-semibold text-[var(--nx-fg-muted)]">Loading…</p>
      ) : absences.length === 0 ? (
        <p className="text-xs font-semibold text-[var(--nx-fg-muted)]">
          No absence records yet.
        </p>
      ) : (
        <table className="w-full text-sm border border-[var(--nx-border)]">
          <thead>
            <tr className="bg-[var(--nx-bg-sub)] text-left">
              <th className="px-3 py-2 uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]">
                Course
              </th>
              <th className="px-3 py-2 uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]">
                Excused
              </th>
              <th className="px-3 py-2 uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]">
                Unexcused
              </th>
              <th className="px-3 py-2 uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]">
                Total
              </th>
              <th className="px-3 py-2 uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]">
                Source
              </th>
              <th className="px-3 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {absences.map((a) => (
              <tr key={a._id} className="border-t border-[var(--nx-border)]">
                <td className="px-3 py-2 font-semibold text-[var(--nx-fg)]">
                  <button
                    type="button"
                    className="underline decoration-dotted hover:text-[var(--nx-accent)]"
                    onClick={() => onPickCourse(a.courseId)}
                    title="Edit this record"
                  >
                    {a.courseCode}
                  </button>
                </td>
                <td className="px-3 py-2 font-mono text-[var(--nx-fg)]">{a.excused}</td>
                <td className="px-3 py-2 font-mono text-[var(--nx-fg)]">{a.unexcused}</td>
                <td className="px-3 py-2 font-mono text-[var(--nx-fg)]">{a.total}</td>
                <td className="px-3 py-2">
                  <span className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]">
                    {a.source ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(a.courseId)}
                    className="uppercase  text-[10px] font-bold text-[var(--nx-danger)] hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add / edit form */}
      <div className="flex flex-wrap items-end gap-3 border-t border-[var(--nx-border)] pt-4">
        <div className="flex flex-col gap-1 min-w-[10rem]">
          <label
            htmlFor="absence-course"
            className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]"
          >
            Course
          </label>
          <select
            id="absence-course"
            value={courseId}
            onChange={(e) => onPickCourse(e.target.value)}
            className="border border-[var(--nx-border-strong)] bg-[var(--nx-bg-elev)] text-[var(--nx-fg)] px-3 py-2 text-sm rounded-md focus-visible:outline-none focus-visible:border-[var(--nx-accent)]"
          >
            <option value="">Select course…</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-24">
          <label
            htmlFor="absence-excused"
            className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]"
          >
            Excused
          </label>
          <input
            id="absence-excused"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={excused}
            onChange={(e) => setExcused(e.target.value)}
            className={BH_INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1 w-24">
          <label
            htmlFor="absence-unexcused"
            className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)]"
          >
            Unexcused
          </label>
          <input
            id="absence-unexcused"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={unexcused}
            onChange={(e) => setUnexcused(e.target.value)}
            className={BH_INPUT_CLASS}
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className={BH_PRIMARY_BTN}
        >
          {saving ? "Saving…" : "Save Absence"}
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  mono = false,
  last = false,
  renderValue,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
  renderValue?: () => React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${
        last ? "" : "border-b-2 border-[var(--nx-bg-hover)]"
      }`}
    >
      <dt className="uppercase  text-[10px] font-bold text-[var(--nx-fg-muted)] shrink-0">
        {label}
      </dt>
      <dd
        className={`text-right text-base font-semibold text-[var(--nx-fg)] break-all ${
          mono ? "font-mono" : ""
        }`}
      >
        {renderValue ? renderValue() : value}
      </dd>
    </div>
  );
}
