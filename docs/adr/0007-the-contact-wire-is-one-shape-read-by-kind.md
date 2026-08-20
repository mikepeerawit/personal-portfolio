# ADR-0007: The contact wire is one shape, read by kind

- **Status:** Accepted
- **Date:** 2026-08-20
- **Extends:** [ADR-0001](0001-contact-message-intake-is-one-module.md). Its
  decision — one Contact Message module behind an injected send seam — is
  unchanged. This ADR is about the step ADR-0001 left as "a thin adapter
  mapping the result to 200 / 400 / 500", and about what the browser did with
  those codes at the other end.

## Context

ADR-0001 gave submitting a Contact Message three outcomes and one type,
`SubmitResult`. That type stopped at the edge of the process. Crossing to the
browser, the same three outcomes were spelled out twice more — once as the
JSON the route wrote, once as the conditions the form tested — and neither
copy was typed.

The route wrote three differently-shaped bodies:

```ts
return NextResponse.json({ success: true });
return NextResponse.json({ error: "Please check the form and try again.", fieldErrors: result.fieldErrors }, { status: 400 });
return NextResponse.json({ error: SEND_FAILED_MESSAGE }, { status: 500 });
```

and the form worked backwards from them:

```ts
if (response.ok) { /* sent */ }
if (data?.fieldErrors && Object.keys(data.fieldErrors).length > 0) { /* invalid */ }
setSubmitStatus({ type: "error", message: data?.error ?? "An unexpected error occurred." });
```

Nothing in that exchange stated an outcome. The browser inferred one from a
status code plus which fields happened to be present, which produced four
distinct defects:

- **The form rendered server-authored copy.** `data?.error` put the browser's
  visible text in the route's hands, in a file that also handles bots and
  direct callers. Two of the three strings a visitor could read were written on
  the wrong side of the boundary.
- **An undecodable answer was reported as unreachability.** `response.json()`
  on a platform error page throws, and the surrounding `catch` said "Couldn't
  reach the server." A 502 is a server that *was* reached. The visitor was told
  a specific thing that was false, when the true thing — nobody knows whether
  the message was sent — is what they needed to decide whether to send it
  again.
- **An unrecognised body fell through to a guess.** Any answer that was neither
  `ok` nor carrying field errors became `data?.error ?? "An unexpected error
  occurred."` — a message with no relationship to what happened.
- **Adding an outcome broke nothing loudly.** A fourth `SubmitResult` kind
  would compile, serialise into a body the form did not recognise, and surface
  as the generic error above. Nothing failed at build time on either side.

## Decision

A **contact wire** module, `lib/contact-wire.ts`, is the one place the shape
exchanged between `app/api/contact/route.ts` and `components/contact-form.tsx`
is written down. The route encodes a `SubmitResult` with `toResponse`; the form
decodes what comes back with `fromResponse`.

Every body carries a **`kind`**, and `kind` is the only thing the browser reads.
An answer that cannot be decoded — not JSON, an unrecognised `kind`, field
errors that cannot be rendered — becomes **`no-answer`**, which is not an
outcome of submitting: it says nobody, the site included, knows whether the
Contact Message was sent, and the visitor is told exactly that.

Supporting decisions:

- **The module is transport-free.** Nothing in it fetches. The form owns the
  request; the wire owns the shape. That is what lets one module be imported
  from both runtimes, and lets every case be tested with no transport at all —
  the tests round-trip through a real `Response`, because serialisation is the
  step where a shape held by hand on both sides used to drift.

- **The form owns every status string it shows.** Field errors are the one
  exception, deliberately: they are authored in `lib/contact-message.ts`, which
  both sides run, so a field is worded identically whichever side rejected it.
  Nothing else the visitor reads is written by the server any more.

- **`cause` has no representation on the wire.** ADR-0001 kept SMTP text out of
  the browser by remembering not to send it. Now the encoder has no way to
  carry it: `toResponse` drops it, and the route logs it just before. A test
  asserts the cause is absent from the serialised bytes, not merely from the
  decoded report.

- **A malformed request body gets a kind too.** `MALFORMED_REQUEST` is a fixed
  constant rather than a `toResponse` case, because no `SubmitResult` describes
  it — nothing was ever parsed into a Contact Message. It travels in the same
  envelope as everything else so the decoder has one shape to handle rather
  than a bespoke second one. Only direct callers and bots reach it; the form
  always sends JSON.

- **Field errors are validated against the fields that exist.**
  `RENDERABLE_FIELDS` is typed `Record<keyof ContactMessage, true>`, so adding a
  field to a Contact Message is a compile error here rather than a field error
  the form silently declines to render. An error naming a field that is not one
  degrades to `no-answer`.

- **An empty `fieldErrors` map is not a usable `invalid`.** `{}` passes a
  per-entry check vacuously; decoded as `invalid` it would clear the errors,
  show no status, and leave the visitor looking at a form that did nothing.
  Every other unusable body degrades to `no-answer`, so this one does too. It
  is the single case where the guard is about the visitor rather than the type.

- **Every report is rebuilt, never passed through.** `fromResponse` constructs
  the value it returns field by field, so nothing a hostile or newer server put
  in the body travels on into the form's state.

- **Status codes stay meaningful, and stay unread.** 200 / 400 / 500 are still
  what curl, the platform logs and monitoring see. The browser does not consult
  them — a test asserts a `kind: "sent"` body sent with status 500 still decodes
  as sent — because reasoning from the code plus a field's presence is the
  drift this module exists to remove.

- **No schema library.** ADR-0001 declined one for validation, on the grounds
  that shared code ships to the browser. The same reasoning applies here and
  the decoding is smaller than the validation it sits next to.

## Consequences

- Adding an outcome is a compile error at both ends before it is anything else.
  `toResponse` and the form's `switch` both end in `satisfies never`, so a new
  `SubmitResult` kind fails the build rather than reaching a visitor as a
  generic error — and rather than being logged nowhere, since the route only
  logs the send-failed case.
- The visitor is never told the message failed when the truth is that nobody
  knows. "Couldn't confirm your message was sent" is a different instruction
  from "something went wrong": it tells them to check, or use the email address
  directly, rather than to assume.
- The route is a smaller adapter than ADR-0001 left it: it logs the cause and
  hands the result over. It no longer authors any text the browser displays.
- Status codes can be changed for the benefit of monitoring without changing
  what any visitor sees.
- The exchange is covered by tests that run in CI on every pull request
  ([ADR-0001](0001-contact-message-intake-is-one-module.md)'s send seam made
  the module testable; `lib/contact-wire.test.ts` covers the seam beyond it).
  Each case round-trips through a real `Response`, including `JSON.stringify`
  and `response.json()`.
