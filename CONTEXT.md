# Context

Domain glossary for the personal portfolio site. Terms defined here are the
vocabulary to use in code, issues, and reviews — don't drift to synonyms.

## Glossary

### Contact Message

A submission from the contact form: a **name**, an **email** address to reply
to, and a **message** body. A Contact Message is only a Contact Message once it
has been parsed and found valid — raw form input or a raw request body is not
one yet, and the type reflects that.

Validity is defined in exactly one place, `lib/contact-message.ts`, and the same
definition runs in the browser before submitting and on the server on arrival.
Rules: all three fields required after trimming; name 1–100 characters with no
control characters (it reaches the email Subject header); email plausible and at
most 254 characters; message 10–2000 characters.

A Contact Message that is sent becomes one plain-text email, addressed **from**
the deployment's own account and **reply-to** the visitor. The two are
deliberately different: `From` stays the authenticated sender because putting
the visitor there forges the domain and fails alignment at the receiving end,
while `Reply-To` is the field a mail client acts on, so answering an enquiry is
a click rather than copying an address out of the body.

Submitting a Contact Message has four outcomes, and they are kept distinct
because callers word them differently: **sent**, **invalid** (carries per-field
errors the form shows against the fields), **challenge-failed** (the Challenge
did not pass — nothing the visitor wrote was wrong, so nothing is shown against
a field), and **send-failed** (the mail transport rejected it — the underlying
cause is logged on the server and never returned to the browser).

Those four are what the server reports. A browser can also end up with **no
answer** — the request never got one, or what came back could not be decoded —
and that is not a fifth outcome either: nobody, the site included, knows
whether the message was sent, and the visitor is told that rather than told it
failed. The shape the browser and the server exchange, and the reading of it,
are defined in exactly one place, `lib/contact-wire.ts`, so neither side infers
an outcome from a status code or from which fields happen to be present.

Related: [ADR-0001](docs/adr/0001-contact-message-intake-is-one-module.md),
[ADR-0007](docs/adr/0007-the-contact-wire-is-one-shape-read-by-kind.md),
[ADR-0008](docs/adr/0008-bot-submissions-are-refused-at-the-form.md).

### Challenge

Proof that a human is submitting the form — a Cloudflare Turnstile widget in the
contact form, and the single-use token it produces.

A Challenge is **passed or it is not**, and only Cloudflare can say which. The
token travels beside a Contact Message rather than inside one: it is proof about
the sender, not one of the three fields a visitor wrote. `lib/turnstile.ts`
verifies it, injected into `submitContactMessage` the way the mail transport is,
so the secret and the network call never reach the browser bundle.

A token is **spent** by the attempt that puts it to Cloudflare, and no attempt is
made without an unspent one — the form waits for the widget rather than sending
an empty token and calling the result a failed Challenge. An outcome decided
before verification runs, such as a field the server rejected, spends nothing.

A Contact Message whose Challenge did not pass is **refused and not sent** —
not marked, not filed, not logged. That is the point: a submission nobody can
show a human made never becomes an email at all.

**It fails closed.** If Cloudflare is unreachable the Challenge fails, because
letting submissions through while the verifier is down opens the door at exactly
the moment someone would walk through it. The visitor is told to try again, and
given an email address instead.

A **failed Challenge is not an invalid Contact Message.** Nothing the visitor
typed was wrong, so nothing is shown against a field, and it crosses the wire as
its own kind at 403.

The cost is real and is accepted: a person with a script blocker, a privacy
browser, or an expired token is refused the same way a bot is, sees only a
message, and may simply leave. Nothing measures how often that happens — see
[ADR-0008](docs/adr/0008-bot-submissions-are-refused-at-the-form.md).

Related: [ADR-0008](docs/adr/0008-bot-submissions-are-refused-at-the-form.md),
[Operating the contact pipeline](docs/operations/contact-pipeline.md).

### Site Identity

Who the site says it is: the **name**, the **role**, the **location**, the
**portrait**, the **description** a search result shows, the **canonical URL**
the site is served from, and the **contact address** it gives out.

It is one concept rather than six strings because they are read by surfaces a
visitor never sees at the same time — the page itself, the browser tab, a
search result, the card a shared link unfurls into, and the structured data a
crawler reads. Nothing renders those last four beside the page, so a name or a
role changed in one place and not the others goes on being wrong indefinitely,
and looks perfectly correct to whoever changed it.

Defined in exactly one place, `lib/site-identity.ts`, and everything else
derives from it: the hero a visitor reads, the page metadata, the generated
social card, `robots.txt`, `sitemap.xml`, and the `Person` structured data. The
role is written once and the site cannot disagree with itself about it.

The **contact address** is `contact@mikepeerawit.com`, and it is one address
rather than a preferred one. Three surfaces give it out — the hero's Contact
button and the two messages the contact form shows a visitor whose Challenge
was refused or never loaded — and the second pair is the way out
[ADR-0008](docs/adr/0008-bot-submissions-are-refused-at-the-form.md) promises a
person the Challenge cannot serve. A visitor who reaches one of those messages
has already had something go wrong; being handed an address the site does not
otherwise use is not a second thing that may go wrong for them.

The **canonical URL** is the apex, `https://mikepeerawit.com` — production
serves no `www` host, so this is the site's one address rather than one
spelling of two.

Related: [ADR-0009](docs/adr/0009-the-sites-identity-is-one-module.md),
[ADR-0002](docs/adr/0002-the-page-outline-owns-section-ids.md),
[ADR-0008](docs/adr/0008-bot-submissions-are-refused-at-the-form.md).

### Page Outline

The ordered list of sections the single-page site is made of. Each entry is one
**section**: an **id** (the anchor on the page), a **label** (what the nav calls
it), a **heading** (what the visitor reads at the top of the section), and an
**href** derived from the id. The five sections are About, Work Experience,
Projects, Education, and Contact.

A section's heading and its nav label are allowed to differ, and the outline is
where that divergence is declared: the heading defaults to the label, and only
Work Experience overrides it — the nav says "Experience" where the heading says
"Work Experience". The default is not duplication to be simplified away; it is
what lets the one real divergence stand out.

The outline is defined in exactly one place, `lib/page-outline.ts`, and the
navigation, the sections themselves, and their headings all read from it — a
section's id, name, or heading is never written out by hand a second time.
Renaming a section there changes its nav label, its anchor, and its visible
heading together. Hero is not part of the outline: it has no anchor, no
heading, and the nav does not link to it.

Every section in the outline is rendered inside a Page Section.

Related: [ADR-0002](docs/adr/0002-the-page-outline-owns-section-ids.md),
[ADR-0004](docs/adr/0004-the-page-outline-owns-section-headings.md).

### Page Section

The frame every section in the Page Outline shares, and the one place its
markup exists: `components/page-section.tsx`. Given an outline section and a
body, it renders the animated wrapper carrying the anchor **id**, the **scroll
offset** that keeps the sticky header from covering the section just navigated
to, and the section's **heading**. A call site names its section once and
writes no heading, no anchor, and no offset of its own.

It takes the outline section itself rather than an id and a title, so a section
cannot be anchored or titled with something the outline does not know about.

The scroll offset and the header's own height are the same number and have to
stay that way, or in-page navigation lands underneath the header. They are not
two numbers kept in step by hand: both read `--header-height`, declared once
with the other `:root` custom properties. That agreement used to be invisible,
which is the defect this frame exists to close.

Hero is the one section rendered outside a Page Section — it is not in the
outline, so it has no heading and nothing to frame. It uses the animation
wrapper directly, which stays a generic primitive that knows nothing about the
outline.

Related: [ADR-0006](docs/adr/0006-one-component-owns-a-sections-frame.md),
[ADR-0002](docs/adr/0002-the-page-outline-owns-section-ids.md).

### Timeline Item

An entry with a title, subtitle, date, and description, optionally linked and
tagged. Both work experience and education are Timeline Items; projects are not
(they carry a year rather than a date range, and their own links).

One type, `TimelineItem` in `data/types.ts`, describes all of them. Work
experience and education are not separate types — they are the same shape with
different data, and the only field either one uses exclusively today (tags) is
optional on the shared type rather than bolted onto a subtype.

### Timeline Section

A section of the page that is a heading over a list of Timeline Items. There
are two — Work Experience and Education — and both are rendered by the same
component, `components/timeline-section.tsx`, from a Page Outline section plus
its items. It takes no heading: the heading comes from the outline section it
is given, so a call site cannot title a section with something the outline does
not say. Projects looks similar on screen but is not a Timeline Section,
because a Project is not a Timeline Item.

Like every other anchored section, a Timeline Section renders inside a Page
Section — it supplies its list of Timeline Items as the body and does not write
its own heading, anchor, or scroll offset.

Related: [ADR-0003](docs/adr/0003-one-timeline-section-for-experience-and-education.md),
[ADR-0004](docs/adr/0004-the-page-outline-owns-section-headings.md),
[ADR-0006](docs/adr/0006-one-component-owns-a-sections-frame.md).
