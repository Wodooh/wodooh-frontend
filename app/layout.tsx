import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { RoleBodyClass } from "@/components/role-body-class";

export const metadata: Metadata = {
  title: "WODOH — Institutional Clarity",
  description:
    "Access your university courses, assignments, and grades through WODOH. Log in with your institutional credentials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en" className={cn("light font-sans")}>
        <head>
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin=""
          />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap"
          />
        </head>
        <body className="antialiased">
          <RoleBodyClass />
          {children}
        </body>
      </html>
    </AuthProvider>
  );
}
