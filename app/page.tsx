"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <>
      <style>{`
        @keyframes nf-splash-left {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes nf-splash-right {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes nf-ring-spin {
          to { transform: rotate(360deg); }
        }
        .nf-splash-left  { animation: nf-splash-left  0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .nf-splash-right { animation: nf-splash-right 0.5s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .nf-ring-spinner {
          width: 28px;
          height: 28px;
          border: 2px solid rgba(18,18,18,0.12);
          border-top-color: #121212;
          border-radius: 50%;
          animation: nf-ring-spin 0.75s linear infinite;
          flex-shrink: 0;
        }
        .nf-panel-dots-dark {
          background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 18px 18px;
        }
        @keyframes nf-dot-drift {
          0%   { background-position: 0 0; }
          100% { background-position: 36px 36px; }
        }
        .nf-panel-dots-dark { animation: nf-dot-drift 22s linear infinite; }
      `}</style>

      <main
        className="min-h-screen flex flex-col lg:flex-row"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {/* ── Left: Black editorial panel ── */}
        <div
          className="nf-splash-left relative flex flex-1 flex-col justify-between bg-[#121212] px-10 py-12 lg:max-w-[480px] overflow-hidden"
          aria-hidden="true"
        >
          {/* Animated dot overlay */}
          <div className="absolute inset-0 bauhaus-dot-grid-dark pointer-events-none" />

          {/* Top metadata */}
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-widest text-white/35">
              Northfield University
            </p>
          </div>

          {/* Centre wordmark */}
          <div className="relative z-10 space-y-3">
            <div className="border-l-4 border-white/20 pl-5 space-y-1">
              <p
                className="text-7xl font-black text-white leading-none tracking-tight"
                lang="ar"
                dir="rtl"
              >
                وضوح
              </p>
              <p className="text-4xl font-black text-white/50 leading-none tracking-tight">
                Wodooh
              </p>
            </div>
            <p className="text-sm text-white/45 leading-relaxed max-w-xs pt-2">
              Instant, anonymous classroom engagement and feedback.
            </p>
          </div>

          {/* Bottom privacy cue */}
          <div className="relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Privacy by Architecture · Session encrypted
            </p>
          </div>
        </div>

        {/* ── Right: Redirect status panel ── */}
        <div className="nf-splash-right flex flex-1 flex-col items-center justify-center px-10 py-16 gap-10 bg-[#F0F0F0]">

          {/* Redirect message block */}
          <div className="w-full max-w-sm space-y-8">

            {/* Header */}
            <div className="border-b-4 border-[#121212] pb-6">
              <p className="uppercase tracking-widest text-xs font-bold text-neutral-500 mb-2">
                Northfield University · Wodooh Portal · Vol. 2026 · Spring Semester
              </p>
              <h1 className="text-3xl font-black uppercase tracking-tight text-[#121212]">
                Welcome back
              </h1>
              <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                You are being redirected to the authentication portal.
              </p>
            </div>

            {/* Spinner row */}
            <div className="flex items-center gap-4 border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] px-5 py-4 bg-[#F0F0F0]">
              <div className="nf-ring-spinner" role="presentation" />
              <div>
                <p className="uppercase tracking-widest text-xs font-bold text-neutral-500 mb-0.5">
                  Redirecting to sign-in
                </p>
                <p className="text-xs text-[#121212]">
                  /login
                </p>
              </div>
            </div>

            {/* Noscript fallback */}
            <noscript>
              <p className="text-sm leading-relaxed text-neutral-600">
                JavaScript is required.{" "}
                <a
                  href="/login"
                  className="underline underline-offset-4 font-medium uppercase tracking-widest text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#121212] focus-visible:ring-offset-2"
                >
                  Continue to sign-in
                </a>
              </p>
            </noscript>
          </div>

          {/* Footer */}
          <p className="uppercase tracking-widest text-[10px] text-neutral-400">
            © 2026 Northfield University · All Rights Reserved
          </p>
        </div>
      </main>
    </>
  );
}
