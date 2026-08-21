# Operating the contact pipeline

What the contact form needs from its environment and from the mailbox, and how
to check that each is actually in place.

This is a runbook. Every "why" is a link — the reasoning lives in the ADRs and
is not repeated here.

## Mail configuration

Three environment variables, read once when the mailer module loads:

| Variable | Required | Purpose |
| --- | --- | --- |
| `EMAIL_USER` | Yes | The account contact mail is sent *from*. |
| `EMAIL_PASSWORD` | Yes | That account's password. |
| `EMAIL_RECIPIENT` | No | Where contact mail is delivered. Falls back to `EMAIL_USER`. |

**A build without the two required variables fails, and that is the designed
behaviour** — see
[ADR-0001](../adr/0001-contact-message-intake-is-one-module.md). If a build
fails this way, supply the variables; do not make the check lazy.

Both required variables must therefore exist in the *build* environment, not
only at runtime.

## The Solicitation mailbox filter

The contact form marks a Solicitation by prefixing `[Solicitation] ` to the
email subject. **The code does the marking and nothing else.** Routing marked
mail out of the inbox is a mailbox setting, and until someone creates it every
marked Solicitation lands in the inbox looking like a genuine enquiry.

Required filter:

- **Condition:** subject contains `[Solicitation]`
- **Action:** move to a folder

**Move, never delete.** A mis-marked genuine message has to stay recoverable —
see [ADR-0005](../adr/0005-contact-form-spam-is-classified-not-throttled.md).

An ordinary message's subject is byte-for-byte what it has always been, so
existing mailbox rules matching the old text keep working, including on marked
messages.

### Checking whether it is in place

Search the mailbox for `subject:"[Solicitation]"`. If matches are sitting in
the inbox rather than in a folder, the filter does not exist or is not
matching, and the pipeline is only half deployed.

### Proving it works, without waiting for spam

The check above only says something once a Solicitation has actually arrived,
and at the rate below a quiet folder is the *expected* state whether the
pipeline works or not. Twice that silence has been read as failure — nine days
after the classifier shipped, and two days after this filter was created.

To prove the pipeline end to end in a minute, submit this through the live
contact form, from any address:

> Our system drives targeted traffic to your website within 24 hours of setup.
> You pick the keywords, we do the rest.

It scores exactly at the threshold on content alone — one capped topical
signal and two pitch phrases — and contributes nothing from the sender's
domain, so it marks from any address you can send from. A real Solicitation of
this shape arrived on 2026-08-18 and was marked correctly.

Then find where it landed:

| Where it lands | What that means | What to do |
| --- | --- | --- |
| The Solicitation folder | Classifier, mark and filter all work | Nothing |
| Inbox, subject starts `[Solicitation]` | The code marked it; the filter is not matching | Fix the filter condition |
| Inbox, no prefix | The classifier is not marking | Check the production deployment is current |

Worth running after changing the filter, and after any change to
`lib/solicitation.ts` — see
[ADR-0005](../adr/0005-contact-form-spam-is-classified-not-throttled.md) for
why the threshold is where it is.

### The scale to expect

Roughly one and a half Solicitations a month — about 18 of the 46 messages
received between August 2025 and August 2026. The corpus behind that figure is
in [ADR-0005](../adr/0005-contact-form-spam-is-classified-not-throttled.md).

## The monthly maintenance loop

About once a month:

1. Search `subject:"Portfolio Contact Form"`.
2. Read what got through **unmarked**.
3. Extend the classifier's signal table from what you find.

Step 3 means adding observed solicitor domains or observed sales copy — see
[ADR-0005](../adr/0005-contact-form-spam-is-classified-not-throttled.md) for
why the rules are a score rather than a blocklist.

Two constraints on step 3:

- The **topical** score is capped on purpose. Do not uncap it — see ADR-0005.
- Signals come from evidence in the mailbox, not from intuition about what a
  Solicitation might look like.

## Countermeasures already declined

Each of these was considered and declined with reasons in
[ADR-0005](../adr/0005-contact-form-spam-is-classified-not-throttled.md).
Listed by name only, so the list is reachable without reading the ADR:

- Rate limiting (declined twice — also in
  [ADR-0001](../adr/0001-contact-message-intake-is-one-module.md))
- A hard domain blocklist
- A honeypot field
- CAPTCHA, Turnstile, reCAPTCHA, Akismet, or any third-party classifier
- Rejecting Solicitations outright, and any quarantine or review UI

**When to reopen any of them:** a *missed genuine enquiry* is new evidence.
More Solicitations are not.

## Related

- [ADR-0001](../adr/0001-contact-message-intake-is-one-module.md) — Contact
  Message intake is one module behind an injected send seam
- [ADR-0005](../adr/0005-contact-form-spam-is-classified-not-throttled.md) —
  contact form spam is classified, not throttled
- [CONTEXT.md](../../CONTEXT.md) — the terms used here: Contact Message,
  Gibberish Submission, Solicitation
