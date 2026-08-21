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

## The receiving mailbox has its own spam filter

Everything above assumes marked mail reaches the filter. The provider's own
spam filter runs first, and unlike this design it can discard: Gmail's Spam
deletes after 30 days.

Contact mail is unusually exposed to it. It is sent from `EMAIL_USER` — an
address on a different domain from the site, with no SPF or DKIM alignment to
it — and its body is whatever a stranger typed into a public form. That is a
spam signature, and a *genuine* enquiry carries it just as much as a
Solicitation does.

**No such filter is currently set, and that is a decision rather than an
oversight.** Nothing observed has been binned: the probe that proved this
pipeline was labelled, not spammed, and the Solicitations reaching the mailbox
arrive intact. The hazard is real but so far theoretical, and one more
always-on rule to pre-empt it is not obviously worth having.

Written down because the symptom is invisible if it ever does start: a genuine
enquiry that goes to Spam is not bounced, not logged, and not seen — it looks
exactly like nobody wrote in. The end-to-end probe above will not catch it
either, since a marked message and an unmarked one are judged differently.

**The signal to watch for is a missing message you had reason to expect** — a
reply that never arrived, an enquiry someone says they sent. That is the same
signal ADR-0005 names as the condition for reopening any of its declined
countermeasures, and it is the only one worth acting on here.

If it happens, the mitigation is one rule in the receiving mailbox:

- **Condition:** `to:` the address `EMAIL_RECIPIENT` delivers to
- **Action:** never send it to spam

Until then the exposure stands, and the guarantee in ADR-0005 — marked, never
discarded — holds only as far as the mailbox door. The addressable root cause
is the sending identity rather than the filter: mail is sent from `EMAIL_USER`,
an address on a domain unrelated to the site, and moving it onto an aligned
domain removes the signature instead of exempting it.

An ordinary message's subject is byte-for-byte what it has always been, so
existing mailbox rules matching the old text keep working, including on marked
messages.

## The Challenge

The contact form will not accept a submission without a passed Cloudflare
Turnstile Challenge — see
[ADR-0008](../adr/0008-bot-submissions-are-refused-at-the-form.md). Two
variables, and the site will not build without the secret:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | Renders the widget. Public by design — it ships to the browser. |
| `TURNSTILE_SECRET_KEY` | Yes | Verifies the token server-side. Never reaches the browser. |

### Getting the keys

1. <https://dash.cloudflare.com> → **Turnstile** → **Add site**.
2. Widget mode **Managed**, which is invisible for most visitors and shows an
   interaction only when Cloudflare is unsure.
3. Add every hostname the form runs on: the production domain, and `localhost`
   for local development. **A hostname that is not listed fails every
   Challenge**, which looks exactly like a broken form.
4. Copy both keys into Vercel, in every environment. The secret is a secret;
   the site key is not.

### Local development

Cloudflare publishes fixed test keys, so no real key belongs in `.env.local`:

| Behaviour | Site key | Secret key |
| --- | --- | --- |
| Always passes | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Always blocks | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` |

The blocking pair is the useful one: it is the only way to see what a refused
visitor sees without waiting to be refused.

### Proving it works

Submit the form normally. Three outcomes worth knowing apart:

| What you see | What it means | What to do |
| --- | --- | --- |
| The message sends | Widget, token and verification all work | Nothing |
| "Couldn't verify that you're human" | The token was refused | Check the hostname is listed on the Turnstile site, and that the secret matches the site key |
| No widget renders at all | The script did not load, or the site key is wrong or missing | Check `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set in that environment |

The widget is reset after every attempt, because a Turnstile token is
single-use. If a second submission in the same session always fails, that reset
is what has broken.

### When someone says they could not send

**Treat it as real, and treat the Challenge as the first suspect.** This is the
condition ADR-0008 names for revisiting the decision, and one report is enough.
Nothing in this design records a refusal, so this is the only way you will ever
hear about it.

Fewer unwanted submissions is not evidence that any of this is working: a
Challenge that refused every visitor on earth would produce the same number.

## Countermeasures considered and declined

Each was considered and declined with reasons in
[ADR-0008](../adr/0008-bot-submissions-are-refused-at-the-form.md) or, for the
older ones, in
[ADR-0001](../adr/0001-contact-message-intake-is-one-module.md):

- Rate limiting (declined twice, in ADR-0001 and ADR-0005)
- A honeypot field
- reCAPTCHA
- Keeping ADR-0005's Gibberish Submission rule or Solicitation marking
  alongside the Challenge

**What ADR-0005 used to do here is gone.** Classification, the
`[Solicitation] ` subject prefix and the mailbox filter that routed it were
removed by ADR-0008. If a mailbox rule matching `[Solicitation]` still exists,
it will never fire again and can be deleted. The 46-message corpus and the
reasoning behind that design are kept in
[ADR-0005](../adr/0005-contact-form-spam-is-classified-not-throttled.md) as
history.

## Related

- [ADR-0001](../adr/0001-contact-message-intake-is-one-module.md) — Contact
  Message intake is one module behind an injected send seam
- [ADR-0008](../adr/0008-bot-submissions-are-refused-at-the-form.md) — bot
  submissions are refused at the form, not sorted afterwards
- [CONTEXT.md](../../CONTEXT.md) — the terms used here: Contact Message,
  Challenge

