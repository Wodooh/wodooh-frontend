"use client";

import React, { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import "./nexus.css";
import "./landing.css";

// Post-login destination — mirrors the helper used by the login page so an
// already-authenticated visitor who lands on `/` is sent to their portal.
function dashboardPathForRole(role: string | undefined): string {
  switch (role) {
    case "admin":      return "/admin/dashboard";
    case "instructor": return "/instructor/dashboard";
    case "chairman":   return "/chairman/dashboard";
    case "student":
    default:           return "/student/dashboard";
  }
}

// Custom-property style helper (typed) for the staggered reveal delays.
const delay = (ms: number): CSSProperties => ({ ["--d" as string]: `${ms}ms` });

// ── Icons (stroke, currentColor — matches the login page convention) ──
const Icon = ({ size = 20, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><path d="M5 12h14M13 5l7 7-7 7" /></Icon>
);
const ShieldCheck = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></Icon>
);
const Bolt = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></Icon>
);
const Sliders = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></Icon>
);
const Hash = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" /></Icon>
);
const Play = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M6 4v16l13-8-13-8Z" /></Icon>
);
const Users = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Icon>
);
const Pulse = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Icon>
);
const Check = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}><path d="M20 6 9 17l-5-5" /></Icon>
);
const Sun = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></Icon>
);
const Moon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></Icon>
);

// ── Theme (same persistence contract as login / splash) ──
function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const stored = localStorage.getItem("wodooh.theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.nxTheme = theme;
    document.documentElement.dataset.nxDensity = "compact";
  }, [theme]);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    localStorage.setItem("wodooh.theme", t);
  };

  return { theme, setTheme };
}

// ── Static content ──
const STEPS = [
  {
    n: "01",
    icon: <Play />,
    title: "Instructor starts a session",
    desc: "Open a live session for one of your course sections. Enrolled students can join right away, with no installs and no rosters to wrangle.",
  },
  {
    n: "02",
    icon: <Users />,
    title: "Students join anonymously",
    desc: "Students open the active session for the section they're enrolled in and take part under a pseudonym, never their real name.",
  },
  {
    n: "03",
    icon: <Pulse />,
    title: "Engagement flows in real time",
    desc: "Questions and reactions stream in live over the session. The instructor reads them, decides what to take up, and answers in the moment.",
  },
];

const FEATURES = [
  {
    lead: true,
    icon: <ShieldCheck />,
    title: "Anonymous questions: ask without fear",
    desc: "Every question travels under a pseudonym, kept separate from a student's identity by design. The fear of looking unprepared in front of peers disappears, so the questions that actually matter finally get asked.",
  },
  {
    lead: false,
    icon: <Bolt />,
    title: "Real-time reactions",
    desc: "A lightweight pulse (Understood, Too fast, Too slow, Not clear) lets the room signal comprehension without interrupting the flow of the lecture.",
  },
  {
    lead: false,
    icon: <Sliders />,
    title: "Instructor moderation",
    desc: "The instructor decides which questions to take up and which to set aside, keeping the live feed focused and the discussion on track.",
  },
  {
    lead: false,
    icon: <Hash />,
    title: "Section-based sessions",
    desc: "Each session is scoped to a single course section, so students join exactly the right room and engagement stays where it belongs.",
  },
];

// ── Page ──
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  // Preserve auth-aware routing: an authenticated visitor is sent to their portal.
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(dashboardPathForRole(user?.role));
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (authLoading) {
    return (
      <main className="wd-landing" style={{ display: "grid", placeItems: "center" }}>
        <span className="nx-spin" />
      </main>
    );
  }
  if (isAuthenticated) return null;

  return (
    <div className="wd-landing">
      {/* ── Nav ── */}
      <header className="wd-nav" data-scrolled={scrolled}>
        <nav className="wd-container wd-nav-inner" aria-label="Primary">
          <Link href="/" className="wd-brand" aria-label="WODOOH home">
            <span className="wd-logo">W</span>
            <span className="wd-brand-text">WODOOH</span>
          </Link>
          <div className="wd-nav-actions">
            <Link href="/login" className="wd-nav-link">Sign in</Link>
            <button
              type="button"
              className="wd-theme-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </button>
            <Link href="/onboarding" className="nx-btn nx-btn-primary" style={{ height: 34 }}>
              Register
            </Link>
          </div>
        </nav>
      </header>

      <main className="wd-container">
        {/* ── Hero ── */}
        <section className="wd-hero" aria-labelledby="wd-hero-title">
          <div className="wd-hero-copy">
            <h1 id="wd-hero-title">
              <span className="wd-wordmark wd-reveal" style={delay(60)}>
                <span className="wd-wordmark-en">WODOOH</span>
              </span>
              <span className="wd-headline wd-reveal" style={delay(130)}>
                Anonymous, real-time classroom engagement.{" "}
                <span className="wd-ink-accent">Clarity, the moment it&apos;s needed.</span>
              </span>
            </h1>

            <p className="wd-lede wd-reveal" style={delay(200)}>
              WODOOH is a live engagement overlay for the lecture hall. Students ask questions and
              react without fear of judgment; instructors moderate the conversation as it unfolds.
            </p>

            <div className="wd-cta-row wd-reveal" style={delay(270)}>
              <Link href="/login" className="nx-btn nx-btn-primary wd-btn-xl">
                Get started <span className="wd-btn-arrow"><ArrowRight /></span>
              </Link>
              <Link href="/onboarding" className="nx-btn nx-btn-ghost wd-btn-xl">
                Create an account
              </Link>
            </div>

            <p className="wd-trust wd-reveal" style={delay(340)}>
              <Check /> Anonymous by design: a student&apos;s name never travels with their question.
            </p>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="wd-section wd-section-sub" aria-labelledby="wd-how-title">
          <div className="wd-section-head">
            <h2 className="wd-section-title" id="wd-how-title">From silence to signal in three steps</h2>
            <p className="wd-section-lede">
              No friction at the door. Students already enrolled in a section open its live session,
              and the room starts talking.
            </p>
          </div>

          <ol className="wd-steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {STEPS.map((s) => (
              <li className="wd-step" key={s.n}>
                <span className="wd-step-num">{s.n}</span>
                <span className="wd-step-ico">{s.icon}</span>
                <h3 className="wd-step-title">{s.title}</h3>
                <p className="wd-step-desc">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Why it matters / features ── */}
        <section className="wd-section wd-section-sub" aria-labelledby="wd-why-title">
          <div className="wd-section-head">
            <h2 className="wd-section-title" id="wd-why-title">Built around the question students won&apos;t ask</h2>
            <p className="wd-section-lede">
              The best question in the room is the one nobody dares to raise. WODOOH removes the cost
              of asking, and gives instructors the signal to respond.
            </p>
          </div>

          <div className="wd-features">
            {FEATURES.map((f) => (
              <article className={`wd-feat${f.lead ? " wd-feat-lead" : ""}`} key={f.title}>
                <span className="wd-feat-ico">{f.icon}</span>
                <div className="wd-feat-body">
                  <h3 className="wd-feat-title">{f.title}</h3>
                  <p className="wd-feat-desc">{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="wd-section">
          <div className="wd-closer">
            <h2 className="wd-closer-title">Bring clarity to your next lecture</h2>
            <p className="wd-closer-lede">
              Sign in to start a live session, or create an account to join your section.
            </p>
            <div className="wd-cta-row">
              <Link href="/login" className="nx-btn nx-btn-primary wd-btn-xl">
                Get started <span className="wd-btn-arrow"><ArrowRight /></span>
              </Link>
              <Link href="/onboarding" className="nx-btn nx-btn-ghost wd-btn-xl">
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="wd-footer">
        <div className="wd-container wd-footer-inner">
          <div className="wd-footer-meta">
            <span className="wd-footer-project">
              WODOOH is a KSU Senior Project (GP2) at King Saud University.
            </span>
            <span className="wd-footer-credit">
              Built by the <b>WODOOH team</b> · Department of Computer Science.
            </span>
          </div>
          <div className="wd-footer-links">
            <Link href="/login">Sign in</Link>
            <Link href="/onboarding">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
