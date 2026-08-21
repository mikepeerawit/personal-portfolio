# Operating the contact pipeline

What the contact form needs from its environment and from the mailbox, and how
to check that each is actually in place.

This is a runbook. Every "why" is a link — the reasoning lives in the ADRs and
is not repeated here.

## Mail configuration

Three environment variables, read once when the mailer module loads:

| Variable | Required | Purpose |
| --- | --- | --- |
| `EMAIL_USER` | Yes | The account contact mail is sent *from*. Must be a mailbox on `mikepeerawit.com`, the domain's own Google Workspace — see [ADR-0008](../adr/0008-contact-mail-sends-from-an-aligned-identity.md). |
| `EMAIL_PASSWORD` | Yes | A Google **app password** for that account, not the account password. Requires 2-step verification, and Workspace policy can disable app passwords entirely. |
| `EMAIL_RECIPIENT` | No | Where contact mail is delivered. Falls back to `EMAIL_USER`, which is now the right answer — leave it unset unless mail should go somewhere other than the sending mailbox. |

**The sending address is not a free choice.** Sending from anywhere other than
the domain's own Workspace re-opens the deliverability exposure ADR-0008
closed, and the symptom is invisible: see
[The receiving mailbox's own spam filter](#the-receiving-mailboxs-own-spam-filter-and-why-it-no-longer-outranks-this-one)
below.

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

The receiving mailbox is Gmail, which has no folders: "move to a folder" there
is **Skip the Inbox (Archive it)** plus **Apply the label**. Gmail also ignores
punctuation when matching, so the condition matches the *word* `Solicitation`
whether or not the brackets survive.

### The receiving mailbox's own spam filter, and why it no longer outranks this one

Everything above assumes marked mail reaches the filter. The provider's own
spam filter runs first, and unlike this design it can discard: Gmail's Spam
deletes after 30 days.

Contact mail used to be unusually exposed to that. It was sent through Zoho
from an address on a domain unrelated to the site, with no SPF or DKIM
alignment to it, carrying a body written by a stranger — a spam signature that
a *genuine* enquiry carried just as much as a Solicitation did.

**That is now closed at the cause rather than exempted by a rule.** Mail sends
from a mailbox on `mikepeerawit.com` through the same Google Workspace that
receives it, so it is internal mail, aligned to the SPF record the domain
already published, signed by DKIM, and covered by DMARC. See
[ADR-0008](../adr/0008-contact-mail-sends-from-an-aligned-identity.md).

What has to be true, and stay true:

| Thing | Required state | How to check |
| --- | --- | --- |
| `EMAIL_USER` | a mailbox on `mikepeerawit.com` | read it in the Vercel project's environment variables |
| SPF | `v=spf1 include:_spf.google.com -all` | `dig +short TXT mikepeerawit.com` |
| DKIM | a key published and signing turned on in Workspace Admin | `dig +short TXT google._domainkey.mikepeerawit.com` returns a `v=DKIM1` record |
| DMARC | published, currently `p=none` | `dig +short TXT _dmarc.mikepeerawit.com` |

A `dig` that comes back empty for DKIM means Workspace is not signing — the key
exists in Admin but was never published, or was published on the wrong host.

**DMARC is at `p=none`, which enforces nothing.** It is there for the aggregate
reports. Tighten it to `p=quarantine` after four consecutive weeks of reports
with no legitimate sender failing alignment — the condition is ADR-0008's, and
it is a condition rather than a someday.

Aggregate reports arrive as XML attachments, a handful a week, addressed to the
`rua=` mailbox. Filter them the same way Solicitations are filtered: label,
skip the inbox, keep. They are the evidence for the paragraph above, so do not
delete them.

**The signal that something regressed is still a missing message you had reason
to expect** — a reply that never arrived, an enquiry someone says they sent.
That is the same signal ADR-0005 names as the condition for reopening any of
its declined countermeasures. If it happens, check the four rows above before
concluding anything about the classifier.

The mitigation of last resort is unchanged and still available: one rule in the
receiving mailbox, `to:` the address `EMAIL_RECIPIENT` delivers to, action
**never send it to spam**. It is worth less than it looks — it exempts this
mail from judgement in one mailbox instead of removing the reason it was
judged — which is why the sending identity was fixed instead.

### Which mailbox the filter goes in, now that both are the same one

**The mailbox that receives `EMAIL_RECIPIENT`.** With `EMAIL_RECIPIENT` unset
that is `EMAIL_USER` itself, so the sending and receiving mailbox are now one
account and the filter goes there. If `EMAIL_RECIPIENT` is ever set to an
alias, the filter belongs in the mailbox the alias delivers to, not on the
alias.

**Self-addressed mail is the one thing to actually verify here.** Contact mail
now arrives with `From` and `To` both `EMAIL_USER`, and Gmail treats mail you
sent yourself differently from mail a stranger sent you — it carries the
**Sent** label as well as arriving, and filters behave less predictably on it
than on ordinary incoming mail. The `[Solicitation]` filter must still fire.

Nothing about that is worth reasoning through in the abstract: run the probe
below and look at where the message actually lands. If a marked probe stays in
the inbox, add `to:me` to the filter's condition, and if it still does not
fire, set `EMAIL_RECIPIENT` to a different mailbox you own so the mail arrives
as ordinary incoming mail. Either way the alignment gained in
[ADR-0008](../adr/0008-contact-mail-sends-from-an-aligned-identity.md) is
unaffected — it is a property of who sent the message, not of who received it.

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

Then find where it landed, in the mailbox `EMAIL_RECIPIENT` delivers to:

| Where it lands | What that means | What to do |
| --- | --- | --- |
| The Solicitation folder | Classifier, mark and filter all work | Nothing |
| Inbox, subject starts `[Solicitation]` | The code marked it; the filter is not matching | Fix the filter condition |
| Inbox, no prefix | The classifier is not marking | Check the production deployment is current |

Worth running after changing the filter, and after any change to
`lib/solicitation.ts` — see
[ADR-0005](../adr/0005-contact-form-spam-is-classified-not-throttled.md) for
why the threshold is where it is.

**While you have the message open, read its headers** — *Show original* in
Gmail. That is the only direct proof the sending identity is aligned, and the
probe above is the natural moment to look:

```
Authentication-Results: mx.google.com;
       spf=pass ... dkim=pass header.d=mikepeerawit.com; dmarc=pass
```

`dkim=pass` with `header.d` equal to the site's domain is the line that
matters; `spf=pass` alone is weaker, because a forward breaks it. Anything
else means the setup regressed — check the four rows in
[the section above](#the-receiving-mailboxs-own-spam-filter-and-why-it-no-longer-outranks-this-one).
Also confirm `Reply-To` is the address you submitted with and `From` is not:
`From` must always be `EMAIL_USER`.

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
- [ADR-0008](../adr/0008-contact-mail-sends-from-an-aligned-identity.md) —
  contact mail sends from an identity aligned to the site's domain
- [CONTEXT.md](../../CONTEXT.md) — the terms used here: Contact Message,
  Gibberish Submission, Solicitation
