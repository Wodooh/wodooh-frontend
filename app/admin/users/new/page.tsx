"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createUserFormSchema,
  type CreateUserFormValues,
} from "@/lib/admin/userSchema";
import { useCreateAdminUser } from "@/lib/hooks/use-admin-users";
import { USER_ROLES } from "@/lib/types/user-doc.types";
import { ProtectedRoute } from "@/lib/auth/auth-provider";

const inputClass =
  "w-full px-3 text-sm bg-[var(--nx-bg-elev)] text-[var(--nx-fg)] border border-[var(--nx-border-strong)] rounded-md focus-visible:outline-none focus-visible:border-[var(--nx-accent)] disabled:opacity-50 transition-colors duration-150 h-9";

const labelClass = "nx-field-label";

const errorClass = "text-xs text-[var(--nx-danger)] mt-1";

export default function NewUserPage() {
  const router = useRouter();
  const { create, loading } = useCreateAdminUser();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { email: "", displayName: "", role: "student" },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      const normalized: CreateUserFormValues = {
        ...values,
        email: values.email.trim().toLowerCase(),
        displayName: values.displayName.trim().toLowerCase(),
      };
      const result = await create(normalized);
      if (result.setup.emailSent) {
        const msg = `User created. Setup email sent to ${normalized.email}.`;
        setSuccessMessage(msg);
        toast.success(msg);
      } else {
        try {
          await navigator.clipboard.writeText(result.setup.link);
        } catch {
          /* ignore */
        }
        const msg = `User created. Setup link copied to clipboard.`;
        setSuccessMessage(msg);
        toast.warning(
          `User created. No email transport configured — setup link copied to clipboard.`,
          { duration: 8000 }
        );
      }
      router.push(`/admin/users/${result.user.uid}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  };

  return (
    <ProtectedRoute allowedRoles="admin">
      <nav aria-label="Breadcrumb" style={{ marginBottom: 12 }}>
        <ol style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--nx-fg-muted)", listStyle: "none", padding: 0, margin: 0 }}>
          <li><a href="/admin" style={{ color: "var(--nx-fg-muted)", textDecoration: "none" }}>Admin</a></li>
          <li aria-hidden="true">›</li>
          <li><a href="/admin/users" style={{ color: "var(--nx-fg-muted)", textDecoration: "none" }}>Users</a></li>
          <li aria-hidden="true">›</li>
          <li style={{ color: "var(--nx-fg)" }} aria-current="page">New</li>
        </ol>
      </nav>

      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Create user</h1>
          <p className="nx-page-sub">
            The new user receives a password-setup link by email (or returned here when no email transport is configured). No password is set or handled by you.
          </p>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="nx-card nx-card-padded"
          style={{ borderColor: "var(--nx-accent)", color: "var(--nx-accent)", maxWidth: 560, marginBottom: "var(--nx-stack)", fontSize: 13 }}
        >
          {successMessage}
        </div>
      )}

      <section className="nx-card" style={{ maxWidth: 560 }}>
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">New account details</h3>
            <p className="nx-card-sub">Form · user provisioning</p>
          </div>
        </div>
        <div style={{ padding: 18 }}>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-6"
        >
          <div>
            <label htmlFor="displayName" className={labelClass}>
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="off"
              aria-invalid={errors.displayName ? "true" : "false"}
              aria-describedby={
                errors.displayName ? "displayName-error" : undefined
              }
              className={inputClass}
              {...register("displayName")}
            />
            {errors.displayName && (
              <p id="displayName-error" role="alert" className={errorClass}>
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="off"
              inputMode="email"
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : "email-hint"}
              className={inputClass}
              {...register("email")}
            />
            {errors.email ? (
              <p id="email-error" role="alert" className={errorClass}>
                {errors.email.message}
              </p>
            ) : (
              <p
                id="email-hint"
                className="text-xs text-[#808080] font-bold mt-1"
              >
                Stored in lowercase per backend convention.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="role" className={labelClass}>
              Role
            </label>
            <div className="relative">
              <select
                id="role"
                aria-invalid={errors.role ? "true" : "false"}
                aria-describedby={errors.role ? "role-error" : undefined}
                className={`${inputClass} appearance-none cursor-pointer pr-8`}
                {...register("role")}
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {/* Custom dropdown indicator */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#121212] font-bold"
              >
                ▾
              </span>
            </div>
            {errors.role && (
              <p id="role-error" role="alert" className={errorClass}>
                {errors.role.message}
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 12, borderTop: "1px solid var(--nx-border)" }}>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="nx-btn nx-btn-primary"
            >
              {loading || isSubmitting ? <><span className="nx-spin" /> Creating…</> : "Create user"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="nx-btn nx-btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
        </div>
      </section>
    </ProtectedRoute>
  );
}
