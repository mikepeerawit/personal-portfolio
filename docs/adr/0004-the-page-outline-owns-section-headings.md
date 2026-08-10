# ADR-0004: The Page Outline owns section headings

- **Status:** Accepted
- **Date:** 2026-08-10
- **Supersedes:** the "heading is a prop, not an outline field" decision in
  [ADR-0003](0003-one-timeline-section-for-experience-and-education.md)

## Context

ADR-0002 introduced the Page Outline so that a section's identity lived in one
record instead of three strings that had to agree by hand. It owned the anchor
id, the nav href, and the nav label.

It did not own the one string a visitor actually reads: the heading at the top
of the section. About, Projects and Contact wrote their heading inline, and the
two Timeline Sections took theirs as a prop from `app/page.tsx`. So renaming a
section in the outline updated its nav label and its anchor and silently left
the visible heading behind. Nothing failed — the nav still worked and the
anchor still resolved; the page just read inconsistently until someone noticed.

The same four places each repeated the identical heading class string, so
restyling headings was a four-file edit with four chances to miss one.

ADR-0003 named this exact gap and left it open on purpose. It decided the
heading should stay a prop *because* doing it properly meant About, Projects
and Contact had to read their headings from the outline too — "a reasonable
follow-up, not part of this". This is that follow-up, so the condition ADR-0003
named for revisiting is now being met deliberately rather than drifted into.

## Decision

The Page Outline's section record gains a **heading**, alongside its id, label
and href. Every section — About, Work Experience, Projects, Education, Contact
— reads its heading from the outline.

The heading is **required on the exported record and optional in the authored
list**: the internal `ORDER` accepts an optional heading and the derivation
step resolves it to the label when none is given. Four of the five sections are
headed by the same word the nav uses, so the common case stays silent; Work
Experience is the sole override, keeping the compact "Experience" in the nav and
the fuller "Work Experience" as its heading. Resolution happens in the
derivation step, following the precedent ADR-0002 set for hrefs — never at a
call site.

A **Section Heading** component, `components/section-heading.tsx`, owns the
markup. It takes an `OutlineSection` rather than a bare string, so a call site
cannot render heading text the outline does not know about, and the heading
class string now exists exactly once.

Supporting decisions:

- **Timeline Section loses its heading prop.** It already received the outline
  section; it reads the heading from there. Its interface narrows from three
  inputs to two, and its two call sites can no longer pass a heading that
  contradicts the outline.
- **The page composition stops naming sections.** `app/page.tsx` passes only an
  outline section and items. "Experience is a timeline of these items headed
  Work Experience" — which ADR-0003 moved *into* the page composition — moves
  back out into the outline, which is where the rest of the section's identity
  already lived.
- **`AnimatedSection` stays generic.** ADR-0002 refused to push a domain type
  into that primitive and that still holds: the heading component is separate
  from the animation wrapper. Hero has no heading and no anchor, is not in the
  outline, and is unaffected.
- **The heading component is not unit tested.** The repo has no DOM test
  environment, and ADR-0003 judged adding one disproportionate for a
  presentational component. That judgement is unchanged; the build-output diff
  stands in for it.

ADR-0003's other decisions are untouched and are **not** reversed here:
Projects stays out of the Timeline family, `key={index}` is kept, and the
`Experience`/`Education` type fold stands.

## Consequences

- Renaming a section is one edit: the nav label, the anchor and the visible
  heading change together, and they cannot disagree.
- Adding a sixth section declares its heading in the outline or inherits its
  label — it cannot render untitled, and the type system will not let the
  section be dropped from the outline while a component still asks for it.
- Restyling headings is a one-line change in one file.
- `lib/page-outline.test.ts` grew heading invariants alongside the existing
  ones: every section has a non-empty heading, the fallback holds for the four
  that do not override, Work Experience's heading and label are both correct
  *and* assert-ably different, and the heading survives the id lookup as well
  as the ordered list. The divergence assertion is deliberate — it is the one
  case a future reader might mistake for duplication and "simplify" away.
- Verified behaviour-neutral by rebuilding and diffing the prerendered HTML
  against a build of `dev` from before the change, normalizing the build id,
  `radix-*` ids and static chunk hashes: identical. Nothing changed on screen.
