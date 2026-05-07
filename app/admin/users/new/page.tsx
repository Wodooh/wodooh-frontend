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
  "border-4 border-[#D0D0D0] bg-[#F0F0F0] px-3 text-sm w-full focus:border-[#121212] focus:shadow-[4px_4px_0px_0px_#121212] focus:outline-none transition-all duration-150 h-12";

const labelClass =
  "uppercase tracking-widest text-[11px] font-bold text-[#121212] block mb-1";

const errorClass = "text-xs text-[#D02020] font-bold mt-1";

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
      {/* Metadata line */}
      <p className="text-xs text-[#808080] mb-4 uppercase tracking-widest font-bold">
        Wodooh · Administration · Spring 2026 · Generated: 03 May 2026
      </p>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[#808080]">
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
          <li className="text-[#121212]" aria-current="page">
            New
          </li>
        </ol>
      </nav>

      {/* Page header */}
      <header className="mb-8 border-b-4 border-[#121212] pb-6">
        <h1 className="text-5xl font-black uppercase tracking-tight text-[#121212]">
          Create User
        </h1>
        <p className="text-sm lg:text-base text-[#121212] leading-relaxed mt-3 max-w-2xl">
          The new user receives a password-setup link by email (or returned
          here when no email transport is configured). No password is set
          or handled by you.
        </p>
      </header>

      {/* Success banner */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 max-w-2xl border-4 border-[#1040C0] bg-[#EEF2FF] text-[#1040C0] font-bold text-xs uppercase tracking-wide px-4 py-3"
        >
          {successMessage}
        </div>
      )}

      {/* Form card */}
      <section className="bg-white border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] p-8 max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-[#808080] font-bold mb-2">
          Form · User Provisioning
        </p>
        <h2 className="font-black text-2xl lg:text-3xl uppercase tracking-tight text-[#121212] mb-6">
          New Account Details
        </h2>

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

          <div className="flex items-center gap-3 pt-4 border-t-4 border-[#121212]">
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="bg-[#121212] text-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#505050] hover:-translate-x-0.5 hover:-translate-y-0.5 uppercase font-black tracking-widest text-xs px-6 h-12 min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2 transition-transform duration-150"
            >
              {loading || isSubmitting ? "Creating…" : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-white text-[#121212] border-4 border-[#D0D0D0] hover:border-[#121212] hover:shadow-[3px_3px_0px_0px_#121212] uppercase font-bold tracking-wider text-xs px-4 h-12 min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2 transition-all duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>

      <div className="py-12 text-center text-xs text-[#808080] tracking-[1em] uppercase font-bold">
        · · · · ·
      </div>
    </ProtectedRoute>
  );
}
