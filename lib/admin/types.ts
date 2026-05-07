import type { ZodType } from "zod";

/**
 * Per-collection admin-dashboard configuration. The whole admin section is
 * driven by a registry of these — adding a new collection means adding one
 * entry to lib/admin/collections.ts, not editing route files or components.
 *
 * Type parameters:
 *   TDoc — the canonical on-disk shape (e.g., UserDoc). All column keys,
 *          read-only field names, and default sort key are checked against
 *          this type via `keyof TDoc`, so renaming a field on TDoc breaks
 *          the build at every config that referenced the old name.
 */
export interface CollectionConfig<TDoc extends object> {
  /** URL-safe slug. Routed at /admin/{slug}. */
  slug: string;
  /** Human label shown in the sidebar and page headers. */
  displayName: string;
  /** Which fields appear as columns in the list view, in this order. */
  columns: ReadonlyArray<keyof TDoc>;
  /** Sort key for the list view's default ordering. */
  defaultSort: { field: keyof TDoc; direction: "asc" | "desc" };
  /** Fields the form generator must render as read-only. */
  readOnlyFields: ReadonlyArray<keyof TDoc>;
  /**
   * Schema used by both list (typing the rows) and form (validation +
   * field-type inference). Frontend-side mirror of the backend schema.
   */
  schema: ZodType<TDoc>;
}

/**
 * Heterogeneous registry. Each entry pins its TDoc independently so a
 * `users` entry can use UserDoc and a future `sections` entry can use
 * SectionDoc — both type-checked, no `any`.
 */
export type CollectionRegistry = ReadonlyArray<
  CollectionConfig<object>
>;

/** Helper that infers TDoc from a config so call sites stay type-safe. */
export type CollectionDoc<C> = C extends CollectionConfig<infer T> ? T : never;
