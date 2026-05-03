# Instructions for AI Assistants

## Project Overview

Wodooh Frontend - A university course management system built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui.

**Package manager: npm.** Do not use pnpm or yarn — lockfile and `node_modules` layout assume npm. `package.json` pins `"packageManager": "npm@..."`. The frontend's shadcn primitives were installed via the npm-backed CLI; running `pnpm install` or `yarn install` will produce a divergent tree.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (radix-ui + tailwind)
- **Icons**: Huge Icons
- **Deployment**: Vercel

## Backend Integration

This frontend connects to Wodooh Backend API (Express.js + Firebase Admin SDK / Cloud Firestore + JWT).

### Backend Details
- **Base URL**: `http://localhost:5001` (configurable via `NEXT_PUBLIC_API_URL`)
- **JWT Token Expiration**: 1 hour
- **Roles**: `admin`, `instructor`, `student`, `chairman`
- **Data Storage**: All text data stored in lowercase (emails, names)
- **Default Admin**: `admin@wodooh.com` / `Password123`

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
| GET | `/admin/users` | `useUsers()` |
| PATCH | `/admin/users/:userId/role` | `useUpdateRole()` |

## When Adding New Features

1. **Add types first** in appropriate `lib/types/*.ts` file
2. **Add endpoint** to `lib/api/endpoints.ts`
3. **Create hook** in `lib/hooks/` following existing patterns
4. **Update documentation** in `docs/API_INTEGRATION.md`

## Planned Backend Features (Stubs Created)

The following endpoint stubs exist in `lib/api/endpoints.ts` for future implementation:

- Refresh tokens
- User profile management
- Dashboard/stats endpoint
- Email verification & password reset
- Course management
- Rate limiting
- Password strength validation

## Testing Before Deployment

1. **TypeScript compilation**: Run `npx tsc --noEmit` to check for type errors
2. **Development server**: Run `npm run dev` and verify no build errors
3. **API integration**: Test with backend running on `localhost:5001`
4. **Authentication**: Test login, logout, and protected routes

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
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_TOKEN_EXPIRATION_MS=3600000
NEXT_PUBLIC_TOKEN_REFRESH_THRESHOLD_MS=300000
```

## Default Credentials

- **Admin Email**: `admin@wodooh.com`
- **Admin Password**: `Password123`

## Documentation

- [API Integration Guide](docs/API_INTEGRATION.md) - Complete API usage examples
- [README.md](README.md) - Project overview and setup instructions
- Backend API documentation in `../wodooh-backend/`

## Notes

- Backend stores all text data in lowercase - normalize emails/names before sending
- JWT tokens expire after 1 hour - users must re-login
- Backend doesn't have refresh tokens yet (planned feature)
- Use TypeScript strictly - no `any` types unless absolutely necessary
- Follow existing code patterns and conventions
