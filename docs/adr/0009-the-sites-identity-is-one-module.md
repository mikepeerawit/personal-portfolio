# ADR-0009: The site's identity is one module, and the site describes itself with it

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

The site had almost nothing to say about itself. `app/layout.tsx` carried a
`title` of `"Peerawit Chariyawongsiri"` and a `description` of `"Full Stack
Developer"`, and that was the whole of it. There was no `metadataBase`, no
canonical URL, no Open Graph or Twitter card, no `robots.txt`, no `sitemap.xml`,
and no structured data.

Two consequences, and the second is the one that mattered:

- **A shared link showed nothing.** Pasted into LinkedIn, Slack, iMessage or
  anywhere else that unfurls a URL, the site rendered as a bare address — no
  title, no description, no image. For a portfolio, the link *is* the artefact;
  it is how the site reaches anyone at all.
- **A crawler had to guess.** No sitemap, no canonical, and a description that
  was two words. The page is one document with no inbound links, which is the
  case where telling a crawler what it is helps most.

Underneath both sat a smaller problem that any fix would have made worse. The
name and the role were already written twice — once as the metadata, once in
`components/sections/hero.tsx` — and a social card, structured data and a
sitemap would have written the site's address, name and role several times
more. Every one of those copies is invisible from the page: someone who updates
the role in the hero sees a correct page and has no way to notice that the tab,
the search result and every future share still say the old one.

## Decision

One **Site Identity** module, `lib/site-identity.ts`, owns the name, role, city
and country, canonical URL, portrait path, contact address, and the description
a search result shows. It exports the identity, a derived `siteTitle` (`name — role`), and a
derived `personSchema`.

Everything that describes the site reads from it:

- `app/layout.tsx` — `metadataBase`, title, description, canonical, author,
  Open Graph and Twitter, plus the JSON-LD `Person` in the body.
- `app/opengraph-image.tsx` — a 1200×630 card generated at build by `next/og`,
  showing the portrait, name, role, location and domain on the site's own black.
- `app/robots.ts` and `app/sitemap.ts`.
- `components/sections/hero.tsx` — the name, role, location and portrait a
  visitor reads are now the same values, not a second copy of them.
- `components/contact-form.tsx` — the address its two Challenge messages hand
  out.

Supporting decisions:

- **The contact address is `contact@mikepeerawit.com`, and there is one of
  them.** The site was giving out two: the hero's Contact button offered
  `business@`, while the contact form offered `contact@` to a visitor whose
  Challenge failed. Both worked, so nothing was broken — but the form's two
  messages are the way out
  [ADR-0008](0008-bot-submissions-are-refused-at-the-form.md) promises to a
  person the Challenge cannot serve, and its revisit condition is one of them
  reaching us through it. An address that appears only on the error path is one
  nobody would notice going stale, and the person who finds it is already
  having a bad time. `contact@` is the one that survives, since it is the one
  those messages already used.
- **The card is generated, not a PNG in `public/`.** A hand-made image is a
  copy of the name and the role in a form no one can grep, and it goes stale
  silently — which is the failure this ADR exists to close. Generating it from
  the identity means a role change updates the card by rebuilding.
- **The portrait is read off disk with `readFileSync`, and a missing one fails
  the build.** The image is generated at build time, when the site it would
  otherwise fetch from is not serving yet. Failing loudly follows the rule
  [ADR-0001](0001-contact-message-intake-is-one-module.md) set for
  configuration: a card with a hole in it is not worth shipping quietly.
- **The card uses satori's default font, not Inter.** Matching the page would
  mean shipping a font file to the build for a 1200×630 image most people see
  at thumbnail size. Not worth the dependency.
- **`og:type` is `website`, not `profile`.** `profile` is the more accurate
  term, but it is unevenly handled by the scrapers that will actually read
  this, and the page is a site rather than a profile record.
- **The sitemap lists one URL.** The five sections in the Page Outline are
  anchors on a single page, not documents. Listing them would claim five pages
  exist where there is one.
- **`sameAs` lists only GitHub.** It is the one profile this repo can
  demonstrate is the same person — the project data links to
  `github.com/mikepeerawit`. `sameAs` is how a crawler ties this site to an
  identity it already knows, so a wrong entry ties it to someone else. The list
  is short and verified rather than complete.
- **No test.** The module is constants and two derivations over them, and the
  invariant that matters — that the page and the metadata agree — is now
  structural rather than something a test could catch failing. The rendered
  output was verified against a production build instead: tags, `robots.txt`,
  `sitemap.xml`, and the generated PNG.

## Consequences

- A shared link unfurls into a card with the portrait, the name and the role.
- Changing the role is a one-line edit that moves the page, the tab, the search
  result, the card and the structured data together.
- The canonical URL is now committed to source. It is the apex,
  `https://mikepeerawit.com`; production serves no `www`. If the site ever moves
  domain, `lib/site-identity.ts` is the single edit — but it *is* a required
  edit, where before nothing named the domain at all and nothing would break.
- The card is generated at build, so it is only as current as the last deploy.
  For a site Vercel rebuilds on every merge, that is not a real lag.
- Nothing verifies the identity against the world. A stale role, a dead
  `sameAs` link, or a domain that has moved are all still silent — the module
  makes the copies agree with each other, not with the truth.
