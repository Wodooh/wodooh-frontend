# WODOH Design System

**WODOH | وضوح** — "Institutional Clarity"

## Design Principles

- **Voice**: Institutional, restrained, trust-forward. No playful gradients, rounded blobs, or emoji.
- **Layout**: Generous whitespace. Content centered in narrow columns (`max-w-md` for forms, wider for dashboards). Clear vertical rhythm with `space-y-{6,8,12}`.
- **Bilingual**: Every brand surface shows English + Arabic. Use `lang="ar"` on Arabic spans.
- **Light mode only** (for now): `class="light"` on `<html>` — dark mode will be added later.

## Design Tokens

All tokens use the `--wd-` CSS variable prefix and map to Tailwind classes with the `wd-` prefix.

| Token | CSS Variable | Value | Tailwind Class |
|-------|-------------|-------|----------------|
| Primary | `--wd-primary` | `#1A1A1A` | `bg-wd-primary`, `text-wd-primary` |
| Surface Low | `--wd-surface-low` | `#F9FAFB` | `bg-wd-surface-low` |
| Surface Mid | `--wd-surface-mid` | `#F3F4F6` | `bg-wd-surface-mid` |
| Border Subtle | `--wd-border-subtle` | `#D1D5DB` | `border-wd-border-subtle` |
| Muted Text | `--wd-muted-text` | `#6B7280` | `text-wd-muted-text` |
| Body Text | `--wd-body-text` | `#374151` | `text-wd-body-text` |
| White | `--wd-white` | `#FFFFFF` | `bg-wd-white` |
| Radius Small | `--wd-radius-small` | `6px` | `rounded-wd-small` |
| Radius Large | `--wd-radius-large` | `12px` | `rounded-wd-large` |

## Typography

**Font stack**: IBM Plex Sans (Latin) + IBM Plex Sans Arabic (Arabic) + sans-serif.

| Use | Classes |
|-----|---------|
| Labels | `text-[13px] font-medium uppercase tracking-wider text-wd-body-text` |
| Micro-labels / footer | `text-[11px] uppercase tracking-[0.2em] text-wd-muted-text` |
| Body text | `text-wd-body-text` (default) |
| Brand wordmark | `text-3xl font-bold tracking-tight` with Arabic in `font-normal text-wd-muted-text` |

## Borders & Shadows

- Borders: `border border-wd-border-subtle` — never heavier.
- Card shadow: `shadow-[0_2px_8px_rgba(0,0,0,0.05)]` — never heavier.
- Inputs/buttons: `rounded-wd-small` (6px).
- Cards: `rounded-wd-large` (12px).

## Buttons

| Variant | Classes |
|---------|---------|
| Primary | `bg-wd-primary text-white uppercase tracking-widest font-semibold`, hover `bg-wd-primary/90` |
| Secondary | `bg-wd-surface-low text-wd-body-text border border-wd-border-subtle uppercase tracking-widest font-semibold` |
| Ghost | `text-wd-muted-text hover:text-wd-body-text hover:bg-wd-surface-low` |

No gradient buttons. Use `variant="wodoh-primary"` / `"wodoh-secondary"` / `"wodoh-ghost"` with `size="wodoh"`.

## Inputs

`bg-wd-surface-low border border-wd-border-subtle rounded-wd-small px-4 py-3`. Focus: `focus:border-wd-primary focus:ring-1 focus:ring-wd-primary/20`.

## Trust Cues

Left-border accent block: `border-l-2 border-wd-primary/20` on `bg-wd-surface-mid` with a Material Symbols icon + 2-line copy. Use anywhere you need to reassure users about privacy/security.

## Icons

Material Symbols Outlined, weight 300, `font-size: 18px` in trust cues, `20px` elsewhere.

```tsx
<span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
```

## Don'ts

- No dark-mode-specific colors yet.
- No arbitrary hex values in components — only tokens.
- No emoji in UI.
- No heavy shadows or gradients.
- No inline styles except for icon `fontSize`.

## How to Build a New Page

1. Wrap content in `<PageShell>` for consistent layout and footer.
2. Use `<Card>` + `<CardContent>` for content containers.
3. Use `<BrandMark>` at the top of auth/landing pages.
4. Use `<Label>` + `<Input>` for form fields.
5. Use `<Button variant="wodoh-primary" size="wodoh">` for primary actions.
6. Add `<TrustCue>` blocks where privacy/security reassurance is needed.
7. Only use `wd-*` Tailwind classes for colors, radii, and spacing.
8. Test with `npx tsc --noEmit` and `npm run lint` before committing.

## Component Inventory

| Component | Path | Description |
|-----------|------|-------------|
| `BrandMark` | `components/ui/brand-mark.tsx` | Bilingual wordmark with optional tagline |
| `Button` | `components/ui/button.tsx` | Extended shadcn button with WODOH variants |
| `Input` | `components/ui/input.tsx` | Form input with WODOH styling |
| `Label` | `components/ui/label.tsx` | Uppercase tracked label |
| `Card` | `components/ui/card.tsx` | Content container with border and shadow |
| `TrustCue` | `components/ui/trust-cue.tsx` | Privacy/security reassurance block |
| `PageShell` | `components/ui/page-shell.tsx` | Page layout with centered content and footer |
