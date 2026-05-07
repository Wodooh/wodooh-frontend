"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated || !user) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading…</div>
    );
  }

  const isOwn = user._id === params.id;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        {isOwn ? "Your profile" : `User ${params.id}`}
      </h1>
      <p style={{ color: "#888", marginBottom: 24 }}>
        Shared profile route — accessible by every authenticated role.
      </p>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 20, background: "#fff" }}>
        {isOwn ? (
          <>
            <div><strong>Name:</strong> {user.name}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Role:</strong> {user.role}</div>
            <div><strong>ID:</strong> <code>{user._id}</code></div>
          </>
        ) : (
          <p style={{ color: "#888" }}>
            Public profile view for user <code>{params.id}</code>. Backend endpoint{" "}
            <code>GET /users/:id/public</code> isn&apos;t implemented yet — once it is, this card will
            show their name, role, and any public bio fields.
          </p>
        )}
      </div>
    </div>
  );
}
