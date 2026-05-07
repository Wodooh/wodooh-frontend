# DESIGN.md — Northfield Academic Platform

**Theme: "Structured Knowledge. Absolute Clarity." — IBM Plex · Zero Radius · Institutional Authority.**
Read fully before touching any page. No `rounded-*`, no `shadow-md|lg`, no fonts outside IBM Plex.

## Quick Reference

| Token | Value |
|---|---|
| Background | `#F9F9F7` |  Foreground | `#111111` |  Muted border | `#E5E5E0` |
| Student accent | `#1A56DB` |  Faculty accent | `#0F766E` |  Chairman accent | `#CC0000` |
| Border radius | `0px` everywhere |  Heading | IBM Plex Serif (Bold/SemiBold) |
| Body | IBM Plex Serif Regular |  UI/Chrome | IBM Plex Sans (Med/SemiBold) |
| Dense labels | IBM Plex Sans Condensed |  Data/IDs/dates/grades | IBM Plex Mono |
| Hover shadow | `4px 4px 0 0 #111111` (hard offset) |  Max width | `max-w-screen-xl` |

## Colors

```
--bg #F9F9F7  --fg #111111  --muted #E5E5E0  --border #111111
--student #1A56DB  --faculty #0F766E  --chairman #CC0000
neutral-100 #F5F5F5  -200 #E5E5E5  -400 #A3A3A3  -500 #737373  -600 #525252  -700 #404040

Status (text / bg / border):
  Pass/Active:   #166534 / #DCFCE7 / #166534
  Fail/Overdue:  #991B1B / #FEE2E2 / #991B1B
  Pending/Draft: #92400E / #FEF3C7 / #92400E
  Enrolled:      #1E3A5F / #DBEAFE / #1E3A5F
```
Role accents only on nav-active / CTA / badges. Never use color alone for status — pair with text.

## Typography

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Condensed:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=block');
.font-serif{font-family:'IBM Plex Serif',serif} .font-sans{font-family:'IBM Plex Sans',sans-serif}
.font-condensed{font-family:'IBM Plex Sans Condensed',sans-serif} .font-mono{font-family:'IBM Plex Mono',monospace}
```

| Use | Font | Weight |
|---|---|---|
| H1 / portal title | Serif | Bold 700, `text-4xl lg:text-6xl`, tracking-tight |
| H2 / section | Serif | SemiBold 600, `text-2xl lg:text-3xl` |
| H3 / card title | Serif | SemiBold 600, `text-lg lg:text-xl` |
| Body / prose | Serif | Regular 400, `text-sm`–`text-base`, leading-relaxed |
| Nav, buttons, labels | Sans | Medium 500 / SemiBold 600 |
| Column headers, filter chips | Sans Condensed | SemiBold 600 |
| **Grades, IDs, codes, dates, GPA, credits, stats, metadata, timestamps** | **Mono** | Regular 400 |

Uppercase + `tracking-widest`: nav items, table headers, status badges, form labels, breadcrumbs, category tags. Sentence case: headings, body, button labels, announcements.

## Borders, Shadows & Backgrounds

```
radius 0 always (no rounded-*) | divider border 1px #111111 | section sep border-b-2
panel border-2 | role stripe border-l-4 in accent
.hard-shadow-hover:hover { box-shadow: 4px 4px 0 0 #111111; transform: translate(-2px,-2px); }
```
No blur, no `shadow-md|lg|xl`, no `drop-shadow`. Hard offset only.

```jsx
// Dot grid on every portal page root
style={{backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111111' fill-opacity='0.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E")`}}
// .academic-texture — KPI cards & inverted sections (cross-grid overlay)
.academic-texture::before{content:'';position:absolute;inset:0;background-image:linear-gradient(0deg,transparent 98%,rgba(0,0,0,.02) 100%),linear-gradient(90deg,transparent 98%,rgba(0,0,0,.02) 100%);background-size:3px 3px;opacity:.5;pointer-events:none}
// Section ornament divider
<div className="py-6 text-center font-mono text-xs text-neutral-400 tracking-[1em] uppercase">· · · · ·</div>
```

## Components (use these exact names)

```jsx
// RoleBadge — role-colored outline chip
<span className="border border-[#1A56DB] text-[#1A56DB] px-2 py-0.5 font-mono text-xs uppercase tracking-widest">Student</span>
// (replace color for Faculty #0F766E / Chairman #CC0000)

// CourseCodeChip — never use plain text for course codes
<span className="border border-[#111111] font-mono text-xs px-2 py-0.5">CS-401</span>

// StatusBadge — text + color (not color alone)
<span className="font-mono text-xs px-2 py-0.5 uppercase tracking-wide bg-[#DCFCE7] text-[#166534] border border-[#166534]">Passed</span>

// CourseCard
<div className="border-2 border-[#111111] bg-[#F9F9F7] p-6 hard-shadow-hover transition-all duration-200">
  <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">CS-401</p>
  <h3 className="font-serif text-xl font-semibold mt-1">Advanced Algorithms</h3>
  <p className="font-sans text-sm text-neutral-600 mt-2">Dr. Vasquez · MWF 10:00–11:00</p>
  <div className="mt-4 flex gap-4 border-t border-[#E5E5E0] pt-4">
    <span className="font-mono text-xs">3 Credits</span>
    <span className="font-mono text-xs bg-[#DBEAFE] text-[#1E3A5F] border border-[#1E3A5F] px-2 py-0.5 uppercase">Enrolled</span>
  </div>
</div>

// GradeTable — full semantic <table>; black header; mono body; hover:bg-neutral-100
<table className="w-full border-collapse border border-[#111111] font-mono text-sm">
  <thead><tr className="bg-[#111111] text-[#F9F9F7]">
    <th scope="col" className="border border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-condensed font-semibold">Student ID</th>
    {/* ... */}
  </tr></thead>
  <tbody><tr className="hover:bg-neutral-100 transition-colors duration-150">
    <td className="border border-[#E5E5E0] px-4 py-3 font-mono">2024-CS-0041</td>
    {/* ... */}
  </tr></tbody>
</table>

// AnnouncementPanel — left-stripe in role accent
<div className="border border-[#111111] border-l-4 border-l-[#0F766E] bg-[#F9F9F7] p-6">…</div>

// KpiStatCard — Chairman dashboards
<div className="border-2 border-[#111111] bg-[#F9F9F7] p-6 academic-texture">
  <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">Total Enrolled</p>
  <p className="font-mono text-5xl font-medium leading-none">3,847</p>
  <p className="font-sans text-xs text-[#0F766E] mt-2 uppercase tracking-wide">↑ 12.4% vs Last Semester</p>
</div>

// ApprovalQueueItem, TranscriptRow, RosterTable, AttendanceGrid, DeadlineTimeline,
// DepartmentAccordion, RunningMetadataHeader — follow same conventions: 0 radius,
// mono data, serif headings, sans labels uppercased.

// RunningMetadataHeader (above every report/table)
<p className="font-mono text-xs text-neutral-400 mb-4 uppercase tracking-widest">
  Northfield University · Dept. of Computer Science · Spring 2026 · Generated: 03 May 2026
</p>
```

## Buttons (all `min-h-[44px] min-w-[44px]`, radius 0)

```jsx
// Primary
"bg-[#111111] text-[#F9F9F7] border border-transparent font-sans font-medium uppercase tracking-widest text-xs px-6 py-3 hover:bg-white hover:text-[#111111] hover:border-[#111111] transition-all duration-200 min-h-[44px]"
// Role-accent outline (replace COLOR with role hex)
"border-2 border-[COLOR] text-[COLOR] font-sans font-medium uppercase tracking-widest text-xs px-6 py-3 hover:bg-[COLOR] hover:text-white transition-all duration-200 min-h-[44px]"
// Destructive
"border border-[#991B1B] text-[#991B1B] font-sans text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#991B1B] hover:text-white transition-all duration-200 min-h-[44px]"
// Ghost
"text-[#111111] font-sans text-xs uppercase tracking-widest px-4 py-2 hover:bg-[#E5E5E0] transition-colors duration-200 min-h-[44px]"
```

## Inputs

```jsx
<label htmlFor="x" className="font-sans text-xs uppercase tracking-widest text-neutral-600 block mb-1">Field Label</label>
<input id="x" style={{borderRadius:0}} className="border-b-2 border-[#111111] bg-transparent px-3 py-2 font-mono text-sm w-full focus-visible:bg-[#F0F0F0] focus-visible:outline-none transition-colors duration-200"/>
```
Every input requires `<label htmlFor>`. No unlabeled inputs ever.

## Navigation & Layout

```
Sidebar: w-64, border-r-2 border-[#111111], bg-[#F9F9F7], full height. Mobile: off-canvas drawer.
Main:    <main className="ml-64 max-w-screen-xl mx-auto px-6 py-8">

Sidebar header: border-b-2 border-[#111111] p-6, "Northfield University" mono uppercase + role title serif bold + "Vol. 2026 · Spring Semester" mono.
Section label:  font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 px-6 py-2 mt-4
Nav item:       px-6 py-3 font-sans text-xs uppercase tracking-widest text-neutral-700 hover:bg-neutral-100 border-l-4 border-transparent min-h-[44px]
Active item:    text-[var(--accent)] bg-neutral-100 border-l-4 border-[var(--accent)]
```

## Role-Aware CSS Custom Properties

```css
body.student  { --accent:#1A56DB; --accent-hover:#1741B0; }
body.faculty  { --accent:#0F766E; --accent-hover:#0A5754; }
body.chairman { --accent:#CC0000; --accent-hover:#AA0000; }
```
Set the role class on `<body>` (or portal root) based on authenticated user.role. Components reference `var(--accent)` — no conditional class logic.

> Backend role names: `student | instructor | chairman | admin`. Map `instructor → faculty` for design tokens.

## Portal Layouts

- **Student dashboard**: Title bar → `[GPA Summary | Today's Schedule | Upcoming Deadlines]` 3-col → Enrolled Courses (CourseCard grid 3-col) → Recent Announcements list. Sidebar: Dashboard · My Courses · Transcript · Timetable · Announcements.
- **Faculty (instructor) dashboard**: Title bar → `[Today's Classes | Pending Grading]` 5/7 split → Course Management tabs (Roster | Attendance | Grades | Materials) → Announcement Composer. Sidebar: Dashboard · My Courses · Grade Book · Announcements · Reports.
- **Chairman dashboard**: Black ticker strip → 4-col KPI grid (Enrollment | Faculty | Pass Rate | Approvals) → `[Charts | Approval Queue]` 8/4 → Departmental Reports accordion → Policy archive. Sidebar: Overview · Departments · Faculty · Students · Reports · Policy.
- **Inverted black section**: Exactly one per dashboard. `bg-[#111111] text-[#F9F9F7] py-12 px-6 academic-texture`. Inside: text `#F9F9F7`, borders `#333333`, accent in `var(--accent)`, mono data stays mono.

## Motion & Responsive

`transition-all duration-200 ease-out` on interactives; `transition-colors duration-200` on buttons/nav. Cards use `hard-shadow-hover`; rows only `hover:bg-neutral-100`; avatars grayscale→grayscale-0 on hover. Accordion: grid-template-rows `0fr↔1fr` + opacity, 300ms. Never animate `box-shadow` — use opacity on a pseudo-element.

Mobile <768: sidebar → drawer; grids → 1-col; tables → `overflow-x-auto` + `min-w-[640px]`; H1 → `text-3xl`. md 768+: Faculty primary. lg 1024+: Chairman primary. Always preserve: 0 radius, mono data, uppercase labels w/ tracking-widest, RoleBadge, CourseCodeChip (never plain text), `min-h-[44px]` touch targets.

## Accessibility

- `#111111` on `#F9F9F7` = AAA. Role accents + status badges meet AA.
- Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2` (or `ring-[var(--accent)]`).
- Semantic HTML required: `<header><nav><main><section><aside><footer>`, `<table><thead><tbody><th scope=…>`, `<label htmlFor>`, `<button>` (never `<div onClick>`), `<a href>` for links.
- ARIA: sidebar `role="navigation" aria-label="<Role> Portal Navigation"`; live status badges `role="status"`; approval queue `aria-live="polite"`; sortable columns `aria-sort`; accordion `aria-expanded`.

## Implementation Checklist

- [ ] Plex font import in globals.css; body has dot-grid background
- [ ] `body.<role>` class set from auth; components use `var(--accent)`
- [ ] No `rounded-*`, no `shadow-md|lg|xl|drop-shadow` anywhere
- [ ] All grades/IDs/codes/dates/GPA/credits → `font-mono`; UI chrome → `font-sans`; headings → `font-serif`
- [ ] Status as text badges (never color-only); course codes always in `CourseCodeChip`
- [ ] Active nav item has `border-l-4` in role accent
- [ ] Tables use `<thead><th scope="col">`; every input has `<label htmlFor>`
- [ ] All interactives `min-h-[44px]` and have `focus-visible` ring
- [ ] Exactly one inverted black section per dashboard
- [ ] `RunningMetadataHeader` above every table/report

*Northfield University Academic Platform · IBM Plex · Zero Radius · Institutional Authority*
