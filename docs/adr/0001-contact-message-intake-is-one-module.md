# ADR-0001: Contact Message intake is one module behind an injected send seam

- **Status:** Accepted; the rate limiting revisit below is answered by
  [ADR-0005](0005-contact-form-spam-is-classified-not-throttled.md)
- **Date:** 2026-08-10

## Context

Contact form submission was split across three shallow modules, divided by
transport rather than by concept:

- `components/contact-form.tsx` — form state, `fetch`, error text
- `app/api/contact/route.ts` — a try/catch that concatenated error strings
- `lib/email.ts` — env reading, transport construction, templating, and send

No module owned what a valid Contact Message was, so the defects lived in the
gaps between them rather than inside any one of them:

- the route destructured unvalidated JSON, so a missing `message` threw inside
  the mailer and surfaced as a 500
- raw server error text — including SMTP failures — was returned to the browser
- name, email, and message were interpolated into an HTML email body unescaped
- `sendContactEmail` built its transporter from `process.env` at call time, so
  nothing could be tested without environment and network
- every submission logged the submitter's name and email

## Decision

One **Contact Message** module, `lib/contact-message.ts`, owns parsing,
validation, and rendering, and exposes:

- `parseContactMessage(raw): ParseResult`
- `submitContactMessage(raw, send): SubmitResult`

The module imports nothing node-only and nothing DOM-only, so the contact form
and the API route import the same validation. The mail transport arrives as the
`send` argument.

Supporting decisions:

- **Email is text-only.** Deleting the HTML body removes the injection risk
  rather than defending against it; nobody needs a styled contact notification.
- **Validation is hand-rolled.** Shared code ships to the browser, and a schema
  library is ~13 kB gzipped for a single schema that will not change.
- **Config is read once at module load** in `lib/mailer.ts`, so a misconfigured
  deployment fails at startup rather than on someone's first real submission.
- **Three-armed result.** Send failure is an expected outcome of talking to
  SMTP, not an exception, and it is the outcome the form words differently.
- **Logging.** Successful and invalid submissions are not logged at all; only
  send failures are, with the cause that no longer reaches the browser.

Tests drive the module through its interface with a recording fake at the send
seam — no environment, no network.

## Consequences

- Validity is defined once; the form stops fetching only to be told what it
  already knew, and shows per-field errors instead of one status string.
- `lib/email.ts` is deleted; the route becomes a thin adapter mapping the
  result to 200 / 400 / 500.
- Config errors now fail loudly at process start. If a deployment builds
  without `EMAIL_USER` and `EMAIL_PASSWORD` present, the build fails rather
  than shipping a broken endpoint — deliberate, but it means those variables
  must exist in the build environment.

## Considered and declined: rate limiting

The endpoint is unauthenticated and sends mail on demand, so throttling was
considered. Declined for now: doing it properly on serverless needs shared
state, which is disproportionate for a personal portfolio. The required fields
and the 10-character message floor are the only friction. Revisit if spam
actually arrives — this is not an oversight, and future reviews should not
re-raise it without new evidence.

**Answered by [ADR-0005](0005-contact-form-spam-is-classified-not-throttled.md).**
Spam arrived; the evidence showed it arrives days apart rather than in bursts,
so rate limiting was declined a second time and the answer was content
classification.
