# ADR-0006: One component owns a section's frame

- **Status:** Accepted
- **Date:** 2026-08-10
- **Supersedes:** the "Section Heading component" decision in
  [ADR-0004](0004-the-page-outline-owns-section-headings.md). ADR-0004's core
  decision — that the Page Outline owns section headings — is **not** reversed
  and still stands.

## Context

ADR-0004 closed the heading gap: a section's heading became a Page Outline
field, and `components/section-heading.tsx` became the one place the heading
markup lived. It left the same defect standing one line up.

Every section opened with the same frame:

```tsx
<AnimatedSection id={section.about.id} className="scroll-mt-20 pt-4">
  <SectionHeading section={section.about} />
```

`scroll-mt-20 pt-4` appeared four times — in `components/sections/about.tsx`,
`components/sections/projects.tsx`, `components/contact-form.tsx` and
`components/timeline-section.tsx`. That is the same four-copy class string,
with the same four chances to miss one, that ADR-0004 gave as the reason to
collapse the heading markup in the first place.

The scroll offset was worse than the heading had been. `scroll-mt-20` has to
agree with the sticky header's height, which was `h-20` in
`components/sections/header.tsx`. Nothing expressed that agreement: the two
numbers matched by coincidence of authorship. Change the header's height and
in-page navigation lands underneath it on all five sections, with no test, no
type and no build step that fails.

Each call site also threaded the same outline section **twice** — once into
`AnimatedSection` for the id, once into `SectionHeading` for the heading. One
thing was being passed as two.

## Decision

A **Page Section** component, `components/page-section.tsx`, owns the frame
every anchored section shares. It takes a Page Outline section and children,
and renders the animated wrapper carrying the anchor id, the scroll offset, and
the heading, with the children as the section's body. A call site names its
section once and supplies only its body.

It is called `PageSection`, not `Section`, because `section` is the Page
Outline's lookup export and is already imported by every one of these call
sites.

Supporting decisions:

- **The header height becomes a custom property.** `--header-height: 5rem` is
  declared once, alongside the other `:root` custom properties in
  `app/globals.css`. The header reads it as `h-[var(--header-height)]` and the
  frame as `scroll-mt-[var(--header-height)]`. The agreement that used to be
  invisible is now a single declaration with two readers, so the header's
  height cannot change without the scroll offset following it. Neither side
  restates `20` or `5rem`.

- **`SectionHeading` is folded in and its file deleted.** Once the frame always
  renders the heading, a separate component had exactly one caller and stopped
  earning its own file. The heading class string still exists exactly once —
  now inside `PageSection`. This is the part of ADR-0004 that is superseded;
  what ADR-0004 actually protected, that no call site can title a section with
  text the outline does not know about, is unchanged, because `PageSection`
  takes an `OutlineSection` for exactly the reason `SectionHeading` did.

- **`AnimatedSection` is not touched.** ADR-0002 refused to push a domain type
  into that primitive and ADR-0004 reaffirmed it; that still holds.
  `PageSection` *wraps* `AnimatedSection`. Hero keeps using `AnimatedSection`
  directly, with no anchor id and a different className, and is unaffected — it
  has no heading, is not in the Page Outline, and does not gain a frame.

- **The page composition stays hand-written.** Making it data-driven was
  rejected in ADR-0002 and reaffirmed in ADR-0004. `app/page.tsx` still
  composes five sections by hand and is untouched by this change.

- **The frame is not unit tested.** The repo has no DOM test environment, and
  ADR-0003 judged adding one disproportionate for presentational components.
  That judgement is unchanged; the build-output diff stands in for it.

- **The header's redundant `sm:h-20` is dropped.** It restated the base `h-20`
  at a breakpoint and always had.

## Consequences

- Changing the header's height is one edit, and the scroll offset follows. The
  agreement between the two is written down instead of remembered.
- Restyling a section's frame or its heading is a one-line change in one file.
- Adding a sixth section is `<PageSection section={section.x}>` plus a body; it
  cannot be given an anchor, an offset or a heading that disagrees with the
  outline, because it is given the outline record itself.
- `AnimatedSection` now has exactly two importers: `PageSection` and Hero. The
  primitive stayed generic and grew one domain-aware wrapper rather than a
  domain-aware branch inside it.
- Verified behaviour-neutral against a build of the previous commit. The
  prerendered markup differs in exactly six class attributes — the header's
  height and the five sections' scroll offsets — and nowhere else. The
  hydration payload was reassembled from its `__next_f.push` chunks and every
  row reference inlined, because the serializer moved a heading into its own
  row and renumbered the rows around it; the fully resolved trees are identical
  apart from those same class strings and the per-build id. `scroll-mt-20`
  emitted `scroll-margin-top:calc(var(--spacing)*20)` and `--spacing` is
  `0.25rem`, so both forms compute to the same `5rem`, confirmed as `80px` on
  all five sections in a real build.
- The contact form's webpack module id shifted, as ADR-0005's issue (#8) warned
  it would when its imports change. It was checked to still resolve to
  `components/contact-form.tsx` with the same chunks and the same `default`
  export, and the form was confirmed interactive in a production build:
  client-side validation rejected a short message in the browser with no
  network request, so the client boundary is intact.
