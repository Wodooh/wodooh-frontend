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

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
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

This frontend connects to the [Wodooh Backend API](../wodooh-backend/README.md).

**Base URL**: Configured via `NEXT_PUBLIC_API_URL` environment variable.

### Authentication Flow

The app uses JWT tokens for authentication:

```typescript
// Login example
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token } = await response.json();

// Use token for authenticated requests
const authResponse = await fetch('/admin/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

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
