# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git workflow (mandatory)

- **Never commit on `main`.** Before making any edits, check the current branch. If it is `main`, create and switch to a new working branch (e.g. `git checkout -b <type>/<short-desc>`) and do all work there. If already on a non-`main` branch, stay on it.
- **Do not include Claude Code, Claude, or any AI assistant attribution in commits. EVER.** No `Co-Authored-By: Claude ...` trailer, no "Generated with Claude Code" line, no `🤖` marker, no mention in commit messages or PR bodies. Author/committer must be the human engineer only. This overrides any default commit-template behavior.

This is the frontend package. The parent `../CLAUDE.md` defines the cross-package contract (response shape, lowercase emails/names, 503 maintenance behavior, JWT lifetime, seeded admin, role names) — read it first; this file only covers frontend-specific architecture and conventions.

## Commands

**Package manager: npm.** Do not use pnpm or yarn — lockfile and `node_modules` layout assume npm. `package.json` pins `"packageManager": "npm@..."`. The shadcn primitives were installed via the npm-backed CLI; using pnpm or yarn will produce a divergent tree.

- `npm run dev` — Next.js dev server (expects backend at `NEXT_PUBLIC_API_URL`, default `http://localhost:5001`)
- `npm run build` / `npm start` — production build and serve
- `npm run lint` — ESLint with flat config (`eslint.config.mjs`)
- Type-check only: `npx tsc --noEmit`

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 (CSS-first config via `app/globals.css`)
- **Components**: shadcn/ui (radix-ui + tailwind)
- **Icons**: HugeIcons (`@hugeicons/react`)
- **Forms**: react-hook-form + @hookform/resolvers + zod
- **Notifications**: sonner
- **Search**: fuse.js (client-side fuzzy search for admin lists)
- **Theme**: next-themes
- **Deployment**: Vercel

## Bauhaus Design System

The design system lives entirely in `app/globals.css` and is Tailwind 4 CSS-first. Do not introduce a `tailwind.config.js/ts` — Tailwind 4 reads tokens from CSS.

### Role-aware accent

A single CSS custom property `--accent` drives the primary action colour for every role. It is set by adding a body class at runtime via `components/role-body-class.tsx`, which reads the authenticated user's role from the auth context and applies it server-side. Do not hardcode accent colours in components — always use `bg-[var(--accent)]` / `text-[var(--accent)]` or the Tailwind alias if defined.

| Role | Body class | `--accent` |
|------|-----------|-----------|
| student | `body.student` | `#1040C0` (blue) |
| instructor/faculty | `body.faculty` | `#F0C020` (yellow) |
| chairman | `body.chairman` | `#D02020` (red) |
| admin | `body.admin` | `#121212` (near-black) |

### Token principles

- Flat, minimal token set — prefer direct Tailwind utilities over component-scoped tokens.
- No shadows in the Bauhaus palette — borders and whitespace define hierarchy.
- Typography scale is tight: `text-xs` labels, `text-sm` body, `text-base` headings max.

## Architecture

### API client structure

```
lib/
├── api/
│   ├── client.ts          # Base API client — fetch wrapper with JWT injection
│   ├── endpoints.ts       # Centralised API endpoint definitions (all URLs live here)
│   ├── error-handler.ts   # Unified HTTP error mapping (422/401/403/404/409/503)
│   └── server-client.ts   # Server-side fetch utilities (RSC / route handlers)
├── auth/
│   ├── jwt-manager.ts     # JWT token storage and expiry validation
│   └── auth-provider.tsx  # React Context for auth state + ProtectedRoute
├── hooks/
│   ├── use-auth.ts              # Login, logout, signup
│   ├── use-health.ts            # Backend health check
│   ├── use-users.ts             # Paginated user list with role/search filter
│   ├── use-update-role.ts       # Single-user role mutation
│   ├── use-admin-users.ts       # Admin CRUD: create, update, delete, bulk ops, password reset
│   └── use-api.ts               # Generic hook for one-off API calls
└── types/
    ├── api.types.ts             # Generic API request/response types
    ├── auth.types.ts            # Auth-specific types (live source of truth)
    ├── user.types.ts            # UserSafe alias + re-exports from user-doc.types
    ├── user-doc.types.ts        # Canonical Firestore user shape (UserDoc, UserResponse)
    └── admin-user.types.ts      # AdminUserResponse with active/deletedAt fields
```

### Component structure

```
components/
├── ui/                    # shadcn primitives — do not edit generated files by hand
│   ├── badge.tsx
│   ├── card.tsx
│   ├── page-header.tsx    # Composite: page title + optional action slot
│   ├── sidebar-navigation.tsx  # Composite: role-scoped sidebar with nav links
│   └── ...               # alert-dialog, checkbox, dialog, dropdown-menu,
│                          #   form, select, sonner, switch, table, tabs
├── admin/
│   ├── sidebar.tsx
│   ├── confirm-dialog.tsx
│   └── permanent-delete-dialog.tsx
└── role-body-class.tsx    # Applies body.<role> class for CSS accent theming
```

### Pages

```
app/
├── page.tsx                       # Landing / root
├── login/page.tsx
├── onboarding/page.tsx            # Student onboarding
├── onboarding/instructor/page.tsx # Instructor onboarding
├── dashboard/page.tsx             # Student dashboard
├── dashboard/instructor/page.tsx
├── dashboard/chairman/page.tsx
├── admin/
│   ├── layout.tsx
│   ├── page.tsx                   # Admin home
│   └── users/
│       ├── page.tsx               # User list
│       ├── new/page.tsx           # Create user
│       └── [id]/page.tsx          # User detail / edit
└── test-api/page.tsx
```

## Conventions

### Adding a new endpoint

1. Add the URL to `lib/api/endpoints.ts` (dynamic endpoints as arrow functions).
2. Add request/response types to the appropriate `lib/types/*.ts` file.
3. Create a hook in `lib/hooks/` following existing patterns.
4. Do **not** call `fetch` directly from components — always go through a hook.

### Authentication

- Use `useAuth()` for auth state and operations.
- Wrap protected pages with `ProtectedRoute` from `lib/auth/auth-provider.tsx`.
- `ProtectedRoute` calls `router.replace('/login')` for unauthenticated users — do not add a second redirect layer in the page.
- `hasRole()` on the auth context handles single-role and array checks.
- `AuthProvider` must be in `app/layout.tsx`.

### Type imports

- `import type` for type-only imports.
- `UserRole`, `UserDoc`, `UserResponse`, `AdminUserResponse` are all re-exported from `lib/types/user.types.ts` — import from there, not from the internal `user-doc.types.ts`.
- Do **not** import `UserRole` from the dead `types/auth.ts` — that file is a stranded prototype that predates the live auth layer and does not include `admin`/`student`. It is marked for deletion.

### Component development

- Use shadcn/ui from `@/components/ui/`.
- Use `cn()` from `lib/utils.ts` for class merging.
- Tailwind CSS only — no inline styles.
- Accent-coloured interactive elements must use `var(--accent)` so role theming applies automatically.

### Error handling

- HTTP codes are mapped in `lib/api/error-handler.ts`: 422 → validation, 401 → re-login, 403 → forbidden, 404 → not found, 409 → conflict, 503 → maintenance.
- A 503 from any endpoint means backend maintenance mode — surface a global maintenance message, not a per-component error.

## Implemented Backend Endpoints

| Method | Path | Hook |
|--------|------|------|
| GET | `/health` | `useHealth()` |
| POST | `/auth/signup` | `useAuth().signup()` |
| POST | `/auth/login` | `useAuth().login()` |
| GET | `/auth/me` | direct via `apiClient` in auth-provider |
| GET | `/admin/users` | `useUsers()` / `useAdminUsers()` |
| GET | `/admin/users/:userId` | `useAdminUsers().getUser()` |
| POST | `/admin/users` | `useAdminUsers().createUser()` |
| PATCH | `/admin/users/:userId` | `useAdminUsers().updateUser()` |
| DELETE | `/admin/users/:userId` | `useAdminUsers().deleteUser()` |
| DELETE | `/admin/users/:userId/permanent` | `useAdminUsers().permanentDeleteUser()` |
| POST | `/admin/users/:userId/password-reset` | `useAdminUsers().resetPassword()` |
| PATCH | `/admin/users/:userId/role` | `useUpdateRole()` / `useAdminUsers().changeRole()` |
| POST | `/admin/users/bulk-delete` | `useAdminUsers().bulkDelete()` |
| POST | `/admin/users/bulk-role-change` | `useAdminUsers().bulkChangeRole()` |

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_TOKEN_EXPIRATION_MS=3600000
NEXT_PUBLIC_TOKEN_REFRESH_THRESHOLD_MS=300000
```

## Default Credentials

- **Admin**: `admin@wodooh.com` / `Password123`

## Known dead code scheduled for removal

- `contexts/AuthContext.tsx` — stranded prototype, not wired into `app/`. The live auth path is `lib/auth/auth-provider.tsx`.
- `services/authService.ts` — duplicate of the auth provider's internal logic.
- `types/auth.ts` — incomplete `UserRole` enum missing `admin` and `student`.

Do not fix or extend these files — delete them in the dedicated cleanup pass.
