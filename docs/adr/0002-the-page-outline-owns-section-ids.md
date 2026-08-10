# ADR-0002: One Page Outline owns section ids, hrefs, and nav labels

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

The page is a single scrolling document whose sections are reached by anchor
links. Three things had to agree for that to work, and nothing tied them
together:

- **The nav hrefs.** `components/sections/header.tsx` held an inline
  `navItems` array, mapped twice — once for the desktop nav, once for the
  mobile sheet.
- **A second, unused copy.** `data/constants/navigation.ts` exported a
  byte-identical `navItems` with **zero importers** — dead code that read like
  the source of truth.
- **The anchor ids.** Each of the five section components hand-wrote its own
  `id` string: `about.tsx`, `experience.tsx`, `projects.tsx`, `education.tsx`,
  and `contact-form.tsx`.

So a section id, its nav href, and its nav label were three unrelated strings
in three places. Renaming a section, reordering the nav, or adding a section
meant editing files that had no reference to one another, and getting it wrong
produced a link that silently scrolled nowhere — no error, no failing test.

## Decision

One **Page Outline** module, `lib/page-outline.ts`, owns the list of sections
and exposes:

- `pageOutline` — the sections in page order, each `{ id, label, href }`
- `section` — the same records keyed by id, for the section components
- `SectionId` — the union of the five ids

The href is **derived** (`` `#${id}` ``), never written by hand, so it cannot
disagree with the id. The section components render `section.<id>.id` rather
than a bare string, which makes the coupling real at compile time: renaming or
removing a section in the outline is a type error at the section that would
have broken. This was verified — renaming `projects` fails `tsc` at
`components/sections/projects.tsx`.

`data/constants/navigation.ts` and the `NavigationItem` type in `data/types.ts`
are deleted.

Supporting decisions:

- **The module lives in `lib/`, not `data/constants/`.** `data/constants/`
  holds page *content* (experiences, projects, education). The outline is page
  *structure* with derivation and a type over it, so it sits with the other
  logic modules.
- **`AnimatedSection` keeps `id?: string`.** Typing the prop as `SectionId`
  would also catch typos, but it pushes a domain type into a generic UI
  primitive that `Hero` uses with no id at all. Going through `section.<id>`
  gets the same guarantee at the call site without the leak.
- **Order lives in the array.** The nav order and the render order in
  `app/page.tsx` are still two lists; the outline fixes the *strings*, not the
  composition. Making `page.tsx` render from the outline would mean mapping ids
  to components, which buys little for five static sections.

## Consequences

- Adding, renaming, or reordering a section is a one-file edit, and a mistake
  is a compile error rather than a dead link.
- The duplicate list is gone: one definition, three consumers (desktop nav,
  mobile sheet, and the sections themselves).
- `lib/page-outline.test.ts` covers the invariants the type system does not —
  href derivation, unique ids, non-empty labels, and that the lookup and the
  ordered list hold the same records.
- The outline knows nothing about which component renders a section. If a
  section is deleted from the outline but its component stays mounted in
  `app/page.tsx`, that is a type error at the component — but the reverse
  (an outline entry with no section on the page) is not caught. With five
  hand-composed sections that is visible immediately; it would need a test if
  the page ever became data-driven.
