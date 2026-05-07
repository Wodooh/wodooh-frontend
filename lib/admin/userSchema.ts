import { z } from "zod";
import {
  USER_ROLES,
  type UserDoc,
} from "@/lib/types/user-doc.types";

/**
 * Frontend twin of backend's userDocSchema. Shape MUST stay aligned with
 * the backend schema (different package, no shared module yet) — both pin
 * to UserDoc on their own side, so both sides are internally consistent.
 * If the two UserDocs ever diverge, that surfaces as a 422 at runtime, not
 * at build time. Keeping a shared types package is the longer-term fix.
 *
 * Wire-side timestamps are ISO strings, not Firestore Timestamps — that's
 * the only structural difference vs the backend schema.
 */
export const userDocSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(USER_ROLES),
  sectionIds: z.array(z.string()),
  courseIds: z.array(z.string()),
  searchTokens: z.array(z.string()),
  isSeed: z.boolean(),
  active: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Bidirectional pin: schema ⇆ UserDoc.
type _SchemaInferIsUserDoc = z.infer<typeof userDocSchema> extends UserDoc ? true : false;
type _UserDocIsSchemaInfer = UserDoc extends z.infer<typeof userDocSchema> ? true : false;
const _checkA: _SchemaInferIsUserDoc = true;
const _checkB: _UserDocIsSchemaInfer = true;
void _checkA;
void _checkB;

/**
 * Form-side schema for the create flow. Email + displayName + role only;
 * all other fields are server-managed.
 */
export const createUserFormSchema = userDocSchema
  .pick({ email: true, displayName: true, role: true });
export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

/**
 * Form-side schema for the edit flow. Each field is independently editable;
 * react-hook-form treats undefined as "no change," so the picked fields stay
 * required at the type level and we let the resolver default them to the
 * current values when populating the form.
 */
export const patchUserFormSchema = userDocSchema
  .pick({ email: true, displayName: true, role: true, active: true });
export type PatchUserFormValues = z.infer<typeof patchUserFormSchema>;
