import { userDocSchema } from "./userSchema";
import type { CollectionConfig } from "./types";
import type { UserDoc } from "@/lib/types/user-doc.types";

/**
 * THE SINGLE PLACE where new collections are wired into the admin dashboard.
 *
 * Adding a collection = adding one entry to this array. Routes, sidebar
 * entries, list views, and form generators all read from here. There is
 * intentionally no fallback for a slug that isn't in this registry — an
 * unknown slug yields a 404, not a "generic any-collection" view.
 *
 * Per the GP2 audit (step 1), `users` is the only collection with a typed
 * canonical model today. Sections, courses, vault, and audit_log will
 * land here as their TS types are defined alongside their write paths.
 */
export const USERS_COLLECTION: CollectionConfig<UserDoc> = {
  slug: "users",
  displayName: "Users",
  // keyof UserDoc — the compiler enforces every entry exists on the doc.
  columns: ["displayName", "email", "role", "active", "createdAt"],
  defaultSort: { field: "createdAt", direction: "desc" },
  // These never appear in editable form fields. Server-managed.
  readOnlyFields: [
    "uid",
    "sectionIds",
    "courseIds",
    "searchTokens",
    "isSeed",
    "deletedAt",
    "createdAt",
    "updatedAt",
  ],
  schema: userDocSchema,
};

export const collections = [USERS_COLLECTION] as const;

export function findCollection(slug: string) {
  return collections.find((c) => c.slug === slug);
}
