# ADR-0008: Bot submissions are refused at the form, not sorted afterwards

- **Status:** Accepted; supersedes
  [ADR-0005](0005-contact-form-spam-is-classified-not-throttled.md), which is
  reverted in full by the same change
- **Date:** 2026-08-21
- **Depends on:** a Cloudflare Turnstile site and secret key, recorded in
  [Operating the contact pipeline](../operations/contact-pipeline.md)

## Context

ADR-0005 accepted that unwanted submissions would arrive and chose to sort them
on arrival: gibberish rejected as invalid, solicitations delivered with a
`[Solicitation] ` subject prefix for a mailbox rule to file away. It declined
every challenge-based countermeasure, CAPTCHA among them, on the grounds that
no genuine visitor should have to prove anything to send a short message.

That reasoning is intact and is not disputed here. What changed is the goal it
was serving. ADR-0005 optimised for *never losing a genuine enquiry*, and
treated the volume of unwanted mail as a cost worth paying to protect that. The
owner's decision is that the unwanted submissions should not reach the mailbox
at all — that sorting mail which should never have been sent is the wrong shape
of solution, whatever it costs to stop it.

This ADR records that decision and what it trades away. It does not re-argue
ADR-0005's evidence, which was never wrong on its own terms.

## Decision

**A Contact Message is not accepted without a passed Challenge.** The contact
form renders a Cloudflare Turnstile widget; the token it produces travels
beside the Contact Message, and `submitContactMessage` refuses anything whose
token Cloudflare will not confirm. Nothing is emailed, marked, or logged.

The verdict arrives through an injected `verify` seam, the way the mail
transport arrives through `send` — the pattern ADR-0001 established and
ADR-0005 reused for classification. That keeps the secret and the network call
out of the browser bundle by the import graph, keeps the route a thin adapter,
and keeps every test free of network. The seam ADR-0005 built for `classify` is
not extended; it is removed and replaced.

**A failed Challenge is a fourth outcome, not an invalid message.** It crosses
the wire as its own kind at 403, because nothing the visitor typed was wrong,
and the form words it accordingly. The `satisfies never` guards in
`lib/contact-wire.ts` and the form make that a compile error to ignore.

**Validation still runs first.** It is local and free; verifying is a round
trip that spends a single-use token. A visitor who mistyped an address sees
that against the field without waiting on Cloudflare.

**The verifier fails closed.** If Cloudflare is unreachable, the Challenge
fails and the visitor is told to try again. Letting submissions through while
the verifier is down would open the door at precisely the moment someone would
walk through it.

### What this reverts

ADR-0005 is reverted in full, not partly:

- `lib/solicitation.ts` and its scoring rules are deleted.
- The `[Solicitation] ` subject prefix is gone. Subjects are byte-for-byte what
  they were before ADR-0005, and the mailbox filter that routed marked mail has
  nothing left to match.
- The Gibberish Submission rule is gone, and with it the ASCII script guard
  that stopped it rejecting Thai, Chinese and Japanese enquiries. That guard
  existed only to protect against a rule that no longer exists.

The gibberish rule was, on the corpus ADR-0005 recorded, stopping roughly half
of all unwanted submissions before they became email. It is removed because a
Challenge is meant to refuse those submissions earlier and without judging
their contents — but between the two, the thing that was working is gone.

## Considered and declined

**Keeping the gibberish rule alongside the Challenge.** Cheap, already written,
and it would have covered the case where the widget fails to load. Declined
because it makes the pipeline judge message contents again, which is the shape
of solution this ADR exists to replace, and because a submission that passed a
Challenge is by hypothesis not a bot — rejecting a human's message for looking
like nonsense is a worse error than receiving it.

**Keeping the Solicitation marking as a second layer.** Same reason, plus it
would leave a mailbox filter, an ADR, and a corpus to maintain for messages the
Challenge is supposed to have stopped.

**A honeypot field**, still declined for ADR-0005's reason: anything POSTing
directly at the API sends the three real fields and an empty honeypot cleanly.

**reCAPTCHA.** A Google account tied to the site, a heavier privacy surface,
and an interaction most visitors recognise as a chore. Turnstile is free at
this volume, usually invisible, and does not require a privacy-policy change.

## Consequences

- Unwanted submissions stop at the form rather than arriving sorted. The
  mailbox stops being the place spam is dealt with.
- **A real visitor can now be refused, and it is invisible when it happens.**
  Someone with a privacy browser, an aggressive script blocker, assistive
  technology the widget interacts badly with, or a token that expired while
  they wrote a long message, sees a refusal and may simply leave. This is the
  cost ADR-0005 declined to pay, and it is now being paid deliberately. The
  refusal message names an email address for exactly that reason.
- **There is no way to measure that cost.** At roughly one genuine enquiry a
  year, a silent refusal and a quiet month look identical. Nothing in this
  design will ever tell you it went wrong.
- A vendor is now in the submission path. If Cloudflare is down, the contact
  form is closed.
- A script tag from a third party now loads on the site.
- Two new environment variables, one of them public.
- The 46-message corpus and its analysis remain in ADR-0005 as history.

### The condition for revisiting

**A genuine visitor reporting they could not send.** One is enough. That is
the same signal ADR-0005 named, pointed at the opposite failure: there, mail
was arriving that should not have; here, people may be turned away who should
not be. If it happens, the Challenge is the first suspect, not the last.

Fewer unwanted submissions is not evidence that this is working, since a
Challenge that refused every visitor would produce the same number.
