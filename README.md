# Wodooh Frontend

Frontend application for Wodooh - a university course management system.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: Huge Icons
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

## Setup

### Installation

```bash
# Install dependencies
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### Environment Variables

This project uses a shared `.env` file from the parent directory (`../.env`). The frontend's `.env` is a symbolic link to the parent directory's `.env` file.

**No action needed** - just ensure the parent directory's `.env` file contains:
```env
# Backend API URL (change this for your backend)
NEXT_PUBLIC_API_URL=https://wodooh-backend.vercel.app
NEXT_PUBLIC_TOKEN_EXPIRATION_MS=3600000
NEXT_PUBLIC_TOKEN_REFRESH_THRESHOLD_MS=300000
```

### Development

```bash
# Start development server
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Project Structure

```
wodooh-frontend/
├── app/                      # Next.js App Router
│   ├── favicon.ico
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # Reusable components
├── lib/                     # Utility functions
├── public/                  # Static assets
├── components.json          # shadcn/ui configuration
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── vercel.json            # Vercel deployment config
```

## Features

### Built With

- **App Router**: Latest Next.js routing with React Server Components
- **TypeScript**: Full type safety across the application
- **Tailwind CSS 4**: Latest version with built-in CSS variable support
- **shadcn/ui**: Beautiful, accessible component library
- **Huge Icons**: Modern icon library for React

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint to check code quality |

## API Integration

This frontend connects to the Wodooh Backend API.

**Backend URL**: `https://wodooh-backend.vercel.app` (production) or `http://localhost:5001` (local)

**Response Format**:
```json
{
  "status": "success",
  "message": "Descriptive message",
  "data": { ... }
}
```

### Quick Setup

1. Make sure the parent directory's `.env` has your backend URL
2. Add `AuthProvider` to your `app/layout.tsx`:

```tsx
import { AuthProvider } from '@/lib/auth/auth-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

3. Use the auth hooks in your components:

```tsx
import { useAuth } from '@/lib/hooks/use-auth';

function LoginPage() {
  const { login, loading, error } = useAuth();
  // ... login form
}
```

### Backend Details

- **Local Port**: 5001
- **JWT Token Expiration**: 1 hour
- **Roles**: `admin`, `instructor`, `student`, `chairman`
- **Default Admin**: `admin@wodooh.com` / `Password123`
- **CORS**: Enabled for `localhost:3000` and `wodooh.vercel.app`

### Available Endpoints

| Method | Endpoint | Hook |
|--------|----------|------|
| GET | `/health` | `useHealth()` |
| POST | `/auth/signup` | `useAuth().signup()` |
| POST | `/auth/login` | `useAuth().login()` |
| GET | `/admin/users` | `useUsers()` |
| PATCH | `/admin/users/:userId/role` | `useUpdateRole()` |

### Common Examples

#### Protected Route
```tsx
import { ProtectedRoute } from '@/lib/auth/auth-provider';

function AdminPage() {
  return (
    <ProtectedRoute allowedRoles="admin">
      <h1>Admin Only</h1>
    </ProtectedRoute>
  );
}
```

#### Fetch Users (Admin)
```tsx
import { useUsers } from '@/lib/hooks/use-users';

function UserList() {
  const { users, loading } = useUsers({ page: 1, limit: 10 });

  if (loading) return <p>Loading...</p>;
  return <ul>{users.map(u => <li key={u._id}>{u.name}</li>)}</ul>;
}
```

**More details**: See [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md)

## Deployment

### Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your project on Vercel
3. Add environment variables
4. Deploy!

The project includes `vercel.json` for configuration.

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify
- DigitalOcean App Platform

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [React Documentation](https://react.dev) - Learn about React
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) - Learn about TypeScript
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Learn about Tailwind CSS
- [shadcn/ui Documentation](https://ui.shadcn.com/) - Learn about shadcn/ui components

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC
