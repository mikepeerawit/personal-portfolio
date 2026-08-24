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

Everything above stops at the mailbox door. The provider's own spam filter runs
before any of it, and unlike anything in this design it can discard: Gmail's
Spam deletes after 30 days.

Contact mail is unusually exposed to it. It is sent from `EMAIL_USER` — an
address on a different domain from the site, with no SPF or DKIM alignment to
it — and its body is whatever a stranger typed into a public form. That is a
spam signature, and a *genuine* enquiry carries it just as much as an unwanted
one does.

**No filter rule is currently set, and that is a decision rather than an
oversight.** Nothing observed has been binned: the probe below lands in the
inbox, and the unwanted mail this form has attracted has reached the mailbox
intact rather than disappearing into Spam. The hazard is real but so far
theoretical, and one more always-on rule to pre-empt it is not obviously worth
having.

Written down because the symptom is invisible if it ever does start: a genuine
enquiry that goes to Spam is not bounced, not logged, and not seen — it looks
exactly like nobody wrote in.

Since ADR-0008 removed classification, every message this pipeline sends is the
same shape: one subject format, one sending address, no marking of any kind.
That makes the probe below a closer proxy for a genuine enquiry than it used to
be — same sender, same subject — but not a proof of one, because the body
differs and a filter scores content too.

**The signal to watch for is a missing message you had reason to expect** — a
reply that never arrived, an enquiry someone says they sent. It is the same
signal ADR-0008 names for the Challenge, and it is the only one worth acting on
here.

If it happens, the mitigation is one rule in the receiving mailbox:

- **Condition:** `to:` the address `EMAIL_RECIPIENT` delivers to
- **Action:** never send it to spam

Until then the exposure stands. The addressable root cause is the sending
identity rather than the filter: mail is sent from `EMAIL_USER`, an address on a
domain unrelated to the site, and moving it onto an aligned domain removes the
signature instead of exempting it.

## The Challenge

The contact form will not accept a submission without a passed Cloudflare
Turnstile Challenge — see
[ADR-0008](../adr/0008-bot-submissions-are-refused-at-the-form.md). Two
variables, and **the site will not build without either of them** — the secret
from `lib/turnstile.ts` as the build collects page data, the site key from
`next.config.ts` before that. A deployment configured with only one of the two
fails loudly instead of serving a contact form that cannot work:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | Renders the widget. Public by design — it ships to the browser. |
| `TURNSTILE_SECRET_KEY` | Yes | Verifies the token server-side. Never reaches the browser. |

### Getting the keys

**`scripts/setup-turnstile.sh` walks the whole procedure** — it opens each
page, takes the two keys, writes all six Vercel variables and `.env.local`, and
ends at the redeploy. The steps below are what it does, for when you would
rather do it by hand or need to check one of them.

1. <https://dash.cloudflare.com> → **Turnstile** → **Add site**.
2. Widget mode **Managed**, which is invisible for most visitors and shows an
   interaction only when Cloudflare is unsure.
3. Add every hostname the form runs on: the production domain, and `localhost`
   for local development. **A hostname that is not listed fails every
   Challenge**, which looks exactly like a broken form.
4. Copy both keys into Vercel. The secret is a secret; the site key is not.
   **Which pair goes in which environment is not uniform** — see below.

### Which keys go in which Vercel environment

| Environment | Keys | Why |
| --- | --- | --- |
| Production | The real pair | It is the hostname the Turnstile site lists |
| Preview | The **always-passing test pair** | Preview hostnames are generated per branch |
| Development | The test pair, in `.env.local` | See below |

All three must be set, or the build fails — that is the point of the check in
`next.config.ts`.

**Preview is the one that catches people out.** Every preview deployment gets a
generated hostname like `personal-portfolio-git-<branch>.vercel.app`, and a
hostname the Turnstile site does not list fails every Challenge. Real keys in
Preview therefore produce a widget that refuses *everyone* on every preview —
which looks exactly like a broken contact form, and would be read as this
design failing rather than as a hostname list that could never keep up.

The cost of the test pair is that a preview does not exercise a real Challenge:
it proves the form, the wire and the mail path work, and proves nothing about
Cloudflare. That is the right trade, because the alternative proves nothing
about anything. Use the always-blocking pair temporarily in Preview when what
you want to see is a refusal.

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
| No widget renders at all, and Send never becomes clickable | The script did not load — blocked by an extension, or the network. A *missing* site key cannot cause this in a deployed build, because that build would have failed | Check the browser console for a blocked request to `challenges.cloudflare.com` |
| The widget renders but shows an error | The site key is wrong for this environment, or the hostname is not listed on the Turnstile site | Check the key matches the Turnstile site, and that the hostname is listed |
| "Couldn't verify that you're human", and the logs carry `Challenge verification failed` | Cloudflare could not be reached, errored, or timed out — the Challenge fails closed, so everyone is refused meanwhile | Check Cloudflare's status; nothing to fix here |

**The Send button stays disabled until the widget has produced a token**, so a
visitor who fills the form faster than the script loads waits rather than being
refused. A permanently disabled button with valid fields in it means no token is
arriving — the widget errored, or the site key is wrong.

A Turnstile token is single-use, so the widget is reset after an attempt that
spent one. An attempt the server rejected on the fields did not spend it — it
never reached Cloudflare — and that token is kept, so correcting a typo and
resubmitting works without waiting for a new one. If a second submission in the
same session always fails, that spend rule (`lib/challenge-token.ts`) is what
has broken.

### When someone says they could not send

**Treat it as real, and treat the Challenge as the first suspect.** This is the
condition ADR-0008 names for revisiting the decision, and one report is enough.
A refused visitor is not recorded anywhere, so this is the only way you will
ever hear about one.

**One thing is recorded: a Challenge that could not be checked at all.** If
Cloudflare was unreachable, answered with an error, or never answered before the
ten-second deadline, the function logs

```
Challenge verification failed: <cause>
```

Search the platform logs for `Challenge verification failed` around the time
they tried. A hit means the verifier was down and the refusal had nothing to do
with the visitor — everyone was refused for as long as it lasted. No hit means
the token itself was refused, and the table above is where to start. Neither the
secret nor the visitor's token appears in that line.

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

