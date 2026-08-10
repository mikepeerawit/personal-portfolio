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
most 254 characters; message 10–2000 characters, and not a Gibberish
Submission.

Submitting a Contact Message has three outcomes, and they are kept distinct
because callers word them differently: **sent**, **invalid** (carries per-field
errors the form shows against the fields), and **send-failed** (the mail
transport rejected it — the underlying cause is logged on the server and never
returned to the browser). Being judged a Solicitation is not a fourth outcome.

Related: [ADR-0001](docs/adr/0001-contact-message-intake-is-one-module.md),
[ADR-0005](docs/adr/0005-contact-form-spam-is-classified-not-throttled.md).

### Gibberish Submission

A payload with no semantic content in it — a message that is one unbroken run of
ASCII letters and digits, such as `CkqxyhpzjWmVgKGekjoRJgW`. About half the spam
this form receives has that shape.

A Gibberish Submission is **invalid, not suspicious**: it is not a valid Contact
Message, and it is rejected with a per-field error exactly like a too-short
message. The rule therefore lives with the other validity rules in
`lib/contact-message.ts` and runs in the browser too, which is safe precisely
because complying with it means writing a real message.

The rule matches only ASCII, and that guard is load-bearing. Thai does not
delimit words with spaces, so a genuine Thai enquiry is also a single run of
characters with no whitespace; Chinese and Japanese are the same. Anchoring to
ASCII exempts every non-space-delimited script by construction — "the message
contains no whitespace" is the tempting simplification, and it rejects a Thai
speaker for writing Thai. Only the message is checked; single-token names are
legitimate.

This is a different problem from a Solicitation, which is well-formed and judged
on intent. "Spam" is not a term here — it covers both and hides that they share
nothing but a cause.

Related: [ADR-0005](docs/adr/0005-contact-form-spam-is-classified-not-throttled.md).

### Solicitation

A coherent, templated Contact Message selling something — the SEO pitches that
arrive from throwaway domains under fabricated names. Unlike a Gibberish
Submission it is perfectly well-formed; what is wrong with it is its intent.

A Solicitation is **delivered, but marked**: it sends, with `[Solicitation] `
prefixed to the email subject ahead of the existing text, so one mailbox filter
routes it out of the inbox without ever discarding it. An ordinary message's
subject is byte-for-byte unchanged. The mark is the only record — nothing about
classification is logged, and the visitor is never told.

The verdict comes from `lib/solicitation.ts` and is injected into
`submitContactMessage` the way the mail transport is, so no scoring rule and no
keyword list reaches the browser bundle. Scoring is additive with a threshold —
sender domain, sales phrases, a link in the body — never a blocklist, because
the operators register new domains and a blocklist fails silently when they do.

**The premise behind the tuning: losing one real enquiry costs more than
receiving fifty solicitations.** Marking beats rejecting wherever the judgement
is about intent rather than well-formedness, because a mis-marked real message
is recoverable from a folder and a rejected one is gone. The threshold needs
more than one signal, so an ambiguous message reaches the inbox unmarked. That
permissiveness is the decision, not a rough edge to tighten up.

Related: [ADR-0005](docs/adr/0005-contact-form-spam-is-classified-not-throttled.md).

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
