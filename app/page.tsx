"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "./nexus.css";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wodooh.theme") : null;
    const resolved = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.nxTheme = resolved;
    document.documentElement.dataset.nxDensity = "compact";
    router.replace("/login");
  }, [router]);

  return (
    <main
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--nx-bg)",
        color: "var(--nx-fg)",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, maxWidth: 360, textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "linear-gradient(135deg, var(--nx-accent), var(--nx-accent-hover))",
            color: "white",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: "-0.02em",
          }}
        >
          W
        </div>
        <div>
          <p lang="ar" dir="rtl" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, margin: 0 }}>وضوح</p>
          <p style={{ fontSize: 14, color: "var(--nx-fg-muted)", margin: "6px 0 0" }}>
            Instant, anonymous classroom engagement.
          </p>
        </div>
        <div className="nx-loading" style={{ padding: 0 }}>
          <span className="nx-spin" /> Redirecting to sign-in…
        </div>
        <noscript>
          <p style={{ fontSize: 13, color: "var(--nx-fg-muted)" }}>
            JavaScript is required.{" "}
            <a href="/login" style={{ color: "var(--nx-accent)", textDecoration: "underline" }}>
              Continue to sign-in
            </a>
          </p>
        </noscript>
      </div>
    </main>
  );
}
