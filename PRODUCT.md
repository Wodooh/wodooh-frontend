# Product

## Register


> Scope note: this PRODUCT.md governs the **public, unauthenticated** surface
> (the `/` landing page). The authenticated app (admin / instructor / student /
> chairman portals) is a `product` register documented by `DESIGN.md` (the
> Nexus design system). The landing page must read as the same world a visitor
> lands in after signing in.

## Users

Two visitors arrive at the landing page, both unauthenticated:
- **Instructors / faculty** evaluating whether to run WODOOH in their lectures.
- **Students** sent a link, deciding whether to create an account and join their
  section.

Their context: a quick, skeptical first read. The page must explain what WODOOH
is (an engagement overlay, not an LMS), earn trust on anonymity, and route to the
two real auth routes (`/login`, `/onboarding`).

## Product Purpose

WODOOH (وضوح, "clarity") is an instant, anonymous classroom engagement system, a
KSU senior project (GP2). During a live lecture, students submit questions and
reactions anonymously while the instructor moderates in real time. It is an
engagement overlay layered on a normal lecture, not a course-management system.
Success for this page: a visitor understands the product in one scroll and trusts
the anonymity model enough to sign in or register.

## Brand Personality

Clear, modern, trustworthy, with quiet energy. A real-time academic tool, not a
playful consumer app and not a heavyweight enterprise LMS. Voice is specific and
plain: it names what the product literally does (live sessions, anonymous
questions, reactions, section-scoped rooms) rather than reaching for marketing
abstractions.

## Anti-references

- **Not an LMS / SIS portal.** No course-catalog, gradebook, or admin-console feel.
- **Not warm editorial.** No cream/sand body, no display-serif + italic drop caps,
  no broadsheet magazine grid. (The original brief called this out explicitly.)
- **Not generic SaaS slop.** No purple-gradient-on-white hero, no Inter/Roboto
  defaults chosen by reflex, no cookie-cutter icon-card grid, no per-section
  uppercase eyebrow kickers.
- **No mono-as-costume.** Monospace appears only where the real product uses it
  (anonymous IDs, counts), never as decorative "tech" flavor.

## Design Principles

1. **Same world as the app.** Reuse the Nexus tokens, fonts, radius, and dark-mode
   behavior so the landing and the signed-in product are visibly one product.
2. **Lead with the privacy story.** Anonymity is the reason the product works;
   it gets the first and largest feature, told in plain language.
3. **Show the product, don't just describe it.** The hero carries a faithful live
   session mock (real reaction labels, real pseudonym shape) instead of abstract
   illustration.
4. **Energy through composition and one orchestrated entrance**, not scattered
   micro-interactions. Restraint in palette, confidence in hierarchy.
5. **Every word earns its place.** Specific nouns and verbs over buzzwords.

## Accessibility & Inclusion

WCAG 2.1 AA. Body and small-label text must clear 4.5:1; large/bold text 3:1.
Semantic landmarks and real heading order, keyboard-reachable controls with
visible focus, alt/`aria-hidden` handled on decorative imagery. Honor
`prefers-reduced-motion` (the page-load reveal degrades to no motion). Markup is
RTL-safe (logical properties throughout) since the product is bilingual
(English/Arabic) even though this page ships in English.
