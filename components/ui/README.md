# WODOH UI Primitives

Reusable components for the WODOH design system. All components use design tokens from `app/globals.css` — no inline hex values.

## BrandMark

Bilingual wordmark: `WODOH | وضوح`.

```tsx
import { BrandMark } from "@/components/ui/brand-mark"

<BrandMark size="lg" tagline />
<BrandMark size="sm" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Text size |
| `tagline` | `boolean` | `false` | Show "Institutional Clarity" subtitle |

## Button (WODOH variants)

Extended from shadcn Button. Use `wodoh-*` variants for WODOH pages.

```tsx
import { Button } from "@/components/ui/button"

<Button variant="wodoh-primary" size="wodoh">Sign In</Button>
<Button variant="wodoh-secondary" size="wodoh">Cancel</Button>
<Button variant="wodoh-ghost" size="wodoh">Skip</Button>
```

| Variant | Description |
|---------|-------------|
| `wodoh-primary` | Dark bg, white text, uppercase |
| `wodoh-secondary` | Light bg, subtle border, uppercase |
| `wodoh-ghost` | Text only, uppercase |

Size `"wodoh"` gives `h-12 px-6 text-sm rounded-wd-small`.

## Input

```tsx
import { Input } from "@/components/ui/input"

<Input id="email" type="email" placeholder="name@university.edu" />
```

Supports all native `<input>` props. Error state via `aria-invalid`.

## Label

```tsx
import { Label } from "@/components/ui/label"

<Label htmlFor="email">Email Address</Label>
```

Renders uppercase, tracked text by default.

## Card

```tsx
import { Card, CardContent } from "@/components/ui/card"

<Card>
  <CardContent>
    Your content here
  </CardContent>
</Card>
```

## TrustCue

```tsx
import { TrustCue } from "@/components/ui/trust-cue"

<TrustCue icon="lock" title="Privacy by Architecture">
  Your identity is never stored or shared with external parties.
</TrustCue>
```

| Prop | Type | Description |
|------|------|-------------|
| `icon` | `string` | Material Symbols icon name |
| `title` | `string` | Bold title line |
| `children` | `ReactNode` | Body text |

## PageShell

```tsx
import { PageShell } from "@/components/ui/page-shell"

<PageShell>
  <div className="w-full max-w-md">
    Page content
  </div>
</PageShell>

<PageShell footer={false}>
  Content without footer
</PageShell>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `footer` | `boolean` | `true` | Show/hide the footer |
