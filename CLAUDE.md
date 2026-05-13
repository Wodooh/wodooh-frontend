# Instructions for AI Assistants

## Project Overview

Wodooh Frontend - A university course management system built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (radix-ui + tailwind)
- **Icons**: Huge Icons
- **Deployment**: Vercel

## Backend Integration

This frontend connects to Wodooh Backend API (Express.js + MongoDB + JWT).

### Backend Details
- **Base URL**: `http://localhost:5000`
- **JWT Token Expiration**: 1 hour
- **Roles**: `admin`, `instructor`, `student`, `chairman`
- **Data Storage**: All text data stored in lowercase (emails, names)
- **Seeded Accounts** (all use `Password123`): `admin@wodooh.com` (admin), `instructor@wodooh.com` (instructor), `student@wodooh.com` (student), `chairman@wodooh.com` (chairman)

### API Client Structure

```
lib/
├── api/
│   ├── client.ts          # Base API client with fetch wrapper & JWT
│   ├── endpoints.ts       # Centralized API endpoint definitions
│   ├── error-handler.ts   # Unified error handling (422, 401, 403, 404, 409, 503)
│   └── server-client.ts   # Server-side fetch utilities
├── auth/
│   ├── jwt-manager.ts     # JWT token storage & validation
│   └── auth-provider.tsx  # React Context for auth state
├── hooks/
│   ├── use-auth.ts        # Login, logout, signup hooks
│   ├── use-health.ts      # Health check hook
│   ├── use-users.ts       # Get users with pagination, role filter, search
│   ├── use-update-role.ts # Update user role mutation
│   └── use-api.ts         # Generic API call hook for future endpoints
└── types/
    ├── api.types.ts       # API request/response types
    ├── auth.types.ts      # Auth-related types
    └── user.types.ts      # User model types
```

## Important Conventions

### File Organization
- Use `app/` for Next.js App Router pages
- Use `components/` for reusable components
- Use `lib/` for utilities, API clients, hooks, and types
- Use `docs/` for documentation

### Code Style
- TypeScript strict mode - always use proper types
- Use `import type` for type-only imports when possible
- Prefer functional components with hooks
- Use `async/await` for async operations
- Use lowercase for emails and names (backend requirement)

### API Calls
- Always use the existing hooks in `lib/hooks/` when available
- For new API endpoints, add to `lib/api/endpoints.ts` first
- Create new hooks in `lib/hooks/` following existing patterns
- Use `use-api` hook for generic/one-off API calls

### Authentication
- Use `useAuth` hook for authentication operations
- Wrap protected routes with `ProtectedRoute` component
- Use `hasRole()` method to check user permissions
- AuthProvider must be in root layout (`app/layout.tsx`)

### Error Handling
- Error types are defined in `lib/types/api.types.ts`
- Use error helpers from `lib/api/error-handler.ts`
- Handle different error codes appropriately (422, 401, 403, 404, 409, 503)

### Component Development
- Use shadcn/ui components from `@/components/ui/`
- Follow shadcn/ui patterns for component structure
- Use Tailwind CSS for styling (no inline styles)
- Use `cn()` utility from `lib/utils.ts` for class merging

## Currently Implemented Backend Endpoints

| Method | Endpoint | Hook/Usage |
|--------|----------|-------------|
| GET | `/health` | `useHealth()` |
| POST | `/auth/signup` | `useAuth().signup()` |
| POST | `/auth/login` | `useAuth().login()` |
| GET | `/auth/me` | `useAuthMe()` — also called by `AuthProvider` on app init to refresh the role from the server (closes the stale-role-after-demotion gap) |
| GET | `/admin/users` | `useUsers()` |
| PATCH | `/admin/users/:userId/role` | `useUpdateRole()` |
| GET | `/admin/departments` | `useDepartments()` |
| POST | `/admin/departments` | `useDepartments().createDepartment()` |
| PATCH | `/admin/departments/:id` | `useDepartments().updateDepartment()` |
| DELETE | `/admin/departments/:id` | `useDepartments().deleteDepartment()` |
| GET | `/admin/courses` | `useCourses()` |
| POST | `/admin/courses` | `useCourses().createCourse()` |
| PATCH | `/admin/courses/:id` | `useCourses().updateCourse()` |
| DELETE | `/admin/courses/:id` | `useCourses().deleteCourse()` |
| GET | `/admin/courses/:id/sections` | `useSections(courseId)` |
| POST | `/admin/courses/:id/sections` | `useSections(courseId).createSection()` |
| DELETE | `/admin/courses/:id/sections/:sectionId` | `useSections(courseId).deleteSection()` |
| GET | `/admin/audit-log` | `lib/api/endpoints.ts:AUDIT_LOG` (no hook yet) |

## Hook Patterns

All data hooks follow the same pattern: `useEffect` with a `cancelled` flag + `tick` counter for refetch. Do not use `useCallback` wrapping the fetch — it causes stale closure issues under React strict mode.

```typescript
const [tick, setTick] = useState(0);
useEffect(() => {
  let cancelled = false;
  setLoading(true);
  apiClient.get(url)
    .then(res => { if (cancelled) return; /* setState */ })
    .catch(err => { if (cancelled) return; setError(err.message); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [/* primitive deps */, tick]);
const refetch = useCallback(() => setTick(t => t + 1), []);
```

## When Adding New Features

1. **Add types first** in appropriate `lib/types/*.ts` file
2. **Add endpoint** to `lib/api/endpoints.ts`
3. **Create hook** in `lib/hooks/` following the pattern above
4. **Update this file's endpoint table**

## Testing Before Deployment

1. **TypeScript compilation**: Run `npx tsc --noEmit` to check for type errors
2. **Development server**: Run `npm run dev` and verify no build errors
3. **API integration**: Test with backend running on `localhost:5001`
4. **Authentication**: Test login, logout, and protected routes

## Build-before-push (mandatory)

**Never `git push` from this repo without first running a build and confirming it succeeds.** Vercel reuses the same Next.js build pipeline; pushing a broken build wastes a CI cycle and may publish a degraded preview/production deployment.

The required local sequence before any `git push`:

1. `npx tsc --noEmit` — type-check must be clean (pre-existing tracked errors aside; do not introduce new ones).
2. `npm run build` — the production Next.js build (`next build`) must complete with **exit code 0** and no compiler/static-analysis errors. Warnings are acceptable; errors are not.
3. Only after both pass, run `git push`.

If `npm run build` fails:
- **Do not** push.
- **Do not** push with `--no-verify` or any flag that bypasses the check.
- Diagnose and fix the underlying cause (type error, missing import, broken route, ESLint rule, etc.). Re-run the sequence after the fix.

If a build is too slow to run before every push and you're confident the diff is doc-only (e.g., editing a single Markdown file), `npx tsc --noEmit` alone is acceptable in lieu of the full `next build` — but the moment any `.ts`/`.tsx`/`.css`/`next.config.*`/route file changes, the full build is required again.

This rule applies to **all branches**, including feature branches like `refactor/*` and `fix/*`. It's not a CI substitute; it's a precondition for asking CI to run at all.

## Common Tasks

### Add a new API endpoint
1. Add endpoint URL to `lib/api/endpoints.ts`
2. Add request/response types to appropriate type file
3. Create hook in `lib/hooks/` using `use-api` or direct API calls

### Create a protected page
```tsx
import { ProtectedRoute } from '@/lib/auth/auth-provider';

export default function Page() {
  return (
    <ProtectedRoute allowedRoles="admin">
      {/* Page content */}
    </ProtectedRoute>
  );
}
```

### Make authenticated API call
```tsx
import { useApi } from '@/lib/hooks/use-api';

function Component() {
  const { data, loading, error } = useApi();

  const fetchData = async () => {
    const result = await get('/api/endpoint');
  };
}
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_TOKEN_EXPIRATION_MS=3600000
NEXT_PUBLIC_TOKEN_REFRESH_THRESHOLD_MS=300000
```

## Default Credentials

All seeded accounts use **`Password123`** as the password.

| Role | Email |
|------|-------|
| admin | `admin@wodooh.com` |
| instructor | `instructor@wodooh.com` |
| student | `student@wodooh.com` |
| chairman | `chairman@wodooh.com` |

In **development mode**, the login page shows a "Dev · Sign in as" panel — one-click buttons that log in with the seeded account for each role and redirect to that role's dashboard.

## Design System

The visual design system for every route — admin, role portals (student / instructor / chairman), authentication, onboarding, and marketing/splash — is **Nexus**, documented in [`DESIGN.md`](DESIGN.md). Treat that file as the canonical spec for tokens, components, and UI authoring rules. Do **not** keep a parallel design doc; if a rule belongs in the design system, update `DESIGN.md`.

`DESIGN.md` follows the [Google Stitch `DESIGN.md` format](https://github.com/google-labs-code/design.md): a YAML front-matter block of design tokens (`colors`, `typography`, `rounded`, `spacing`, `components`) followed by Markdown sections in canonical order — **Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts**. When adding or changing a design rule:

1. Update the relevant front-matter token if it's a value (color, type scale, radius, spacing, component property).
2. Update the matching prose section to explain the rule.
3. Preserve the canonical section order — Stitch validators warn on out-of-order or duplicate headings.
4. Token references use `{path.to.token}` (e.g. `{colors.primary}`); never embed hex literals in component definitions.

Implementation files referenced by `DESIGN.md`:

- `app/nexus.css` — the `--nx-*` token surface (light/dark via `[data-nx-theme]`, density via `[data-nx-density]`) and every `.nx-*` primitive.
- `app/globals.css` — Tailwind imports, the role-aware `--accent` cascade (`body.<role>`), shadcn/ui base tokens, and a couple of transitional helpers used by the onboarding wizards.
- `app/login/login.css` — the auth-shell variant (`--nl-*`), which mirrors `--nx-*` so login renders cold without the admin layout having booted.
- `app/{admin,student,instructor,chairman}/layout.tsx` — the four role shells; each follows the `nx-shell` pattern from `DESIGN.md` §Layout.

Design-related authoring rule: **no hex literals in `.tsx`** for new code. Always read values from `var(--nx-*)` or `var(--accent)`. The Bauhaus / Northfield utilities documented in earlier doc revisions (`.bauhaus-*`, `.font-nf-*`, `.dashboard-*`) have been removed from `globals.css`; re-introducing them is a regression.

## Documentation

- [DESIGN.md](DESIGN.md) - **Canonical** design system (Nexus) in Google Stitch format
- [API Integration Guide](docs/API_INTEGRATION.md) - Complete API usage examples
- [README.md](README.md) - Project overview and setup instructions
- Backend API documentation in `../wodooh-backend/`

## Notes

- Backend stores all text data in lowercase - normalize emails/names before sending
- JWT tokens expire after 1 hour - users must re-login
- Backend doesn't have refresh tokens yet (planned feature)
- Use TypeScript strictly - no `any` types unless absolutely necessary
- Follow existing code patterns and conventions
