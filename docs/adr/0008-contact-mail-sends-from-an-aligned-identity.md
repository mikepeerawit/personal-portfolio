# ADR-0008: Contact mail sends from an identity aligned to the site's domain

- **Status:** Accepted; the Workspace and DNS setup this depends on is a
  required step, recorded in
  [Operating the contact pipeline](../operations/contact-pipeline.md) and
  tracked as #37
- **Date:** 2026-08-21
- **Answers:** the exposure
  [ADR-0005](0005-contact-form-spam-is-classified-not-throttled.md) left
  standing at the mailbox door, by extending its marked-never-discarded
  guarantee past it
- **Reuses:** the injected send seam from
  [ADR-0001](0001-contact-message-intake-is-one-module.md), and its refusal to
  add vendors to this path

## Context

ADR-0005 guarantees that a Solicitation is marked and never discarded, because
losing one real enquiry costs more than fifty solicitations. The runbook then
recorded, honestly, where that guarantee stops:

> Everything above assumes marked mail reaches the filter. The provider's own
> spam filter runs first, and unlike this design it can discard.

Contact mail was unusually exposed to exactly that. What the domain's public
DNS said, before this decision:

| Record | `mikepeerawit.com` |
| --- | --- |
| MX | Google Workspace (`aspmx.l.google.com`) |
| SPF | `v=spf1 include:_spf.google.com -all` — a hard fail, with Zoho absent |
| DKIM | none published |
| DMARC | none published |

The mail was sent through Zoho from `EMAIL_USER`, an address on an unrelated
domain, carrying a subject about a third domain and a body written by a
stranger. Nothing about it was authenticated *as* the site. The receiving
mailbox, meanwhile, was already Google Workspace on the site's own domain — so
the sender was the only unaligned part of a pipeline that otherwise ran between
two halves of the same account.

The failure this creates is the one the whole contact pipeline is least able to
see. A genuine enquiry filed as spam is not bounced, not logged and not
retried; Gmail deletes it after thirty days, and it looks exactly like nobody
wrote in. The classifier's marked/unmarked distinction cannot detect it either,
since the end-to-end probe sends a deliberately-marked message and a genuine
one is judged differently.

Nothing observed has actually been binned. The hazard was recorded as real but
theoretical, and left open on the grounds that one more always-on rule was not
obviously worth having. That reasoning was about the *mitigation* — a "never
send to spam" filter, which exempts the mail from judgement without changing
what it looks like. It was never an argument against fixing the cause.

## Decision

**The mail sends from the mailbox it is delivered to.** `EMAIL_USER` becomes
an account on `mikepeerawit.com`, authenticated against Google Workspace with
an app password, and `lib/mailer.ts` uses nodemailer's `gmail` service instead
of `zoho`. Sender and recipient are then one Workspace: delivery is internal,
SPF passes on the `include:_spf.google.com` that is already published, and the
`From` domain aligns with the domain that authorised the send.

No SPF edit. The existing `-all` stays exactly as strict as it was, because the
fix moves the sender *inside* the policy rather than widening the policy to
admit an outsider.

**The submitter goes in `Reply-To`, never in `From`.** `renderContactEmail`
emits the address, so composition stays in the module ADR-0001 built for it and
`lib/mailer.ts` remains a transport. `From` is always the authenticated
account: a stranger's address there would forge the sending domain and destroy
the alignment this decision exists to obtain. `Reply-To` is unauthenticated by
design and costs nothing. The address stays in the body as well, because the
body is the record if a client strips the header and existing mailbox searches
already match on it.

**DKIM is enabled and DMARC is published at `p=none`.** Workspace does not sign
until a key is generated, so SPF alone was carrying the mail and any forward
would have broken it. `p=none` enforces nothing and cannot bounce mail; it
turns on aggregate reports, which is the evidence needed to tighten safely.
Reports are routed to a label by the same mechanism the `[Solicitation]` prefix
already uses — marked, moved out of the inbox, kept.

### The condition for tightening to `p=quarantine`

`p=none` is monitoring, not protection, and a monitoring record left in place
forever is documentation pretending to be a control. Tighten to
`p=quarantine` once aggregate reports show **four consecutive weeks with no
legitimate sender failing alignment**. That is a checkable condition on
evidence, in the same shape as ADR-0001's and ADR-0005's revisit conditions,
and it is deliberately not "revisit someday".

### What this is not

It is not a countermeasure against Gibberish Submissions or Solicitations. It
changes nothing about how much unwanted mail arrives — the gibberish rule and
the Solicitation classifier are untouched and the numbers in ADR-0005 still
hold. It reduces the probability of the one
outcome that pipeline cannot survive: a real enquiry nobody ever sees.

## Considered and declined

**A "never send it to spam" filter in the receiving mailbox.** The runbook's
own mitigation, and still available. It exempts this mail from judgement rather
than removing the signature that attracts judgement, so it has to be maintained
forever and protects only the one mailbox that has the rule. Fixing the
identity fixes it for every receiver.

**Keeping Zoho and authorising it for the domain** — `include:zoho.com` in SPF,
Zoho DKIM published, a send-only address hosted there. It works, and it means
two mail providers authorised for one domain in order to send four messages a
month, plus a looser SPF record, in exchange for nothing the Workspace account
does not already provide.

**A transactional provider — Resend or similar — on a `send.` subdomain.** The
right answer at thousands of messages, where reputation isolation matters and a
dashboard earns its keep. Here it is a vendor, an API key and a rewritten
mailer for a volume that a mailbox handles natively, against ADR-0001's and
ADR-0005's consistent refusal to add vendors to this path.

**A dedicated `contact@` sending identity.** An alias cannot authenticate to
SMTP, so this means either a paid Workspace seat or a verified send-as address.
The send-as route has a failure mode that looks like success: Gmail silently
rewrites `From` back to the authenticated user when verification lapses. The
mail is read by one person, who is also the sender, so the distinct identity is
cosmetic and the cheapest correct thing is to send as the account that already
exists.

**A runtime guard asserting `EMAIL_USER`'s domain.** Tempting — `lib/mailer.ts`
already throws at load on missing configuration — but a hardcoded domain check
can pass while SPF, DKIM or DMARC is broken, which is false assurance in
exchange for a build that fails on a legitimate domain move. Alignment is a
property of DNS and is verified against DNS, by reading `Authentication-Results`
on a message that actually arrived. The one thing worth pinning in code is
pinned in code: a test asserts `from` is always the authenticated user and never
the submitter.

## Consequences

- A genuine enquiry now arrives as internal Workspace mail rather than as
  third-party mail from an unaligned domain, which is the single largest change
  available to the odds of it being read.
- ADR-0005's guarantee — marked, never discarded — now holds through the
  mailbox door rather than up to it.
- Replying no longer means copy-pasting an address out of the body.
- Environment variable *names* are unchanged: they were already
  provider-neutral, and it was the value that was misaligned. `EMAIL_RECIPIENT`
  can now be left unset, since the fallback to `EMAIL_USER` is correct.
- The credential is an app password, which requires 2-step verification on the
  account and can be disabled outright by Workspace policy. Both are setup-time
  failures, visible immediately, not silent ones.
- DMARC reports arrive weekly and are noise until read. The label keeps them out
  of the inbox; the tightening condition above is what makes reading them
  purposeful rather than a habit.
- Contact mail is now self-addressed: `From` and `To` are the same mailbox.
  Gmail handles mail you sent yourself differently from mail a stranger sent
  you, so the `[Solicitation]` filter ADR-0005 depends on has to be re-proved
  against the probe rather than assumed. The runbook says how, and names the
  fallback if it does not fire.
- Internal delivery is the benefit and it also removes the easiest proof of
  it. Mail that never leaves Google may arrive without the
  `Authentication-Results` header that would otherwise show `dkim=pass`, so an
  absent header on the probe is not evidence of anything. Proving the signing
  works takes one message to a mailbox outside the domain; the runbook says
  which check answers which question.
- Moving the sender off the domain's own mail provider re-opens the exposure.
  `lib/mailer.ts` says so at the transport.
