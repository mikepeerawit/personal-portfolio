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

Submitting a Contact Message has three outcomes, and they are kept distinct
because callers word them differently: **sent**, **invalid** (carries per-field
errors the form shows against the fields), and **send-failed** (the mail
transport rejected it — the underlying cause is logged on the server and never
returned to the browser).

Related: [ADR-0001](docs/adr/0001-contact-message-intake-is-one-module.md).

### Page Outline

The ordered list of sections the single-page site is made of. Each entry is one
**section**: an **id** (the anchor on the page), a **label** (what the nav calls
it), and an **href** derived from the id. The five sections are About, Work
Experience, Projects, Education, and Contact.

The outline is defined in exactly one place, `lib/page-outline.ts`, and both the
navigation and the sections themselves read from it — a section's id is never
written out by hand a second time. Hero is not part of the outline: it has no
anchor and the nav does not link to it.

Related: [ADR-0002](docs/adr/0002-the-page-outline-owns-section-ids.md).

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
its items. Projects looks similar on screen but is not a Timeline Section,
because a Project is not a Timeline Item.

A section's on-page **heading** and its nav **label** are allowed to differ: the
nav says "Experience" where the heading says "Work Experience".

Related: [ADR-0003](docs/adr/0003-one-timeline-section-for-experience-and-education.md).
