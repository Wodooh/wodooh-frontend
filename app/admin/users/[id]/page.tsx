"use client";

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
  useSoftDeleteAdminUser,
} from "@/lib/hooks/use-admin-users";
import { USER_ROLES, type UserRole } from "@/lib/types/user-doc.types";

// -------------------------------------------------------------------------
// Bauhaus design tokens. Role badge colors per spec.
// -------------------------------------------------------------------------
const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin:
    "border-2 border-[#121212] text-[#121212] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5",
  instructor:
    "border-2 bg-[#F0C020] border-[#F0C020] text-[#121212] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5",
  student:
    "border-2 border-[#1040C0] text-[#1040C0] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5",
  chairman:
    "border-2 border-[#D02020] text-[#D02020] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5",
};

const BH_INPUT_CLASS =
  "border-b-4 border-[#121212] bg-transparent px-3 py-2 text-sm w-full focus-visible:bg-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2 transition-colors duration-200 min-h-[44px]";

const BH_PRIMARY_BTN =
  "bg-[#121212] text-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#505050] hover:-translate-x-0.5 uppercase font-black tracking-widest text-xs px-6 py-3 transition-all duration-200 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

const BH_OUTLINE_BTN =
  "border-4 border-[#121212] text-[#121212] uppercase font-black tracking-widest text-xs px-6 py-3 hover:bg-[#121212] hover:text-white transition-all duration-200 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2";

const BH_DESTRUCTIVE_BTN =
  "bg-[#D02020] text-white border-4 border-[#D02020] shadow-[4px_4px_0px_0px_#A81010] uppercase font-black tracking-widest text-xs px-6 py-3 hover:opacity-90 transition-all duration-200 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D02020] focus-visible:ring-offset-2";

const BH_GHOST_TAB =
  "text-xs uppercase tracking-widest font-bold px-4 py-2 transition-colors duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2";

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
  const { softDelete, loading: deleting } = useSoftDeleteAdminUser();
  const { hardDelete, loading: hardDeleting } = useHardDeleteAdminUser();
  const { resetPassword } = usePasswordReset();

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
        className="py-16 flex flex-col gap-4 bg-[#F0F0F0]"
        aria-busy="true"
      >
        <div className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] p-8 max-w-sm bg-white">
          <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080] mb-2">
            Please wait
          </p>
          <p className="text-4xl font-black uppercase tracking-tight text-[#121212]">
            Loading…
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 flex flex-col gap-4 bg-[#F0F0F0]">
        <div
          role="alert"
          className="border-4 border-[#D02020] shadow-[8px_8px_0px_0px_#D02020] bg-white p-8 max-w-sm"
        >
          <p className="uppercase tracking-widest text-[10px] font-bold text-[#D02020] mb-2">
            Error
          </p>
          <p className="text-4xl font-black uppercase tracking-tight text-[#D02020] mb-3">
            Load Failed.
          </p>
          <p className="text-sm font-semibold text-[#D02020]">{error}</p>
        </div>
      </section>
    );
  }

  if (!user || !uid) {
    return (
      <section className="py-16 flex flex-col gap-4 bg-[#F0F0F0]">
        <div className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white p-8 max-w-sm">
          <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080] mb-2">
            404 · Not Found
          </p>
          <p className="text-4xl font-black uppercase tracking-tight text-[#121212]">
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
    <section className="min-h-screen bg-[#F0F0F0]">
      {/* Running metadata */}
      <p className="text-[10px] text-[#808080] mb-4 uppercase tracking-widest font-bold">
        Wodooh · Admin Portal · User Record · Generated: {todayLabel()}
      </p>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 uppercase tracking-widest text-xs font-bold text-[#808080]">
          <li>
            <a
              href="/admin"
              className="hover:text-[#121212] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2"
            >
              Admin
            </a>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li>
            <a
              href="/admin/users"
              className="hover:text-[#121212] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2"
            >
              Users
            </a>
          </li>
          <li aria-hidden="true">&gt;</li>
          <li className="text-[#121212] break-all" aria-current="page">
            {user.uid}
          </li>
        </ol>
      </nav>

      {/* Title block */}
      <header className="border-b-4 border-[#121212] pb-6 mb-8 flex flex-col gap-3">
        <h1 className="text-5xl font-black uppercase tracking-tight text-[#121212]">
          {user.displayName}
        </h1>
        <p className="text-sm font-semibold text-[#121212]">{user.email}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={ROLE_BADGE_CLASS[user.role]}>{user.role}</span>
          {user.active ? (
            <span
              role="status"
              className="border-2 border-[#121212] text-[#121212] bg-[#F0C020] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5"
            >
              Active
            </span>
          ) : (
            <span
              role="status"
              className="border-2 border-[#D02020] text-[#D02020] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5"
            >
              Inactive
            </span>
          )}
          {user.isSeed && (
            <span className="border-2 border-[#121212] text-[#121212] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5">
              Seed Account
            </span>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="User detail views"
        className="flex border-b-4 border-[#121212] mb-6"
      >
        <button
          role="tab"
          aria-selected={tab === "edit"}
          aria-controls="panel-edit"
          id="tab-edit"
          onClick={() => setTab("edit")}
          style={{ borderRadius: 0 }}
          className={`${BH_GHOST_TAB} ${
            tab === "edit"
              ? "bg-[#121212] text-white"
              : "text-[#121212] hover:bg-[#E0E0E0]"
          }`}
        >
          Edit
        </button>
        <button
          role="tab"
          aria-selected={tab === "raw"}
          aria-controls="panel-raw"
          id="tab-raw"
          onClick={() => setTab("raw")}
          style={{ borderRadius: 0 }}
          className={`${BH_GHOST_TAB} ${
            tab === "raw"
              ? "bg-[#121212] text-white"
              : "text-[#121212] hover:bg-[#E0E0E0]"
          }`}
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
            className="bg-white border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] p-6 flex flex-col gap-4"
            aria-label="Identity"
          >
            <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-[#121212]">
              Identity
            </h2>

            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="academic-texture bg-[#121212] text-white border-4 border-[#121212] w-20 h-20 flex items-center justify-center font-black text-3xl uppercase shrink-0"
              >
                {initials || "?"}
              </div>
              <div className="flex flex-col gap-1">
                <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080]">
                  Display Name
                </p>
                <p className="text-base font-semibold text-[#121212]">
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
                    <span className="border-2 border-[#121212] text-[#121212] bg-[#F0C020] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5">
                      Active
                    </span>
                  ) : (
                    <span className="border-2 border-[#D02020] text-[#D02020] uppercase font-bold text-[10px] tracking-wider px-2 py-0.5">
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
            className="bg-white border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] p-6 flex flex-col gap-6"
            aria-label="Edit and actions"
          >
            <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-[#121212]">
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
                  className="uppercase tracking-widest text-[10px] font-bold text-[#808080] block mb-1"
                >
                  Email
                </label>
                <input
                  id="user-email"
                  type="email"
                  style={{ borderRadius: 0 }}
                  className={BH_INPUT_CLASS}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "user-email-error" : undefined}
                  {...form.register("email")}
                />
                {errors.email && (
                  <p
                    id="user-email-error"
                    role="alert"
                    className="text-xs font-semibold text-[#D02020] mt-1"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="user-displayName"
                  className="uppercase tracking-widest text-[10px] font-bold text-[#808080] block mb-1"
                >
                  Display Name
                </label>
                <input
                  id="user-displayName"
                  type="text"
                  style={{ borderRadius: 0 }}
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
                    className="text-xs font-semibold text-[#D02020] mt-1"
                  >
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="user-role"
                  className="uppercase tracking-widest text-[10px] font-bold text-[#808080] block mb-1"
                >
                  Role
                </label>
                <div className="relative">
                  <select
                    id="user-role"
                    style={{ borderRadius: 0 }}
                    className="border-4 border-[#D0D0D0] bg-[#F0F0F0] focus:border-[#121212] uppercase font-bold appearance-none cursor-pointer pr-8 px-3 py-2 text-sm w-full focus-visible:outline-none min-h-[44px] transition-colors duration-200"
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
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#808080] font-bold"
                  >
                    ▾
                  </span>
                </div>
                {errors.role && (
                  <p
                    id="user-role-error"
                    role="alert"
                    className="text-xs font-semibold text-[#D02020] mt-1"
                  >
                    {errors.role.message}
                  </p>
                )}
              </div>

              <div className="border-4 border-[#121212] p-4 flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="user-active"
                    className="uppercase tracking-widest text-[10px] font-bold text-[#121212]"
                  >
                    Active
                  </label>
                  <p className="text-xs font-semibold text-[#808080] leading-relaxed max-w-xs">
                    Toggling off soft-deletes the user (sets deletedAt and
                    disables Auth login).
                  </p>
                </div>
                <input
                  id="user-active"
                  type="checkbox"
                  className="w-6 h-6 accent-[#121212] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2 min-h-[44px]"
                  style={{ borderRadius: 0 }}
                  checked={!!fieldValues.active}
                  onChange={(e) =>
                    form.setValue("active", e.target.checked, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>

              <div className="flex gap-3 pt-2 border-t-4 border-[#121212]">
                <button
                  type="submit"
                  disabled={saving}
                  style={{ borderRadius: 0 }}
                  className={BH_PRIMARY_BTN}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>

            {/* Account actions */}
            <div className="border-t-4 border-[#121212] pt-6 flex flex-col gap-4">
              <h3 className="text-lg lg:text-xl font-black uppercase tracking-tight text-[#121212]">
                Account Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  style={{ borderRadius: 0 }}
                  className={BH_OUTLINE_BTN}
                >
                  Send Password Reset
                </button>
                {user.active ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    style={{ borderRadius: 0 }}
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
                    style={{ borderRadius: 0 }}
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
          className="bg-white border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] p-6 flex flex-col gap-4"
        >
          <p className="uppercase tracking-widest text-[10px] font-bold text-[#808080]">
            Firestore Document · Raw
          </p>
          <p className="text-sm font-semibold text-[#121212] leading-relaxed">
            The Firestore document as it actually is. Use this when the form
            abstraction lies and you need to see what&apos;s on disk.
          </p>
          <pre className="text-xs bg-[#121212] text-white p-6 overflow-auto border-4 border-[#121212]">
            {JSON.stringify(user, null, 2)}
          </pre>
          <div>
            <button
              type="button"
              style={{ borderRadius: 0 }}
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
        last ? "" : "border-b-2 border-[#E0E0E0]"
      }`}
    >
      <dt className="uppercase tracking-widest text-[10px] font-bold text-[#808080] shrink-0">
        {label}
      </dt>
      <dd
        className={`text-right text-base font-semibold text-[#121212] break-all ${
          mono ? "font-mono" : ""
        }`}
      >
        {renderValue ? renderValue() : value}
      </dd>
    </div>
  );
}
