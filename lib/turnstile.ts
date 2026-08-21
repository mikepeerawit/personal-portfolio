// Verifying a Challenge with Cloudflare Turnstile. The token the widget puts in
// the form is proof of nothing until Cloudflare confirms it, and confirming it
// is a network call — so this module is the transport, injected into
// `submitContactMessage` the way `lib/mailer.ts` is. Nothing here is imported
// by the browser: the contact form renders the widget and reads the token, and
// never sees the secret or the verdict logic.

import { requireChallengeKey } from "@/lib/challenge-config";
import type { Verify } from "@/lib/contact-message";

// Read once at module load, so a misconfigured deployment fails at startup
// rather than on the first visitor who tries to send a message — the rule
// ADR-0001 set for the mail transport, applied to the same kind of secret.
const secret = requireChallengeKey(
  "TURNSTILE_SECRET_KEY",
  process.env.TURNSTILE_SECRET_KEY
);

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// A verifier that accepts the request and never answers is not a refusal and
// not a network failure — nothing goes wrong, it simply never finishes. Without
// a deadline it holds the function open until the platform kills it, and the
// visitor waits that out to be told nothing. Ten seconds is far longer than
// siteverify takes and far shorter than the platform's own limit.
//
// Exported so the tests can wait exactly this long rather than hard-coding a
// number that drifts away from it.
export const VERIFY_TIMEOUT_MS = 10_000;

export const verifyChallenge: Verify = async (token) => {
  // An absent token is a failed Challenge, not an error: it is what a direct
  // POST at the API sends, and it is also what a browser with the widget
  // blocked sends. Neither reaches Cloudflare.
  if (!token) return false;

  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), VERIFY_TIMEOUT_MS);

  // Cloudflare being unreachable is not proof the visitor is a bot. It is
  // reported as a failed Challenge anyway: the alternative is letting every
  // submission through whenever the verifier is down, which is precisely when
  // an attacker would send them. The visitor is told to try again.
  //
  // Every way that can happen returns rather than throws, which is why one
  // `catch` covers the lot: a request that never connects, a request abandoned
  // at the deadline, and a 200 whose body is not JSON at all — a captive
  // portal, a proxy error page — all mean the same thing here. A thrown error
  // would escape the route, which then answers with a body the form cannot
  // decode, and the visitor is told nobody can say whether their message was
  // sent. That is the one thing untrue of a failed Challenge: nothing was sent.
  try {
    const response = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: deadline.signal,
    });

    // Reached, and refusing to answer the question: a 5xx, or a 403 at a
    // revoked secret. It said nothing about this visitor.
    if (!response.ok) return false;

    const body: unknown = await response.json();

    return (
      typeof body === "object" &&
      body !== null &&
      (body as { success?: unknown }).success === true
    );
  } catch (cause) {
    // The route reads a boolean, so this is the last point where a Cloudflare
    // outage is still distinguishable from a bot that could not pass. Logged
    // here rather than there for that reason, under the rule ADR-0001 set for
    // send failures: the cause is logged because it no longer reaches the
    // browser. Refusals — the ordinary case — are not logged at all, or every
    // bot would bury this.
    console.error("Challenge verification failed:", cause);
    return false;
  } finally {
    clearTimeout(timer);
  }
};
