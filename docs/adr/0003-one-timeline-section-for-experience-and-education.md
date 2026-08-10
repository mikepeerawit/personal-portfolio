# ADR-0003: One Timeline Section renders both experience and education

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

`components/sections/experience.tsx` and `components/sections/education.tsx`
were the same twenty lines with different nouns: an `AnimatedSection` with the
same `scroll-mt-20 pt-4`, an `<h2>` with the same class string, and a `.map`
over items into `<TimelineItem>`.

Each one re-listed every field of the item it rendered — `title={item.title}`,
`subtitle={item.subtitle}`, and so on. That re-listing was the actual defect,
not the line count: `education.tsx` never passed `tags`, because passing a
field was a separate edit from the field existing. Nothing failed, because no
education entry has tags yet — a latent bug waiting for the first one that
does.

The type layer had the same split. `Experience` was `TimelineItem & { tags?:
string[] }` and `Education` was a bare alias of `TimelineItem`, so adding a
field to a Timeline Item was a four-file change: type, data, section, item.

## Decision

One **Timeline Section** component, `components/timeline-section.tsx`, taking a
Page Outline section (ADR-0002), a heading, and its items. Items are spread
into `TimelineItem` — `{...item}` — so fields flow through without being named
twice.

`experience.tsx` and `education.tsx` are deleted; `app/page.tsx` renders two
`<TimelineSection>` call sites. `Experience` and `Education` are deleted from
`data/types.ts`, and `tags?: string[]` moves onto `TimelineItem` itself, which
is what `CONTEXT.md` already said a Timeline Item was.

Supporting decisions:

- **Projects stays separate.** It looks like a Timeline Section on screen, but
  a Project carries a year, a GitHub link, and a live link rather than a date
  range and one url — `CONTEXT.md` has said projects are not Timeline Items
  since ADR-0001. Generalising over both would need a render prop or a generic
  component to cover three call sites, and the shared part would be an
  `<h2>` and a `<div>`. Its hand-listed props were spread as well, which is the
  part of the fix that actually applied.
- **The heading is a prop, not an outline field.** The nav label and the
  on-page heading genuinely differ for one section ("Experience" vs "Work
  Experience"). Putting headings in the Page Outline would mean About,
  Projects, and Contact should read theirs from there too, which is a wider
  change than this one; it is a reasonable follow-up, not part of this.
- **`key={index}` is kept.** Unchanged from before; these lists are static and
  never reordered.

## Consequences

- Adding a field to a Timeline Item is now two edits (type, data) instead of
  four, and it reaches both sections automatically.
- The dropped-prop bug class is gone for timeline items and for projects.
- `components/sections/` no longer holds one file per section — Experience and
  Education live in `app/page.tsx` as call sites. That is the trade for
  deleting the duplication: the page composition is where "experience is a
  timeline of these items headed Work Experience" is now stated.
- Verified by rebuilding and diffing the prerendered HTML against the previous
  build: identical across 267 normalized lines, so this is a pure refactor.
- Still no component tests. `TimelineSection` is presentational and the repo
  has no DOM test environment (no jsdom, no testing-library); adding one for
  this component was judged disproportionate. The build-output diff is the
  check that stands in for it.
