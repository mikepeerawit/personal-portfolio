# ADR-0005: Contact form spam is classified, not throttled

- **Status:** Accepted; the mailbox filter this decision depends on is a
  required setup step, recorded in
  [Operating the contact pipeline](../operations/contact-pipeline.md) and
  tracked as #20
- **Date:** 2026-08-10
- **Answers:** the revisit condition ADR-0001 left open on rate limiting

## Context

ADR-0001 declined rate limiting and named the condition for reopening it:
*"Revisit if spam actually arrives — this is not an oversight, and future
reviews should not re-raise it without new evidence."* Spam arrived. This is
the revisit, and the evidence is the mailbox rather than intuition.

Twelve months of submissions carrying the `Portfolio Contact Form:` subject
prefix — 46 messages, August 2025 to August 2026 — fall into three groups:

| Cluster | Count | Signature |
| --- | --- | --- |
| Gibberish | ~24 | Random mixed-case ASCII with no whitespace, e.g. name `GpanMFTPvfemgdRa`, message `CkqxyhpzjWmVgKGekjoRJgW`; dot-padded Gmail senders |
| Solicitation | ~18 | Plausible names, templated SEO copy ("top of search results", "within 24 hours"); nearly all from `jmailservice.com`, a few from `dominatingkeywords.com` and `dominatebanners.com` |
| Genuine | 1 | The owner's own test message |

The Solicitation cluster reads as human and is not. "Gabrielle Simmons"
submitted three times across November, February and March, and "Richard Lawson"
twice months apart — fabricated identities reused with rotating copy from a
single throwaway domain.

Every message arrives looking identical to a real enquiry: same sender shape,
same subject. Each one has to be opened and judged by hand.

## Decision

Two server-side changes, both invisible to a genuine visitor. The contact form
does not change.

**A Gibberish Submission is invalid, not suspicious.** A message that is one
unbroken run of ASCII letters and digits is rejected at the existing validation
boundary in `lib/contact-message.ts`, with a per-field error, exactly like a
too-short message. The rule therefore ships to the browser like every other
validation rule, which is safe precisely because complying with it means
writing a real message — a spammer who defeats it has stopped sending
gibberish, which is the goal.

**A Solicitation is delivered, but marked.** A message scoring above a
threshold on content and sender-domain signals still sends, with
`[Solicitation] ` prefixed to the subject ahead of the existing text, so one
mailbox filter routes it out of the inbox without ever discarding it.
Classification adds no fourth arm to `SubmitResult`: the outcome is still
*sent*, because suspicion is a property of the message, and ADR-0001's
three-outcome model survives untouched.

The verdict is injected the way the mail transport already is —
`submitContactMessage(raw, send, classify)`. The API route supplies both; the
contact form supplies neither and imports only `parseContactMessage`. That
keeps every scoring rule and keyword list out of the browser bundle by the
import graph rather than by trusting tree-shaking, reuses the seam pattern
ADR-0001 established instead of inventing a second one, and keeps the route a
thin adapter.

Scoring is additive with a threshold, and the signals are: the sender's domain
being one of the observed solicitor domains or a subdomain of one, weighted
strongly; templated pitch copy, each phrase counting; and a link in the body.

Topical vocabulary — "SEO", "keywords", "search results", "rank" — is a fourth
signal, but a **capped** one: being about the subject counts once however many
synonyms appear. That cap is the difference between the two clusters. A
solicitation and a client hiring for SEO work reach for the same words, so
counting each occurrence marks "help us rank our keywords in search results" on
three counts of naming one subject once. What actually separates a pitch is the
sales copy around the topic: nobody enquiring about a project promises the
first page within 24 hours.

Nothing is logged — the subject prefix is the record, and it lives in a mailbox
the owner already controls. The prefix string itself is in the browser-shipped
module, so a spammer can learn that marking exists; what stays server-side is
every rule that decides it, which is what tuning copy against would require.

### The premise: losing one real enquiry costs more than fifty solicitations

Every tuning decision above inherits this. Marking is preferred to rejection
everywhere the judgement is about intent rather than well-formedness, because a
mis-marked real message is recoverable from a folder and a rejected one is
gone. The threshold requires more than one signal, so an ambiguous message —
someone hiring for SEO work, or an unremarkable message from a domain that has
sent pitches before — reaches the inbox unmarked. The capped topical score
exists for the same reason: the first draft of this scorer counted each
topical word, and "can you build a search results page that ranks products by
keyword relevance?" scored three. The test table carries that case and the
enquiry it stands for.

The corpus contains exactly one genuine message in twelve months, and it was
the owner's own test. That is not an argument for filtering harder. It means
there is currently abundant evidence of the noise and none of the cost of a
false positive, so precision is not to be "improved" without noticing what it
trades away.

### The ASCII script guard

The gibberish rule matches only ASCII letters and digits, and that range is
load-bearing rather than incidental precision. Thai does not delimit words with
spaces, so a genuine Thai enquiry is *also* a single run of characters with no
whitespace; Chinese and Japanese are the same. Anchoring to ASCII exempts every
non-space-delimited script by construction. A Thai speaker writing in English
uses spaces and is unaffected.

Written down here because "the message contains no whitespace" is the obvious
simplification of the rule, it is smaller, it passes every test built from the
spam corpus, and it rejects a Thai speaker for writing Thai. The test that
pins it is commented for the same reason.

Only the message is checked. Names are not: `GpanMFTPvfemgdRa` is obviously
fake, but single-token names are legitimate, and the message rule already
catches every gibberish submission in the corpus.

## Considered and declined

**Rate limiting, again — now on evidence rather than proportionality.** These
arrive one at a time, days or weeks apart, not in bursts. Throttling addresses
the wrong axis: a limit loose enough to never block a real visitor would not
have stopped a single message in the corpus. ADR-0001's shared-state objection
still stands on top of that. This closes the revisit condition rather than
leaving it open.

**A hard domain blocklist.** The operators register new domains, and a
blocklist fails silently and completely when they do. A score degrades
gracefully: the copy alone still marks the same pitch sent from a domain nobody
has seen, and the test suite pins that case.

**A honeypot field.** Anything POSTing directly at `/api/contact` sends the
three real fields and passes an empty honeypot cleanly, so it would catch only
form-fillers, while adding a hidden input with screen-reader risk.

**CAPTCHA, Turnstile, reCAPTCHA, Akismet, or any third-party classifier.** A
vendor, a script tag, an outage surface and a privacy surface — against
ADR-0001's precedent of rejecting a 13 kB library for this site. No genuine
visitor should have to prove anything to send a short message.

**Rejecting Solicitations outright**, and any quarantine or review UI. Both
lose the asymmetry above: the first can discard a real enquiry, and the second
is infrastructure for a problem a mailbox folder already solves.

## Consequences

- Roughly half the incoming spam stops being emailed at all, and the other half
  arrives filterable, without a CAPTCHA, a vendor, or any new stateful
  infrastructure. No new environment variable and no new failure mode.
- An ordinary message's subject is byte-for-byte what it was, so existing
  mailbox rules and searches keep working — including on marked messages, since
  the prefix precedes the old text rather than replacing it.
- Creating the mailbox filter is a setting, not code. The prefix is what makes
  it possible.
- The 46 messages already delivered are not reclassified.
- The maintenance loop is the mailbox itself: search
  `subject:"Portfolio Contact Form"`, read what got through, and extend the
  signal table from evidence. That is why the rules are a score rather than a
  list.
- Tests drive both behaviours through the seams ADR-0001 established — the
  recording fake at `send`, a stub at `classify` — plus a table of corpus cases
  for the scorer, which is the one place tests touch the rules directly. No
  test needs environment, network, or a mail server.
