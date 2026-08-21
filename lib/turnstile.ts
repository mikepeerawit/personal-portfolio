// Verifying a Challenge with Cloudflare Turnstile. The token the widget puts in
// the form is proof of nothing until Cloudflare confirms it, and confirming it
// is a network call — so this module is the transport, injected into
// `submitContactMessage` the way `lib/mailer.ts` is. Nothing here is imported
// by the browser: the contact form renders the widget and reads the token, and
// never sees the secret or the verdict logic.

import type { Verify } from "@/lib/contact-message";

// Read once at module load, so a misconfigured deployment fails at startup
// rather than on the first visitor who tries to send a message — the rule
// ADR-0001 set for the mail transport, applied to the same kind of secret.
const secret = process.env.TURNSTILE_SECRET_KEY;

if (!secret) {
  throw new Error(
    "Missing challenge configuration: TURNSTILE_SECRET_KEY must be set"
  );
}

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const verifyChallenge: Verify = async (token) => {
  // An absent token is a failed Challenge, not an error: it is what a direct
  // POST at the API sends, and it is also what a browser with the widget
  // blocked sends. Neither reaches Cloudflare.
  if (!token) return false;

  const response = await fetch(SITEVERIFY, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  // Cloudflare being unreachable is not proof the visitor is a bot. It is
  // reported as a failed Challenge anyway: the alternative is letting every
  // submission through whenever the verifier is down, which is precisely when
  // an attacker would send them. The visitor is told to try again, and the
  // cause is logged by the route.
  if (!response.ok) return false;

  const body: unknown = await response.json();

  return (
    typeof body === "object" &&
    body !== null &&
    (body as { success?: unknown }).success === true
  );
};
