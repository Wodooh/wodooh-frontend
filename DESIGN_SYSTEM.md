# DESIGN_SYSTEM.md — WODOOH (وضوح) Frontend

**Single source of truth for visual design across every route in `wodooh-frontend`** — admin, role portals (student / instructor / chairman), authentication (login, forgot-password), onboarding, and marketing/splash. This file replaces the old `DESIGN.md` (Bauhaus / Northfield), which only covered the role portals and conflicted with the implemented admin and auth shells.

System name: **Nexus**.
Stack: React 19 · Next.js 16 (App Router) · Tailwind 4 (CSS-first via `app/globals.css`) · shadcn/ui primitives · Inter + JetBrains Mono.

## How this relates to `wodooh-docs/`

The GP1 design deliverable in `../wodooh-docs/theme-guide.md` + `shadcn-theme.css` specifies a "Vivid Learning" palette on **shadcn/ui Zinc** with a **`--radius: 1rem`** (HSL tokens, primary `262 83% 58%`, secondary `199 89% 48%`, accent `31 97% 55%`). That spec is the *intent*; this document is the *reality* and supersedes it where they conflict. Concretely:

- The implemented system uses **token names prefixed `--nx-*`** (Nexus), not the bare shadcn names from GP1, because we needed a separate themeable surface (light + dark + density) that does not collide with shadcn primitives' own variables.
- We did not adopt the Vivid Learning hues (purple / cyan / orange) as the global base. The per-role accent layer below borrows from the Bauhaus phase the project went through and is what is actually applied via `body.<role>` in `app/globals.css`.
- The role taxonomy from `../wodooh-docs/` is `Student | Instructor | DepartmentChairman | Admin`. Backend uses lowercase `student | instructor | chairman | admin`. **Everywhere in CSS and badge classes, use the lowercase backend names**; reserve the docs casing for prose.

The architectural invariants in `../wodooh-docs/CLAUDE.md` (two-pseudonym privacy, identity-vault isolation, DAM, SIS adapter, Firestore-listener realtime) are not visual concerns and are not restated here, but UI patterns must respect them — e.g., never display student real-name and `authorAnonymousCourseID` together; never render an "identity-bridge" affordance on the client.

## Quick reference

| Surface | Shell file | CSS file | Token prefix | Theme switch | Status |
|---|---|---|---|---|---|
| Marketing / splash (`/`) | `app/page.tsx` | `app/nexus.css` | `nx-*` | reads + sets `[data-nx-theme]` | Nexus |
| Auth (`/login`, forgot pw) | `app/login/page.tsx` | `app/login/login.css` | `nl-*` (extends `--nx-theme`) | reads `[data-nx-theme]` | Nexus (login variant) |
| Admin (`/admin/**`) | `app/admin/layout.tsx` | `app/nexus.css` | `nx-*` | sets `[data-nx-theme]` + `[data-nx-density]` on `<html>` | **canonical** |
| Student portal (`/student/**`) | `app/student/layout.tsx` | `app/nexus.css` | `nx-*` | sets dataset attrs | Nexus |
| Faculty portal (`/instructor/**`) | `app/instructor/layout.tsx` | `app/nexus.css` | `nx-*` | sets dataset attrs | Nexus |
| Chairman portal (`/chairman/**`) | `app/chairman/layout.tsx` | `app/nexus.css` | `nx-*` | sets dataset attrs | Nexus |
| Profile (`/profile/[id]`) | per-page | `app/nexus.css` | `nx-*` | reads + sets dataset attrs | Nexus |
| Onboarding (`/onboarding/**`, `/onboarding/instructor`) | per-page | `app/nexus.css` + `app/globals.css` (residual) | `nx-*` plus per-page `.onboarding-*` / `.instructor-*` helpers | reads + sets dataset attrs | Nexus (chrome) — deeper inline borders pending polish |

`globals.css` now carries only:
1. Tailwind imports (`tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`).
2. The role-aware `--accent` cascade (read by Nexus components via `var(--accent)`).
3. Two transitional utilities (`.academic-texture`, `.hard-shadow-hover`) still referenced by the onboarding wizard and the admin user-detail page. Slated for deletion once those surfaces finish polishing.
4. The base shadcn/ui token blocks (`--background`, `--foreground`, `--primary`, etc.) and the matching `@theme inline` blocks — **kept** so shadcn primitives in `components/ui/` continue to resolve. The `--font-sans` here points to Inter.
5. Onboarding-specific component CSS (`.onboarding-*`, `.instructor-*`) — used only by the two wizard pages; treat as page-local until those wizards finish migrating.

Legacy Bauhaus utilities (`.bauhaus-*`, `.font-nf-*`, `.nf-dot-grid`, `.dashboard-*`, `.instructor-dashboard-*`) have been removed. Re-introducing them is a regression.

## Role-aware accent

A single CSS custom property `--accent` drives the primary action colour for every role. It is set by adding a body class at runtime via `components/role-body-class.tsx`, which reads the authenticated user's role from the auth context.

```css
body.student  { --accent: #1040C0; --accent-hover: #0B2E8A; }   /* blue   */
body.faculty  { --accent: #F0C020; --accent-hover: #C8A010; }   /* yellow */
body.chairman { --accent: #D02020; --accent-hover: #A81010; }   /* red    */
body.admin    { --accent: #121212; --accent-hover: #000000; }   /* near-black */
body          { --accent: #121212; --accent-hover: #000000; }   /* default */
```

Backend role `instructor` maps to body class `faculty` for the accent cascade — every other role passes through verbatim.

**Rules:**
- Components reference `var(--accent)` — never hardcode role hexes in JSX (`bg-[#F0C020]`, etc. are forbidden in new code).
- Inside the admin shell, `--nx-accent` (indigo `#4f46e5`) is the action colour by intent, but you may opt into role tinting by reading `var(--accent)` from `body.admin` for accents that should dim alongside the user's portal context.
- The role *badge palettes* (`.nx-role-*`) are **separate** from the accent cascade — they are pastel informational tints (see Badges below), not call-to-action surfaces. Don't conflate them.

## Tokens (Nexus, `--nx-*`)

Defined in `app/nexus.css` under `[data-nx-theme="light|dark"]`. All admin and login surfaces resolve through these.

| Token | Light | Dark |
|---|---|---|
| `--nx-bg` | `#fafafa` | `#0d1117` |
| `--nx-bg-elev` (cards / inputs) | `#ffffff` | `#161b22` |
| `--nx-bg-sub` (sidebar / table head) | `#f5f5f4` | `#0d1117` |
| `--nx-bg-hover` | `#f1f1ef` | `#1c2128` |
| `--nx-bg-active` | `#e9e9e6` | `#22272e` |
| `--nx-border` | `#e7e7e3` | `#21262d` |
| `--nx-border-strong` (input ring) | `#d6d6d2` | `#30363d` |
| `--nx-fg` | `#18181b` | `#c9d1d9` |
| `--nx-fg-muted` | `#62626a` | `#8b949e` |
| `--nx-fg-subtle` | `#98989f` | `#6e7681` |
| `--nx-fg-faint` | `#b8b8be` | `#484f58` |
| `--nx-accent` (indigo) | `#4f46e5` | `#818cf8` |
| `--nx-accent-hover` | `#4338ca` | `#a5b4fc` |
| `--nx-accent-soft` | `#eef2ff` | `#1e1b3b` |
| `--nx-success` / `-soft` | `#10b981` / `#d1fae5` | `#34d399` / `#064e3b` |
| `--nx-warning` / `-soft` | `#f59e0b` / `#fef3c7` | `#fbbf24` / `#451a03` |
| `--nx-danger` / `-soft` | `#ef4444` / `#fee2e2` | `#f87171` / `#450a0a` |
| `--nx-shadow-sm` | `0 1px 2px rgba(0,0,0,.04)` | `0 1px 2px rgba(0,0,0,.3)` |
| `--nx-shadow-md` | `0 2px 6px rgba(0,0,0,.06)` | `0 2px 6px rgba(0,0,0,.4)` |

Density tokens live under `[data-nx-density="compact|balanced"]`:

| Density | `--nx-stack` | `--nx-pad-card` | `--nx-base-fs` | `--nx-btn-h` |
|---|---|---|---|---|
| compact | 12px | 14px | 13px | 28px |
| balanced | 16px | 18px | 14px | 30px |

The login surface (`app/login/login.css`) defines a parallel `--nl-*` set for its self-contained card so it can render without the admin shell, but the values intentionally track the same theme — `--nl-bg/--nl-fg` mirror `--nx-bg/--nx-fg`. Use `--nl-*` only inside `.nx-login-body`; outside it, use `--nx-*`.

## Theme switching

Set on `<html>` from `app/admin/layout.tsx` (and read globally):

```js
const stored = localStorage.getItem("wodooh.theme");          // "light" | "dark" | null
const resolved = stored ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
document.documentElement.dataset.nxTheme   = resolved;        // [data-nx-theme=…]
document.documentElement.dataset.nxDensity = "compact";       // [data-nx-density=…]
```

- Theme is persisted under `localStorage["wodooh.theme"]`.
- The login page reads the same dataset attributes, so a user who has chosen dark mode in the admin sees dark mode on `/login` after sign-out.
- Density is global; the admin currently hardcodes `compact`. Don't override density on a single component — change the dataset attribute instead.

## Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

| Use | Font | Style |
|---|---|---|
| All UI text (chrome, body, buttons, labels) | **Inter** with `font-feature-settings: 'cv11','ss01'` | base size from `--nx-base-fs` |
| Page title (`.nx-page-title`) | Inter | `21px / 600 / -0.015em` |
| Card title (`.nx-card-title`) | Inter | `14px / 600` |
| Section / KPI / table-header labels | Inter | `10.5–11px / 500 / 0.04–0.06em / uppercase` |
| Numbers — KPI value, table dates / IDs, version pill, pagination info, "X of Y" counts | **JetBrains Mono** | mono is for *data* only; never for prose, labels, or button text |

No serif fonts. Uppercase + letter-spacing is reserved for headers and labels. The `Outfit` and `IBM Plex` references in the legacy `font-nf-*` aliases in `globals.css` are **dead** — do not use them in new pages.

## Shell

### Admin shell (canonical reference)

```
┌── nx-shell (grid 240px 1fr) ────────────────────────┐
│  nx-sidebar (sticky h-100vh)  │  nx-main           │
│   nx-sidebar-brand            │   nx-topbar (56)   │
│   nx-sidebar-section-label    │   ──────           │
│   nx-sidebar-nav              │   nx-page          │
│     nx-nav-item.is-active     │     nx-page-head   │
│   nx-sidebar-footer           │     ...content     │
└─────────────────────────────────────────────────────┘
```

- Sidebar: 240px wide, `bg: var(--nx-bg-sub)`, right border `1px var(--nx-border)`. Brand is a 26px gradient logo tile + "WODOOH" + muted role subtype.
- Section label: 10.5px / 0.06em uppercase / `--nx-fg-subtle`.
- Nav item: 7×10px padding, 6px radius, 1px transparent border. Hover → `bg-hover`. Active (`.is-active`) → elevated bg + visible border + `--nx-shadow-sm`. Active is **box-style**, not a left-stripe.
- Sidebar footer: 28px gradient avatar, 12.5px name + 11px subtle email truncated, ending with `.nx-version-pill` (mono 10.5px chip).
- Topbar: sticky, breadcrumb left (`.nx-topbar-crumbs`), 32×32 ghost icon buttons (`.nx-icon-btn`) right.
- Page padding: `24px 28px`.
- Active nav resolution: longest `href` prefix match against `usePathname()`, so detail routes (`/admin/users/[id]`) still highlight their parent.

### Auth shell (login)

```
┌── nx-login-body ─────────────────────────────────────┐
│  theme toggle (top-right)                            │
│                                                      │
│              48×48 logo tile                         │
│              h1 (22 / 300 / center)                  │
│                                                      │
│           ┌── nx-login-card (308px) ──┐              │
│           │  form fields              │              │
│           │  submit button (full)     │              │
│           │  meta links               │              │
│           └────────────────────────────┘             │
│                                                      │
│              footer copyright                        │
└──────────────────────────────────────────────────────┘
```

- Centered single-column. Card is 308px wide, capped by `calc(100vw - 32px)` on narrow viewports.
- Fields stack 12px apart; submit is full-width and uses the **success / accent variant from `--nl-*`** (GitHub-style green primary, not the indigo admin accent).
- The card sits on the page background — there is no marketing column, illustration, or "split-screen" treatment. Keep it minimal.

### Role portals (legacy → migrating)

The student / instructor / chairman dashboards currently render as standalone Tailwind pages using Bauhaus utilities (zero-radius, `border-l-4` left-stripe nav, `font-mono` everywhere, `min-h-[44px]` everywhere, hard-shadow hovers). When migrating a portal page to Nexus:

1. Replace the bespoke sidebar/topbar with the same shell pattern as the admin (`nx-shell` + `nx-sidebar` + `nx-topbar`), but rendered from a portal-scoped layout file (`app/student/layout.tsx`, etc.). The sidebar nav shape is given in `wodooh-docs/design.md` §13 (Figures 18–20: Main Dashboard, Active Sessions, Joined Session) — preserve those nav targets.
2. Apply `body.<role>` so `var(--accent)` matches the portal. The active nav state should still be the Nexus elevated-box style, not a left-stripe. For role-tinted CTAs, use `var(--accent)` rather than `--nx-accent`.
3. Replace `bauhaus-block-*`, `bauhaus-press`, `bauhaus-shadow-*`, `bauhaus-dot-grid`, `font-nf-*`, `dashboard-role-*` with Nexus primitives (cards, KPI strip, badges) — they are dead.
4. Remove inline `borderRadius: 0` styles. The unified system uses 6–10px radius.

### Marketing / splash (`app/page.tsx`)

Just a redirect to `/login`. The inline `nf-*` styles render a brief animated splash for users who land on `/`. Do not extend it; if a real landing page is ever introduced, build it in the Nexus token system, not the splash's bespoke `nf-*` set.

## Components

All `.nx-*` classes live in `app/nexus.css` and are referenced directly by JSX (no prop-driven wrappers). When a primitive doesn't exist, add it to that file so it picks up theme + density automatically — do not invent inline alternatives in a page file.

### Page head

```jsx
<div className="nx-page-head">
  <div>
    <h1 className="nx-page-title">Users</h1>
    <p className="nx-page-sub">{total} users · manage roles and access</p>
  </div>
  {/* optional right-side action (button or filter chip) */}
</div>
```

Title 21/600/-0.015em. Sub 13/muted. 4px gap.

### Card

```jsx
<div className="nx-card">
  <div className="nx-card-head">
    <div>
      <h3 className="nx-card-title">Recent signups</h3>
      <p className="nx-card-sub">Latest users added to the platform</p>
    </div>
    {/* optional right-side: badge / button */}
  </div>
  {/* body: <table className="nx-tbl">…, <div className="nx-empty">…, <div className="nx-loading">…, or padded content */}
</div>
```

8px radius, 1px border, `--nx-bg-elev`, `--nx-shadow-sm`. Use `.nx-card-padded` for free-form padded bodies; otherwise the head's bottom border and the table/empty states already define the internal structure.

### KPI strip

```jsx
<div className="nx-kpi-strip">                          {/* grid 4 cols → 2 at <1100px */}
  <div className="nx-kpi">
    <p className="nx-kpi-label">Total users</p>
    <div className="nx-kpi-value">3,847</div>           {/* mono 28/600/-0.02em line-height:1 */}
    {/* optional .nx-kpi-trend / .nx-kpi-icon (top-right faint) */}
  </div>
</div>
```

Loading state is the literal em-dash `"—"`, never a spinner inside a KPI.

### Two-col grid

`.nx-grid-2` — fixed `2fr 1fr` with `var(--nx-stack)` gap, collapses to 1-col at <1100px. Use for "main list + side rail" patterns (admin dashboard "Recent signups | Quick actions").

### Tables

```jsx
<div className="nx-tbl-wrap">
  <table className="nx-tbl">
    <thead><tr><th>User</th><th>Role</th><th>Joined</th></tr></thead>
    <tbody>
      <tr>
        <td>{/* nx-user-cell */}</td>
        <td><RoleBadge … /></td>
        <td className="nx-tbl-mono">{date}</td>
      </tr>
    </tbody>
  </table>
</div>
```

- `th`: 11/500/0.04em uppercase, `--nx-fg-subtle`, `--nx-bg-sub` background, 10×16 padding.
- `td`: 12×16, vertical-align middle, bottom border per row (last row none).
- `.nx-tbl-mono`: per-cell mono 12px/muted for dates / IDs / timestamps.
- For accessibility, add `scope="col"` on `<th>` when authoring new tables — the existing admin tables omit it and that's a known shortcoming to fix on touch.

### `.nx-user-cell`

The canonical "person row prefix": 28px circular avatar (background derived from `hsl(hash(name) % 360, 60%, 45%)`) + name (13.5/500) + email (11.5/muted) stack. Never render a bare `{user.name}` in a row.

### Badges

```jsx
<span className="nx-badge nx-role-instructor">
  <span className="nx-badge-dot" />
  Instructor
</span>
```

Pill (`border-radius: 999px`), 11.5/500, 3×10, with a 6px colored dot.

| Role / status class | Light bg / fg / dot | Dark bg / fg / dot |
|---|---|---|
| `.nx-role-admin` | `#f3e8ff / #6b21a8 / #a855f7` (purple) | `#2e1065 / #ddd6fe / #a78bfa` |
| `.nx-role-instructor` | `#d1fae5 / #065f46 / #10b981` (green) | `#064e3b / #a7f3d0 / #34d399` |
| `.nx-role-chairman` | `#fef3c7 / #92400e / #f59e0b` (amber) | `#451a03 / #fcd34d / #fbbf24` |
| `.nx-role-student` | `#dbeafe / #1e40af / #3b82f6` (blue) | `#172554 / #bfdbfe / #60a5fa` |

These four classes also double as the **status** palette (the System page uses `nx-role-instructor` for "Healthy", `nx-role-chairman` for "Unreachable", `nx-role-student` for "Checking…/Not configured"). Don't introduce parallel `.nx-status-*` classes.

### Buttons

`.nx-btn` is the base: `var(--nx-btn-h)` tall, 6px radius, 13/500, 12px h-padding, 6px gap, 80ms transitions on bg/color/border-color/opacity.

| Variant | Background | Text | Border |
|---|---|---|---|
| `.nx-btn-primary` | `--nx-accent` | white | `color-mix(--nx-accent 75%, black)`. Inset highlight + 1px shadow. |
| `.nx-btn-ghost` | `--nx-bg-elev` | `--nx-fg` | `--nx-border-strong`. Default for secondary actions and link-style "Quick action" lists. |
| `.nx-btn-danger` | `--nx-danger` | white | `color-mix(--nx-danger 75%, black)`. Permanent-delete and similar. |
| `.nx-icon-btn` | transparent | `--nx-fg-muted` | transparent → `--nx-border` on hover. 32×32, used in topbar. |

Disabled = `opacity: 0.55; cursor: not-allowed`. For inflight states, prefix the label with `<span className="nx-spin" />` and switch text to "Saving…", "Checking…", etc.

For role-tinted CTAs in portal pages, override `--nx-accent` locally on a wrapping element (`style={{ "--nx-accent": "var(--accent)", "--nx-accent-hover": "var(--accent-hover)" }}`) — don't fork the button class.

### Inputs

```jsx
<div className="nx-input-wrap">          {/* flex container; focus-within = accent ring */}
  <SearchIcon style={{ color: "var(--nx-fg-subtle)" }} />
  <input className="nx-input" placeholder="Search…" />
</div>

<select className="nx-select"><option>…</option></select>
```

- `.nx-input-wrap`: `var(--nx-btn-h)` tall, 6px radius, `--nx-bg-elev`, 1px `--nx-border-strong`. Focus → border `--nx-accent` + 3px ring `color-mix(accent 22%, transparent)`. **Always wrap inputs** — a bare `<input className="nx-input">` will not get the focus ring.
- `.nx-input`: transparent inner, no border / outline. Placeholder `--nx-fg-faint`.
- `.nx-select`: native select with custom SVG chevron at right 10px.
- `.nx-field-label`: 12/500/0.01em block label, 6px bottom margin. Use inside modals.

Every input needs an associated label — `.nx-field-label` outside the wrap, or a real `<label htmlFor>`. No bare placeholder-only inputs.

### Filter bar

A horizontal bar slotted *above* a table, *inside* the same `.nx-card`:

```jsx
<div className="nx-card">
  <div className="nx-filter-bar">
    <div className="nx-input-wrap"> … search … </div>
    <select className="nx-select"> … filter … </select>
    <div className="nx-filter-bar-spacer" />
    <span className="nx-filter-bar-count">{visible} of {total}</span>
  </div>
  {/* table | empty | loading */}
  <div className="nx-pagination">…</div>
</div>
```

Background `--nx-bg-sub`, 1px bottom border. Search wrap caps at `max-width: 360px`. Count is mono.

### Pagination

```jsx
<div className="nx-pagination">
  <span className="nx-pagination-info">{start}–{end} of {total}</span>
  <div style={{ display: "flex", gap: 6 }}>
    <button className="nx-btn nx-btn-ghost" disabled={!hasPrev}>Prev</button>
    <button className="nx-btn nx-btn-ghost" disabled={!hasNext}>Next</button>
  </div>
</div>
```

Sits inside the card under the table with a 1px top border. Info text is mono 12/muted.

### Modal

```jsx
<div className="nx-modal-backdrop" onClick={maybeClose}>
  <div className="nx-modal" onClick={e => e.stopPropagation()}>
    <div className="nx-modal-head"><h3 className="nx-modal-title">Change role</h3></div>
    <div className="nx-modal-body">
      <div><span className="nx-field-label">User</span> …nx-user-cell… </div>
      …
    </div>
    <div className="nx-modal-foot">
      <button className="nx-btn nx-btn-ghost" onClick={cancel}>Cancel</button>
      <button className="nx-btn nx-btn-primary" disabled={saving} onClick={save}>
        {saving ? <><span className="nx-spin" /> Saving…</> : "Save"}
      </button>
    </div>
  </div>
</div>
```

- Backdrop `rgba(0,0,0,.42)`, fade-in 150ms.
- Modal 10px radius, `max-width: 420px`, deep shadow `0 20px 50px rgba(0,0,0,.25)`, scale-in 150ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- Head and foot have 1px dividers; body uses `flex-direction: column; gap: 14px`.
- Foot is right-aligned: ghost cancel **then** primary action.
- Backdrop click dismisses **only when not in an inflight state** — guard with `if (!saving) close()`.

### Tabs

```jsx
<div className="nx-tabs">
  <button className="nx-tab" data-active={tab==="general"} onClick={…}>General</button>
</div>
```

Underline tabs, not pills. Active is `data-active="true"` → `--nx-fg` text + 2px bottom border in `--nx-fg`. The strip itself has a 1px bottom border that the active tab's `margin-bottom: -1px` + `border-bottom: 2px` overlaps.

### Setting rows

```jsx
<div className="nx-setting-row">
  <div>
    <div className="nx-setting-label">Site name</div>
    <div className="nx-setting-desc">Shown in the topbar and emails.</div>
  </div>
  <div className="nx-setting-control"><TextField … /></div>
</div>
```

Flex space-between, 16×0 padding, 1px bottom border (last child none). Label 13/500. Description 12.5/muted, max-width 460. Stack vertically inside a card.

### Segmented control

```jsx
<div className="nx-segmented">
  <button className="nx-segmented-btn" data-active={mode==="light"}><Sun /> Light</button>
  <button className="nx-segmented-btn" data-active={mode==="dark"}><Moon /> Dark</button>
</div>
```

Pill-on-pill. Outer container `--nx-bg-sub` + 1px border + 6px radius + 3px padding; active button gets `--nx-bg-elev` + `--nx-shadow-sm` + 4px radius. Use for binary or 2–3-way preferences.

### Permissions matrix

`.nx-perm-cell` centers content. `.nx-perm-yes` (success green) and `.nx-perm-no` (faint) for tick / dash glyphs.

### Empty / loading / error

```jsx
{loading
  ? <div className="nx-loading"><span className="nx-spin" /> Loading users…</div>
  : error
  ? <div className="nx-empty">
      <div className="nx-empty-title" style={{ color: "var(--nx-danger)" }}>Failed to load users</div>
      <div className="nx-empty-sub">{error}</div>
    </div>
  : items.length === 0
  ? <div className="nx-empty">
      <div className="nx-empty-title">No users match</div>
      <div className="nx-empty-sub">Try adjusting your search or filter.</div>
    </div>
  : <table className="nx-tbl">…</table>
}
```

This four-branch contract — `loading → error → empty → data` — is mandatory for every async card. Don't ship a card that handles fewer than four.

- `.nx-loading`: centered flex, `--nx-fg-muted`, 13px, contains a `.nx-spin`.
- `.nx-empty`: centered column, 56×20 padding, optional `.nx-empty-icon` (`--nx-fg-faint`), title 14/600 / `--nx-fg`, sub 12.5/muted/max-360.
- `.nx-spin`: 14×14 ring, 600ms `nx-spin` keyframe; can be inlined inside buttons.

Maintenance mode: when the API returns 503, treat the failure as global (banner or full-page state) per the cross-package contract in `../CLAUDE.md`. Don't render per-card "Database error" messages on 503.

### Toasts

```jsx
{toast && (
  <div className="nx-toast-region">
    <div className={`nx-toast nx-toast-${toast.kind}`}>{toast.msg}</div>
  </div>
)}
```

- Region: fixed bottom-right (20×20), column, 8px gap, `pointer-events: none` on region with `auto` per-toast.
- Toast: `--nx-bg-elev`, 1px border, 8px radius, deep shadow `0 8px 30px rgba(0,0,0,.2)`, 240–360px wide, slide-up 200ms.
- Kind = left 3px stripe: `success` (green), `error` (red), `info` (accent).
- Auto-dismiss in the page via `useEffect` with a 3.5–4s `setTimeout`.

## Animation conventions

| Where | Duration | Easing |
|---|---|---|
| Hover, focus, color/bg/border swaps | 80ms | linear (default) |
| Modal scale-in | 150ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Modal/backdrop fade-in | 150ms | ease-out |
| Toast slide-in | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Spinner | 600ms / rotation | linear |

No layout / transform animations on hover. No box-shadow animation outside modal / toast. Zero shadow-bounce on cards — that was the Bauhaus `bauhaus-press` pattern and is out.

## Iconography

Inline SVG only — no icon library. Stroke-based:

- `viewBox="0 0 24 24"`
- `fill="none"`, `stroke="currentColor"`
- `stroke-width: 1.6`, `stroke-linecap: round`, `stroke-linejoin: round`
- Sidebar / nav icons render at 15px, ghost-button icons at 13–15px, KPI top-right at faint.
- Define icon components inline at the top of each page (see `app/admin/layout.tsx`'s `I.*` map and `app/admin/settings/page.tsx`'s local `Sun/Moon/Check/X/Upload`). A centralised icon module is acceptable later but not required.

The legacy code uses `@hugeicons/react` and `Material+Symbols+Outlined` (loaded in `app/layout.tsx`). Both are dead weight; remove them once the portal pages migrate.

## Accessibility

- `--nx-fg` on `--nx-bg` clears AAA in light and AA in dark; role-badge palettes clear AA in both.
- Focus: 3px ring at `color-mix(--nx-accent 22%, transparent)` on inputs and 1px-border swap on buttons. For new interactives, use the `:focus-visible` pseudo-class — never `:focus`.
- Semantic HTML required: `<header>`, `<nav>`, `<main>`, `<section>`, `<aside>`, `<footer>`; `<table><thead><tbody><th scope="col">`; `<label htmlFor>`; `<button>` (never `<div onClick>`); `<a href>` for links.
- ARIA: sidebar `role="navigation" aria-label="<Role> Portal Navigation"`; live status badges `role="status"`; sortable columns `aria-sort`; tabs `role="tablist"` / `role="tab"`.
- Touch targets: every interactive ≥ 32px on its short axis (the `--nx-btn-h` of 28–30px is below WCAG's 44×44; the legacy Bauhaus pages enforced 44 minimums via `min-h-[44px]`. For now, accept Nexus's 30px on mouse-first surfaces (admin, login) but require 44 on portal pages where touch is primary).

## Routing layout

- `app/layout.tsx` — root: wraps `<AuthProvider>` and `<RoleBodyClass>`. Loads Outfit / IBM Plex Sans Arabic / Material Symbols today; **drop Outfit and Material Symbols** when the legacy pages migrate. Keep IBM Plex Sans Arabic for any Arabic copy (وضوح).
- `app/page.tsx` — `useEffect` redirect to `/login` with a brief splash. Don't extend.
- `app/login/page.tsx` — owns the auth shell. Reads `[data-nx-theme]`. After successful login, dispatch by role to `/admin/dashboard`, `/instructor/dashboard`, `/chairman/dashboard`, `/student/dashboard`.
- `app/admin/layout.tsx` — admin shell + auth gate (redirects unauthenticated → `/login`, non-admin → their portal). `app/admin/page.tsx` is a server-side `redirect("/admin/dashboard")`.
- `app/student/**`, `app/instructor/**`, `app/chairman/**` — currently no shared layout; each page renders its own sidebar/topbar inline. The migration target is per-role layout files modelled on `app/admin/layout.tsx` with `body.<role>` set on auth.
- `app/onboarding/**` — Bauhaus relic; same migration target.

## Authoring rules

1. **One token system.** All new code reads `var(--nx-*)` (or `var(--accent)` for role-tinted CTAs). No raw hex in JSX or CSS. The Bauhaus utilities and `font-nf-*` aliases in `globals.css` are deprecated — do not extend them.
2. **Cards own their states.** Every async card renders `loading | error | empty | data`. No spinner-less cards, no "should not happen" branches.
3. **Inputs always live in `.nx-input-wrap`.** Bare `<input className="nx-input">` will not get the focus ring.
4. **Mono is for data only.** Numbers, IDs, dates, timestamps, version strings, "X of Y" counts. Never for body, labels, or buttons.
5. **Density is global.** Don't override `--nx-btn-h` on individual buttons — change `data-nx-density` on `<html>`.
6. **Theme tokens, not media queries.** Dark mode is keyed by `[data-nx-theme="dark"]`, not `prefers-color-scheme`. Always `var(--nx-…)`, never `@media (prefers-color-scheme)` in component CSS.
7. **No new `.nx-*` classes inline.** Add primitives to `app/nexus.css` so they participate in theme + density. Page files are layout, not CSS.
8. **Role tinting via `var(--accent)`, not class branches.** No `if (role === 'instructor') className="bg-yellow-400"`. Use `body.<role>` cascade and `var(--accent)`.
9. **Backend role names everywhere in CSS / classes** — `student | instructor | chairman | admin`. The docs casing (`DepartmentChairman`) is for prose only.
10. **Privacy-respecting UI.** Never render student real identity (`studentNumber`) and `authorAnonymousCourseID` in the same surface. Anonymous content is anonymous in chrome too — no tooltips, no hover-reveal, no debug overlays exposing the bridge.

## Migration progress

The bulk migration from Bauhaus → Nexus is **done**. All routes now boot under a Nexus shell or page-level Nexus background, share the `--nx-*` token system, and react to `[data-nx-theme]`. Outstanding polish:

- [x] `app/student/dashboard/page.tsx` — Nexus.
- [x] `app/instructor/dashboard/page.tsx` — Nexus.
- [x] `app/chairman/dashboard/page.tsx` — Nexus (KPI / approval queue / department accordion / policy archive ported to `nx-card` + `nx-tbl` primitives).
- [x] `app/onboarding/page.tsx` + `app/onboarding/instructor/page.tsx` — chrome on Nexus (button / input / select / label constants + page wrappers + `Stepper` + `StepHeader`). Deeper inline borders (`border-t-4 border-[#121212]` between confirmation rows) and the `.onboarding-*` / `.instructor-*` blocks in `globals.css` remain — pending polish.
- [x] `app/page.tsx` — Nexus splash with accent-gradient logo and `nx-spin`.
- [x] `app/profile/[id]/page.tsx` — Nexus with `nx-card` + role badge.
- [x] `app/admin/users/new/page.tsx`, `app/admin/users/[id]/page.tsx` — chrome ported (constants → `nx-btn-*` / `nx-tab` / `nx-field-label`; role badges → `nx-badge nx-role-*`; tab strip → `nx-tabs`). Inline form-section borders deeper in `[id]/page.tsx` remain.
- [x] `app/test-api/page.tsx` — deleted (dev-only route).
- [x] `app/globals.css` — Bauhaus utility classes (`.bauhaus-*`, `.font-nf-*`, `.nf-dot-grid`, `.dashboard-*`, `.instructor-dashboard-*`) removed. Body font is now Inter. The retained `:root --bh-*`, `--brand-*`, etc. tokens are still referenced by `.onboarding-*` rules — they get cleaned up alongside those blocks.
- [x] `app/layout.tsx` — Outfit and Material Symbols Outlined preloads dropped; only IBM Plex Sans Arabic remains for Arabic copy.
- [x] Dead files removed: `contexts/AuthContext.tsx`, `services/authService.ts`, `types/auth.ts` (per the original frontend `CLAUDE.md`).

Future polish (non-blocking):
- [ ] Replace inline `border-t-4 border-[#121212]` separators in onboarding wizards with `1px solid var(--nx-border)`.
- [ ] Replace inline `border-4 border-[#121212]` panels and ad-hoc colors in `app/admin/users/[id]/page.tsx` deeper sections.
- [ ] Once the above two land, delete `.onboarding-*`, `.instructor-*`, `.academic-texture`, `.hard-shadow-hover`, and the residual `--bh-*` / `--brand-*` token blocks from `globals.css`.

## Implementation checklist (for new pages)

- [ ] Page sits under the appropriate role shell layout (`app/admin/layout.tsx`, or — once built — the role-portal layouts) so it inherits the shell + auth gate.
- [ ] Top-level uses `<div className="nx-page-head">` with `nx-page-title` + `nx-page-sub`.
- [ ] Lists / tables sit inside `.nx-card` and ship with all four states (loading / error / empty / data).
- [ ] Mutations show toast on success and error via the local `setToast` + auto-dismiss `useEffect` pattern (3.5–4s).
- [ ] Modals use `.nx-modal-backdrop` with click-to-close guarded by inflight state, plus `e.stopPropagation()` on `.nx-modal`.
- [ ] Numbers / dates / IDs render in `.nx-tbl-mono`, `.nx-kpi-value`, `.nx-pagination-info`, or `.nx-version-pill` — never inline mono utilities.
- [ ] No raw hex colors; only `var(--nx-*)` and `var(--accent)`.
- [ ] Icons are inline stroke-1.6 SVGs sized 13–15px.
- [ ] Every input has a label (`.nx-field-label` or `<label htmlFor>`).
- [ ] Tables use `<thead>` and `<th scope="col">`.
- [ ] Touch surfaces (mobile-first portal pages) keep min-height 44; mouse-first surfaces (admin, login) may use 30.

*Wodooh frontend · Nexus design system · Inter · JetBrains Mono · light + dark · role-aware accents · single source of truth across admin, role portals, auth, onboarding, and marketing.*
