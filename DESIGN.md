---
version: alpha
name: Nexus
description: WODOOH (وضوح) frontend design system — single source of truth across admin, role portals (student / instructor / chairman), authentication, onboarding, and marketing/splash. Inter + JetBrains Mono · light + dark · role-aware accent layer. Built on the Nexus token set defined in app/nexus.css.
colors:
  bg: "#FAFAFA"
  bg-elev: "#FFFFFF"
  bg-sub: "#F5F5F4"
  bg-hover: "#F1F1EF"
  bg-active: "#E9E9E6"
  border: "#E7E7E3"
  border-strong: "#D6D6D2"
  fg: "#18181B"
  fg-muted: "#62626A"
  fg-subtle: "#98989F"
  fg-faint: "#B8B8BE"
  primary: "#4F46E5"
  primary-hover: "#4338CA"
  primary-soft: "#EEF2FF"
  success: "#10B981"
  success-soft: "#D1FAE5"
  warning: "#F59E0B"
  warning-soft: "#FEF3C7"
  danger: "#EF4444"
  danger-soft: "#FEE2E2"
  on-primary: "#FFFFFF"
  role-student: "#1040C0"
  role-student-hover: "#0B2E8A"
  role-faculty: "#F0C020"
  role-faculty-hover: "#C8A010"
  role-chairman: "#D02020"
  role-chairman-hover: "#A81010"
  role-admin: "#121212"
  role-admin-hover: "#000000"
  badge-admin-bg: "#F3E8FF"
  badge-admin-fg: "#6B21A8"
  badge-admin-dot: "#A855F7"
  badge-instructor-bg: "#D1FAE5"
  badge-instructor-fg: "#065F46"
  badge-instructor-dot: "#10B981"
  badge-chairman-bg: "#FEF3C7"
  badge-chairman-fg: "#92400E"
  badge-chairman-dot: "#F59E0B"
  badge-student-bg: "#DBEAFE"
  badge-student-fg: "#1E40AF"
  badge-student-dot: "#3B82F6"
typography:
  page-title:
    fontFamily: Inter
    fontSize: 21px
    fontWeight: 600
    letterSpacing: "-0.015em"
  page-sub:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
  card-title:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
  card-sub:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
  body:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    letterSpacing: "0.04em"
  field-label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    letterSpacing: "0.01em"
  button:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
  badge:
    fontFamily: Inter
    fontSize: 11.5px
    fontWeight: 500
  kpi-value:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
  pill:
    fontFamily: JetBrains Mono
    fontSize: 10.5px
    fontWeight: 400
  arabic:
    fontFamily: IBM Plex Sans Arabic
    fontSize: 28px
    fontWeight: 700
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 10px
  full: 999px
spacing:
  density-compact-stack: 12px
  density-compact-pad: 14px
  density-compact-button-h: 28px
  density-balanced-stack: 16px
  density-balanced-pad: 18px
  density-balanced-button-h: 30px
  page: 24px
  page-x: 28px
  card-head-y: 14px
  card-head-x: 16px
  table-cell-y: 12px
  table-cell-x: 16px
  modal-max-w: 420px
  sidebar-w: 240px
  topbar-h: 56px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "{spacing.density-compact-button-h}"
    padding: "0 12px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-ghost:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.fg}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "{spacing.density-compact-button-h}"
    padding: "0 12px"
  button-ghost-hover:
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.fg}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "{spacing.density-compact-button-h}"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.fg-muted}"
    rounded: "{rounded.md}"
    size: "32px"
  icon-button-hover:
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.fg}"
  card:
    backgroundColor: "{colors.bg-elev}"
    rounded: "{rounded.lg}"
  card-head:
    backgroundColor: "{colors.bg-elev}"
    padding: "14px 16px"
  kpi:
    backgroundColor: "{colors.bg-elev}"
    rounded: "{rounded.lg}"
    padding: "16px 18px"
  kpi-value:
    typography: "{typography.kpi-value}"
    textColor: "{colors.fg}"
  kpi-label:
    typography: "{typography.label}"
    textColor: "{colors.fg-muted}"
  input-wrap:
    backgroundColor: "{colors.bg-elev}"
    rounded: "{rounded.md}"
    height: "{spacing.density-compact-button-h}"
    padding: "0 10px"
  input-wrap-focus:
    backgroundColor: "{colors.bg-elev}"
  field-label:
    typography: "{typography.field-label}"
    textColor: "{colors.fg}"
  badge:
    typography: "{typography.badge}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  badge-role-admin:
    backgroundColor: "{colors.badge-admin-bg}"
    textColor: "{colors.badge-admin-fg}"
  badge-role-instructor:
    backgroundColor: "{colors.badge-instructor-bg}"
    textColor: "{colors.badge-instructor-fg}"
  badge-role-chairman:
    backgroundColor: "{colors.badge-chairman-bg}"
    textColor: "{colors.badge-chairman-fg}"
  badge-role-student:
    backgroundColor: "{colors.badge-student-bg}"
    textColor: "{colors.badge-student-fg}"
  table:
    backgroundColor: "{colors.bg-elev}"
    typography: "{typography.body}"
  table-th:
    backgroundColor: "{colors.bg-sub}"
    textColor: "{colors.fg-subtle}"
    typography: "{typography.label}"
    padding: "10px 16px"
  table-td:
    textColor: "{colors.fg}"
    padding: "12px 16px"
  table-td-mono:
    textColor: "{colors.fg-muted}"
    typography: "{typography.mono-data}"
  modal:
    backgroundColor: "{colors.bg-elev}"
    rounded: "{rounded.xl}"
    width: "{spacing.modal-max-w}"
  modal-backdrop:
    backgroundColor: "rgba(0,0,0,0.42)"
  toast-success:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  toast-error:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  toast-info:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.fg-muted}"
    typography: "{typography.button}"
    padding: "10px 14px"
  tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.fg-muted}"
    rounded: "{rounded.md}"
    padding: "7px 10px"
  nav-item-active:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.fg}"
  segmented:
    backgroundColor: "{colors.bg-sub}"
    rounded: "{rounded.md}"
    padding: "3px"
  segmented-btn-active:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.fg}"
    rounded: "{rounded.sm}"
  pill:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.fg-subtle}"
    typography: "{typography.pill}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
---

## Overview

Nexus is the WODOOH (وضوح) frontend's only design system. It replaces the earlier "Bauhaus / Northfield" experiment that lived on the role-portal pages and the parallel "Nexus Admin" surface that lived in the admin section — all routes now share one token set, one shell pattern, and one set of component primitives.

The system is built around three load-bearing ideas:

1. **One canonical token surface (`--nx-*`)** defined in `app/nexus.css`. Every visible value — color, typography, spacing, radius, elevation — comes from this set. The same file defines a light and a dark theme via `[data-nx-theme="light|dark"]`, plus two density modes via `[data-nx-density="compact|balanced"]`. The front-matter above lists the **light + compact** values; dark theme overrides are documented in §Colors.

2. **A role-aware accent layer (`--accent`)** keyed off `body.<role>` in `app/globals.css`. The cascade gives each portal an institutional accent (student blue, faculty yellow, chairman red, admin near-black) without forking components — anything that wants role tinting reads `var(--accent)`. Backend role `instructor` maps to body class `faculty` for the cascade; every other role passes through verbatim.

3. **Privacy-respecting UI** anchored to the architectural invariants in `../wodooh-docs/CLAUDE.md`. The two-pseudonym privacy model (authorship via `authorAnonymousCourseID`, live-session presence via `anonymousSessionId`, identity vault isolated server-side) is enforced architecturally, not by chrome — but UI patterns must respect it. Never co-render a real `studentNumber` with `authorAnonymousCourseID`. Never expose an "identity bridge" affordance.

Relation to `../wodooh-docs/`: the GP1 deliverable in `theme-guide.md` + `shadcn-theme.css` specified a "Vivid Learning" palette on shadcn/ui Zinc base (HSL purple/cyan/orange, `--radius: 1rem`). That spec is intent; this document is reality and supersedes it where they diverge. The implementation uses `--nx-*` tokens (not the bare shadcn names) so the surface can theme + densify independently of any individual shadcn primitive's variables. Role taxonomy in the docs is `Student | Instructor | DepartmentChairman | Admin`; backend and CSS use lowercase `student | instructor | chairman | admin` — that's the canonical casing for class names and the `body.<role>` cascade.

Per-route shells:

| Route | Shell file | Token prefix | Theme switch |
|---|---|---|---|
| Marketing splash (`/`) | `app/page.tsx` | `nx-*` | reads + sets `[data-nx-theme]` then redirects to `/login` |
| Auth (`/login`) | `app/login/page.tsx` | `nl-*` (extends `--nx-theme`) | reads `[data-nx-theme]` |
| Admin (`/admin/**`) | `app/admin/layout.tsx` | `nx-*` | sets `[data-nx-theme]` + `[data-nx-density]` on `<html>` |
| Student portal (`/student/**`) | `app/student/layout.tsx` | `nx-*` | sets dataset attrs |
| Faculty portal (`/instructor/**`) | `app/instructor/layout.tsx` | `nx-*` | sets dataset attrs |
| Chairman portal (`/chairman/**`) | `app/chairman/layout.tsx` | `nx-*` | sets dataset attrs |
| Profile (`/profile/[id]`) | per-page | `nx-*` | reads + sets dataset attrs |
| Onboarding (`/onboarding/**`) | per-page | `nx-*` plus residual `.onboarding-*` | reads + sets dataset attrs |

## Colors

The front-matter declares the **light theme** as canonical. Dark theme is keyed by `[data-nx-theme="dark"]` and remaps the same token names to:

| Token | Dark value |
|---|---|
| `bg` | `#0D1117` |
| `bg-elev` | `#161B22` |
| `bg-sub` | `#0D1117` |
| `bg-hover` | `#1C2128` |
| `bg-active` | `#22272E` |
| `border` | `#21262D` |
| `border-strong` | `#30363D` |
| `fg` | `#C9D1D9` |
| `fg-muted` | `#8B949E` |
| `fg-subtle` | `#6E7681` |
| `fg-faint` | `#484F58` |
| `primary` | `#818CF8` |
| `primary-hover` | `#A5B4FC` |
| `primary-soft` | `#1E1B3B` |
| `success` / `-soft` | `#34D399` / `#064E3B` |
| `warning` / `-soft` | `#FBBF24` / `#451A03` |
| `danger` / `-soft` | `#F87171` / `#450A0A` |
| `badge-admin-{bg,fg,dot}` | `#2E1065` / `#DDD6FE` / `#A78BFA` |
| `badge-instructor-{bg,fg,dot}` | `#064E3B` / `#A7F3D0` / `#34D399` |
| `badge-chairman-{bg,fg,dot}` | `#451A03` / `#FCD34D` / `#FBBF24` |
| `badge-student-{bg,fg,dot}` | `#172554` / `#BFDBFE` / `#60A5FA` |

The `role-*` accent tokens are the same in both themes — the role cascade is institutional and does not invert in dark mode.

**Usage rules:**

- `primary` is the call-to-action color *inside the admin shell* (indigo). Inside a role portal, CTAs read `var(--accent)` instead, which the layout sets through the `body.<role>` cascade. To role-tint a `nx-btn-primary` in a portal, override locally: `style={{ "--nx-accent": "var(--accent)", "--nx-accent-hover": "var(--accent-hover)" }}`.
- `badge-{role}` is the **status / informational palette** — the System health card in the admin reuses `nx-role-instructor` for "Healthy", `nx-role-chairman` for "Unreachable", `nx-role-student` for "Checking". Don't introduce a parallel `.nx-status-*` palette.
- All status colors (`success`, `warning`, `danger`) clear WCAG AA on `bg-elev` in both themes; the role accents (`role-student`, `role-faculty`, `role-chairman`) clear AA only when paired with `on-primary` text or used as borders. `role-faculty` (yellow) **must not** carry white text.
- Hex literals are forbidden in `.tsx` for new code. Always reference `var(--nx-*)` (or `var(--accent)` for role-tinted CTAs).

## Typography

Two type families:

- **Inter** — every chrome surface, body text, button labels, table headers, KPI labels. Use `font-feature-settings: 'cv11', 'ss01'` to enable the alternate `1` and `a` glyphs (configured globally on `.nx-shell`).
- **JetBrains Mono** — *data only*: numbers, IDs, dates, timestamps, version pills, "X of Y" counts, the KPI value, the page-counter on the pagination row. Never for prose, labels, or button text.
- **IBM Plex Sans Arabic** is preloaded by `app/layout.tsx` for Arabic copy (`وضوح`). It only kicks in on elements with `lang="ar" dir="rtl"`.

The legacy `Outfit` and `Material Symbols Outlined` font preloads have been removed from `app/layout.tsx`. The `font-nf-*` aliases that pointed at `Outfit` no longer exist.

**Casing:**

- Uppercase + `letter-spacing: 0.04em–0.06em` is reserved for headers and labels (`label`, `field-label`, table `th`, KPI label, sidebar section label).
- Sentence case is for headings, body, button labels, and announcements.
- Never uppercase a button label — the `button` typography token is sentence-case 13/500.

## Layout

The shell is a CSS grid with a fixed sidebar and a fluid main column:

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

- Sidebar (`spacing.sidebar-w` = 240): `bg-sub`, right border `1px border`. Brand row holds a 26px gradient logo tile (`linear-gradient(135deg, primary, primary-hover)`), the WODOOH wordmark, and a muted role subtype.
- Topbar (`spacing.topbar-h` = 56): sticky, breadcrumb left, 32×32 icon-buttons right.
- Page padding: `spacing.page-x` × `spacing.page` (28px × 24px).
- Active nav resolution is **longest-href prefix match** against `usePathname()`. Detail routes (`/admin/users/[id]`) still highlight their parent (`Users`).

**Density tokens** scale the visible chrome. The compact preset shipped on every shell today; a balanced preset exists for surfaces where 30px buttons feel right (rare so far). Switching is global — set `[data-nx-density]` on `<html>`, never on a single component.

| Token | Compact | Balanced |
|---|---|---|
| `density-*-stack` (gap between blocks) | 12 | 16 |
| `density-*-pad` (in-card padding) | 14 | 18 |
| `density-*-button-h` (button + input height) | 28 | 30 |
| base font size | 13 | 14 |

**Theme switching** is set on `<html>` from each layout:

```js
const stored = localStorage.getItem("wodooh.theme");
const resolved = stored ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
document.documentElement.dataset.nxTheme = resolved;
document.documentElement.dataset.nxDensity = "compact";
```

Persisted under `localStorage["wodooh.theme"]`. Pages without a layout (splash, profile, onboarding) replicate the same boot.

**Auth shell (login)** is the one exception: a centered card on the page background, no sidebar, no topbar (just a theme-toggle in the top-right). Card width is 308px capped at `calc(100vw - 32px)`. The `--nl-*` tokens in `app/login/login.css` mirror the `--nx-*` values so the login page renders correctly when entered cold without the admin layout having booted yet.

## Elevation & Depth

| Token | Light | Dark |
|---|---|---|
| `shadow-sm` (cards, version pills) | `0 1px 2px rgba(0,0,0,.04)` | `0 1px 2px rgba(0,0,0,.30)` |
| `shadow-md` (segmented active, hovered nav-active) | `0 2px 6px rgba(0,0,0,.06)` | `0 2px 6px rgba(0,0,0,.40)` |
| Modal | `0 20px 50px rgba(0,0,0,.25)` | same |
| Toast | `0 8px 30px rgba(0,0,0,.20)` | same |

No blur, no `drop-shadow`, no per-component shadow scales beyond these. The legacy Bauhaus hard-shadow (`8px 8px 0 0 #121212`) is gone — re-introducing it is a regression.

## Shapes

| Token | Value | Where it's used |
|---|---|---|
| `rounded.sm` | 4px | active segmented button |
| `rounded.md` | 6px | buttons, inputs, nav items, tabs (the body of the strip), version pills |
| `rounded.lg` | 8px | cards, KPI tiles, toasts |
| `rounded.xl` | 10px | modal |
| `rounded.full` | 999px | pill-shaped badges, the badge dot, sidebar avatar circles |

Hard corners (`rounded: 0`) are not part of the system. The Bauhaus zero-radius rule from the deleted Northfield doc is no longer in effect.

## Components

All `.nx-*` classes live in `app/nexus.css` and are referenced directly by JSX. When a primitive doesn't exist, add it to that file so it participates in theme + density automatically — do not invent inline alternatives in a page file.

### Page head

```jsx
<div className="nx-page-head">
  <div>
    <h1 className="nx-page-title">Users</h1>
    <p className="nx-page-sub">{total} users · manage roles and access</p>
  </div>
  {/* optional right-side action */}
</div>
```

### Card

```jsx
<div className="nx-card">
  <div className="nx-card-head">
    <div>
      <h3 className="nx-card-title">Recent signups</h3>
      <p className="nx-card-sub">Latest users added to the platform</p>
    </div>
    {/* optional right-side: badge or button */}
  </div>
  {/* body: <table className="nx-tbl">…, <div className="nx-empty">…, <div className="nx-loading">…, or padded content */}
</div>
```

Use `.nx-card-padded` for free-form padded bodies; otherwise the head's bottom border and the table/empty state already define the internal structure.

### KPI strip

```jsx
<div className="nx-kpi-strip">  {/* grid 4 cols → 2 at <1100px */}
  <div className="nx-kpi">
    <p className="nx-kpi-label">Total users</p>
    <div className="nx-kpi-value">3,847</div>
    {/* optional .nx-kpi-trend / .nx-kpi-icon */}
  </div>
</div>
```

Loading state is the literal em-dash `"—"`, never a spinner inside a KPI.

### Two-col grid

`.nx-grid-2` is a fixed `2fr 1fr` with `var(--nx-stack)` gap, collapsing to 1-col at <1100px. Use for "main list + side rail" patterns (admin dashboard "Recent signups | Quick actions").

### Tables

```jsx
<div className="nx-tbl-wrap">
  <table className="nx-tbl">
    <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Joined</th></tr></thead>
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

`.nx-user-cell` is the canonical "person row prefix": 28px circular avatar (background derived from `hsl(hash(name) % 360, 60%, 45%)`) + name + email stack. Never render a bare `{user.name}` in a row.

### Badges

```jsx
<span className="nx-badge nx-role-instructor">
  <span className="nx-badge-dot" />
  Instructor
</span>
```

The four `.nx-role-*` classes also serve as the **status palette** — see §Colors. Don't add `.nx-status-*` siblings.

### Buttons

| Variant | Notes |
|---|---|
| `.nx-btn .nx-btn-primary` | Filled accent. Ships with an inset highlight + 1px shadow for the platform-button look. |
| `.nx-btn .nx-btn-ghost` | Bordered, neutral. Default for secondary actions and link-style "Quick action" lists. |
| `.nx-btn .nx-btn-danger` | Filled danger. Permanent-delete and similar. |
| `.nx-icon-btn` | 32×32 chromeless icon button (topbar). |

For inflight states, prefix the label with `<span className="nx-spin" />` and switch text to "Saving…", "Checking…", etc. Disabled is `opacity: 0.55; cursor: not-allowed`.

### Inputs

```jsx
<div className="nx-input-wrap">  {/* flex container; focus-within = accent ring */}
  <SearchIcon style={{ color: "var(--nx-fg-subtle)" }} />
  <input className="nx-input" placeholder="Search…" />
</div>

<select className="nx-select"><option>…</option></select>
```

`.nx-input-wrap` provides the visible border + focus ring (3px ring at `color-mix(--nx-accent 22%, transparent)`). A bare `<input className="nx-input">` won't get the ring.

### Modal

```jsx
<div className="nx-modal-backdrop" onClick={maybeClose}>
  <div className="nx-modal" onClick={e => e.stopPropagation()}>
    <div className="nx-modal-head"><h3 className="nx-modal-title">…</h3></div>
    <div className="nx-modal-body">…</div>
    <div className="nx-modal-foot">
      <button className="nx-btn nx-btn-ghost" onClick={cancel}>Cancel</button>
      <button className="nx-btn nx-btn-primary" disabled={saving} onClick={save}>
        {saving ? <><span className="nx-spin" /> Saving…</> : "Save"}
      </button>
    </div>
  </div>
</div>
```

Backdrop `rgba(0,0,0,.42)` fade-in 150ms. Modal scale-in 150ms `cubic-bezier(0.16, 1, 0.3, 1)`. Foot is right-aligned: ghost cancel **then** primary action. Backdrop click dismisses **only** when not in an inflight state.

### Tabs

```jsx
<div className="nx-tabs">
  <button className="nx-tab" data-active={tab==="general"} onClick={…}>General</button>
</div>
```

Underline tabs, not pills. Active is `data-active="true"` → `fg` text + 2px bottom border in `fg`. The strip's 1px bottom border is overlapped by the active tab's `margin-bottom: -1px`.

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

Flex space-between, 16×0 padding, 1px bottom border (last child none). Stack vertically inside a card.

### Segmented control

```jsx
<div className="nx-segmented">
  <button className="nx-segmented-btn" data-active={mode==="light"}><Sun /> Light</button>
  <button className="nx-segmented-btn" data-active={mode==="dark"}><Moon /> Dark</button>
</div>
```

Pill-on-pill. Use for binary or 2–3-way preferences.

### Empty / loading / error contract

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

This four-branch contract — `loading → error → empty → data` — is mandatory for every async card. Maintenance mode (HTTP 503 from the backend) is a **global** state per the cross-package contract in `../CLAUDE.md`; surface it as a banner or full-page state, not a per-card "Database error".

### Toasts

```jsx
{toast && (
  <div className="nx-toast-region">
    <div className={`nx-toast nx-toast-${toast.kind}`}>{toast.msg}</div>
  </div>
)}
```

Region: fixed bottom-right (20×20), column, 8px gap, `pointer-events: none` on region with `auto` per-toast. `kind = success | error | info` controls the left 3px stripe. Auto-dismiss in the page via `useEffect` with a 3.5–4s `setTimeout`.

### Animation

| Where | Duration | Easing |
|---|---|---|
| Hover, focus, color/bg/border swaps | 80ms | linear (default) |
| Modal scale-in | 150ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Backdrop fade-in | 150ms | ease-out |
| Toast slide-in | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Spinner | 600ms / rotation | linear |

No layout/transform animations on hover. No box-shadow animation outside modal/toast. No card shadow-bounce.

### Iconography

Inline SVG only. Stroke-based:

- `viewBox="0 0 24 24"`
- `fill="none"`, `stroke="currentColor"`
- `stroke-width: 1.6`, `stroke-linecap: round`, `stroke-linejoin: round`
- Sidebar / nav icons render at 15px, ghost-button icons at 13–15px.

Define icon components inline at the top of each page (see `app/admin/layout.tsx`'s `I.*` map). A centralised icon module is acceptable later but not required.

## Do's and Don'ts

**Do**

- Read every value from `var(--nx-*)` (or `var(--accent)` for role-tinted CTAs).
- Compose pages from `nx-*` primitives. Add new primitives to `app/nexus.css` so they participate in theme + density.
- Render the four-branch state contract on every async card: loading → error → empty → data.
- Wrap every input in `.nx-input-wrap`.
- Render numbers, IDs, dates, timestamps, version strings, and "X of Y" counts in `.nx-tbl-mono`, `.nx-kpi-value`, `.nx-pagination-info`, or `.nx-version-pill`. Mono is data only.
- Use `<thead>` + `<th scope="col">`. Every input has `<label htmlFor>` or `.nx-field-label`.
- Use the lowercase backend role names in CSS and class names (`student | instructor | chairman | admin`). The docs casing (`DepartmentChairman`) is for prose only.
- Use `body.<role>` + `var(--accent)` for role tinting. Override `--nx-accent` locally on a wrapper if a Nexus button should follow the role accent inside a portal.
- Trust the cross-package contract from `../CLAUDE.md`: a 503 from any endpoint is global maintenance, JWT lifetime is 1h with no refresh, response shape is `{ status, message, data }`.

**Don't**

- Don't put hex literals in `.tsx`. No `bg-[#F0C020]`, no `border-[#121212]`. Tokens only.
- Don't re-introduce Bauhaus utilities (`.bauhaus-*`, `.font-nf-*`, `.dashboard-*`, hard-offset shadows, `borderRadius: 0` overrides). They were deleted in the migration; bringing them back is a regression.
- Don't fork button or input classes for role tinting. Override `--nx-accent` instead.
- Don't render an "identity bridge" affordance on the client — never co-render a real `studentNumber` with `authorAnonymousCourseID`. No tooltips, no hover-reveal, no debug overlays exposing the bridge. The architectural privacy invariant in `../wodooh-docs/CLAUDE.md` is enforced server-side, but UI must respect it too.
- Don't override `--nx-btn-h` on individual buttons. Density is global — change `[data-nx-density]` on `<html>`.
- Don't write `.tsx` against a `@media (prefers-color-scheme)` rule. Dark mode is keyed by `[data-nx-theme="dark"]`.
- Don't conflate `.nx-role-*` (badge / status palette) with `var(--accent)` (action color cascade). They are separate layers.
- Don't add a custom shadow scale, a third type family, or any radius outside `{4, 6, 8, 10, 999}px`.
- Don't reach for `font-mono` on a label or button. JetBrains Mono is for data only.
