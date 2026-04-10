# Wodooh Frontend API Integration Guide

This guide documents how to integrate the Next.js 16 frontend with the Wodooh Backend API (Express.js + MongoDB + JWT).

## Table of Contents

- [Backend Details](#backend-details)
- [Setup](#setup)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [React Hooks](#react-hooks)
- [Error Handling](#error-handling)
- [Type Safety](#type-safety)
- [Examples](#examples)

## Backend Details

- **Base URL**: `http://localhost:5000`
- **JWT Token Expiration**: `1h` (3600000 ms)
- **Roles**: `admin`, `instructor`, `student`, `chairman`
- **Data Storage**: All text data stored in lowercase (emails, names)
- **Default Admin**: `admin@wodooh.com` / `Password123`

### Currently Implemented Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/signup` | User registration |
| POST | `/auth/login` | User login |
| GET | `/admin/users` | Get users (with pagination, role filter, search) |
| PATCH | `/admin/users/:userId/role` | Update user role |

### Planned Backend Features

- Refresh tokens
- User profile management
- Dashboard/stats endpoint
- Email verification & password reset
- Course management
- Rate limiting
- Password strength validation

## Setup

### Environment Variables

The following environment variables are configured in `.env`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Token Settings (matches backend JWT_EXPIRES_IN)
NEXT_PUBLIC_TOKEN_EXPIRATION_MS=3600000
NEXT_PUBLIC_TOKEN_REFRESH_THRESHOLD_MS=300000
```

### Wrapping Your App with AuthProvider

In your root layout (`app/layout.tsx`), wrap the app with `AuthProvider`:

```tsx
import { AuthProvider } from '@/lib/auth/auth-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Authentication

### Using the `useAuth` Hook

The `useAuth` hook provides authentication state and methods:

```tsx
import { useAuth } from '@/lib/hooks/use-auth';

function LoginForm() {
  const { login, logout, signup, user, isAuthenticated, loading, error } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login({ email, password });
      // Token automatically stored, auth state updated
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleSignup = async (email: string, password: string, name: string) => {
    try {
      await signup({ email, password, name });
      // Token automatically stored, auth state updated
    } catch (err) {
      console.error('Signup failed:', err);
    }
  };

  const handleLogout = () => {
    logout();
    // Token cleared, auth state reset
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.name}!</p>
          <p>Role: {user?.role}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div>
          <button onClick={() => handleLogin('user@example.com', 'password123')}>
            Login
          </button>
        </div>
      )}
    </div>
  );
}
```

### Using Protected Routes

Use the `ProtectedRoute` component to restrict access:

```tsx
import { ProtectedRoute } from '@/lib/auth/auth-provider';
import { useAuth } from '@/lib/hooks/use-auth';

function Dashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div>
        <h1>Dashboard</h1>
        <p>Welcome, {user?.name}!</p>
      </div>
    </ProtectedRoute>
  );
}

function AdminPanel() {
  return (
    <ProtectedRoute allowedRoles="admin">
      <div>
        <h1>Admin Panel</h1>
        <p>Only admins can see this.</p>
      </div>
    </ProtectedRoute>
  );
}

function InstructorOrAdminPanel() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'instructor']}>
      <div>
        <h1>Instructor & Admin Panel</h1>
        <p>Only instructors and admins can see this.</p>
      </div>
    </ProtectedRoute>
  );
}
```

## API Endpoints

### Endpoint Definitions

All endpoints are defined in `lib/api/endpoints.ts`:

```ts
import API_ENDPOINTS from '@/lib/api/endpoints';

console.log(API_ENDPOINTS.HEALTH);         // http://localhost:5000/health
console.log(API_ENDPOINTS.LOGIN);         // http://localhost:5000/auth/login
console.log(API_ENDPOINTS.USERS);         // http://localhost:5000/admin/users
console.log(API_ENDPOINTS.USER_ROLE('123')); // http://localhost:5000/admin/users/123/role
```

## React Hooks

### `useHealth` - Health Check

Monitor backend health and database connection:

```tsx
import { useHealth } from '@/lib/hooks/use-health';

function SystemStatus() {
  const { data: health, loading, isHealthy, checkHealth } = useHealth({
    enabled: true,
    refreshInterval: 60000, // Check every minute
  });

  if (loading) return <p>Checking system status...</p>;

  return (
    <div className={isHealthy ? 'text-green-600' : 'text-red-600'}>
      <p>Database: {health?.dbConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Status: {health?.status}</p>
      <button onClick={checkHealth}>Refresh</button>
    </div>
  );
}
```

### `useUsers` - Get Users (Admin Only)

Fetch users with pagination, role filtering, and search:

```tsx
import { useUsers } from '@/lib/hooks/use-users';
import { useAuth } from '@/lib/hooks/use-auth';

function UsersTable() {
  const { user } = useAuth();
  const { users, loading, error, pagination, nextPage, prevPage, goToPage } = useUsers({
    page: 1,
    limit: 10,
    role: 'student',
    query: 'ahmed'
  });

  if (!user || user.role !== 'admin') {
    return <div>Access denied</div>;
  }

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Users ({pagination?.totalUsers})</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button onClick={prevPage} disabled={!pagination?.hasPrevPage}>
          Previous
        </button>
        <span>
          Page {pagination?.currentPage} of {pagination?.totalPages}
        </span>
        <button onClick={nextPage} disabled={!pagination?.hasNextPage}>
          Next
        </button>
      </div>
    </div>
  );
}
```

### `useUpdateRole` - Update User Role

Change a user's role:

```tsx
import { useUpdateRole } from '@/lib/hooks/use-update-role';

function UserRoleSelector({ userId, currentRole }: { userId: string; currentRole: string }) {
  const { updateRole, loading, error } = useUpdateRole();

  const handleChange = async (newRole: string) => {
    try {
      await updateRole(userId, { role: newRole });
      // User role updated
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  return (
    <div>
      <select
        defaultValue={currentRole}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
      >
        <option value="admin">Admin</option>
        <option value="instructor">Instructor</option>
        <option value="student">Student</option>
        <option value="chairman">Chairman</option>
      </select>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}
```

### `useApi` - Generic API Hook

Use the generic hook for custom API calls or planned features:

```tsx
import { useApi } from '@/lib/hooks/use-api';
import API_ENDPOINTS from '@/lib/api/endpoints';

function CustomComponent() {
  const { data, loading, error, execute, get, post, patch } = useApi<{ name: string }>();

  const fetchData = async () => {
    const result = await get(API_ENDPOINTS.HEALTH);
    console.log('Health check result:', result);
  };

  const createData = async () => {
    const result = await post('/api/custom', { name: 'test' });
    console.log('Created:', result);
  };

  return (
    <div>
      <button onClick={fetchData}>Fetch Data</button>
      <button onClick={createData}>Create Data</button>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && <div>Data: {JSON.stringify(data)}</div>}
    </div>
  );
}
```

## Error Handling

The API client handles different error codes:

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_FAILED` | 422 | Validation failed - show input errors |
| `UNAUTHORIZED` | 401 | Unauthorized - redirect to login |
| `FORBIDDEN` | 403 | Forbidden - show permission denied message |
| `NOT_FOUND` | 404 | Not found - show resource not found |
| `CONFLICT` | 409 | Conflict - show specific message (email exists, duplicate role) |
| `DATABASE_ERROR` | 503 | Database connection failed / maintenance mode |

### Handling Errors

```tsx
import { useAuth } from '@/lib/hooks/use-auth';
import { isAuthError, isValidationError, getFieldErrors } from '@/lib/api/error-handler';

function LoginForm() {
  const { login, loading, error } = useAuth();

  const handleSubmit = async (email: string, password: string) => {
    try {
      await login({ email, password });
    } catch (err: any) {
      if (isAuthError(err)) {
        console.log('Please log in again');
      } else if (isValidationError(err)) {
        const fieldErrors = getFieldErrors(err);
        console.log('Validation errors:', fieldErrors);
      }
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit('email@example.com', 'password')}>
      {error && <div className="error">{error}</div>}
      {/* form fields */}
    </form>
  );
}
```

## Type Safety

All API interactions are fully typed. Import types from:

- `lib/types/api.types.ts` - Base API response types, pagination, errors
- `lib/types/auth.types.ts` - Auth types (credentials, tokens, login response)
- `lib/types/user.types.ts` - User model types with role unions

### Type Examples

```ts
import type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
} from '@/lib/types/api.types';

import type {
  LoginCredentials,
  SignupData,
  AuthState,
  LoginResponse,
} from '@/lib/types/auth.types';

import type {
  User,
  UserSafe,
  UserRole,
  UsersQueryParams,
  UsersResponse,
  UpdateRoleRequest,
} from '@/lib/types/user.types';

// Using types
const role: UserRole = 'admin';
const credentials: LoginCredentials = {
  email: 'admin@wodooh.com',
  password: 'Password123',
};
const queryParams: UsersQueryParams = {
  page: 1,
  limit: 10,
  role: 'student',
  query: 'ahmed',
};
```

## Examples

### Complete Login Flow

```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      // Redirect to dashboard on success
      window.location.href = '/dashboard';
    } catch (err) {
      // Error is already set in the hook state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Complete User Management (Admin)

```tsx
'use client';

import { useState } from 'react';
import { useUsers } from '@/lib/hooks/use-users';
import { useUpdateRole } from '@/lib/hooks/use-update-role';
import { useAuth } from '@/lib/hooks/use-auth';
import { UserRole } from '@/lib/types/user.types';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { users, loading, pagination, nextPage, prevPage, goToPage, refetch } = useUsers({
    page: 1,
    limit: 10,
  });
  const { updateRole, loading: updateLoading } = useUpdateRole();
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateRole(userId, { role: newRole });
      refetch();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleSearch = () => {
    refetch({ query: searchQuery, role: roleFilter === 'all' ? undefined : roleFilter });
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return <div>Access denied</div>;
  }

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <h1>User Management</h1>

      {/* Filters */}
      <div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="instructor">Instructor</option>
          <option value="student">Student</option>
          <option value="chairman">Chairman</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email"
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {/* Users table */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user._id, e.target.value as UserRole)}
                  disabled={updateLoading || user._id === currentUser._id}
                >
                  <option value="admin">Admin</option>
                  <option value="instructor">Instructor</option>
                  <option value="student">Student</option>
                  <option value="chairman">Chairman</option>
                </select>
              </td>
              <td>
                {user._id === currentUser._id && <span>Cannot change your own role</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && (
        <div>
          <button onClick={prevPage} disabled={!pagination.hasPrevPage}>
            Previous
          </button>
          <span>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button onClick={nextPage} disabled={!pagination.hasNextPage}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

### Server-Side Fetching

```tsx
import { serverGet, requireServerAdmin, getServerUser } from '@/lib/api/server-client';

async function AdminDashboard() {
  const user = await requireServerAdmin();

  if (!user) {
    return <div>Access denied</div>;
  }

  const usersResponse = await serverGet('/admin/users', {
    cache: 'no-store',
    next: { tags: ['users'] },
  });

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user.name}</p>
      <pre>{JSON.stringify(usersResponse.data, null, 2)}</pre>
    </div>
  );
}

export default AdminDashboard;
```

## Future Expansion

When the backend adds new features, extend the frontend by:

1. Add new endpoint to `lib/api/endpoints.ts`
2. Add new types to appropriate type file
3. Create new hook in `lib/hooks/` or use generic `useApi`
4. Update AuthProvider if new auth-related state needed

### Example: Adding User Profile

```ts
// 1. Add endpoint in lib/api/endpoints.ts
PROFILE: buildUrl('/profile'),

// 2. Add types in lib/types/user.types.ts
export interface UserProfile {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

// 3. Create hook lib/hooks/use-profile.ts
export const useProfile = () => {
  const { data, loading, error } = useFetch<UserProfile>(
    () => apiClient.get<UserProfile>(API_ENDPOINTS.PROFILE)
  );
  return { data, loading, error };
};
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend allows requests from frontend origin
2. **Invalid Token**: Token expires after 1 hour - users must re-login
3. **403 Forbidden**: Check user role - some endpoints require admin role
4. **422 Validation Failed**: Backend stores emails/names in lowercase - normalize before sending

### Debug Mode

Enable console logging in `lib/api/client.ts` to debug requests:

```ts
// In client.ts, add:
console.log('API Request:', { method, url, headers, body });
console.log('API Response:', { status, data });
```

## Support

For issues or questions:
- Check backend API documentation
- Review TypeScript types in `lib/types/`
- Check error codes in `lib/api/error-handler.ts`
