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

### Timeline Item

An entry with a title, subtitle, date, and description, optionally linked and
tagged. Both work experience and education are Timeline Items; projects are not
(they carry a year rather than a date range, and their own links).
