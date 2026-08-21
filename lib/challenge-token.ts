// The Challenge token's life inside the form, with no DOM and no network in
// it. The widget produces a token, the form spends it on a submission, and
// Cloudflare will not accept the same one twice — so a form that submits
// whatever happens to be lying in the hidden input refuses genuine visitors at
// two predictable moments: before the first token has arrived, and immediately
// after an attempt has spent one.
//
// Transport-free and DOM-free on purpose, the way `lib/contact-wire.ts` is:
// the form owns the widget and the state, this owns the rules.

import type { SubmissionReport } from "@/lib/contact-wire";

// What the form holds when the widget has not produced a token, or when the
// one it had is gone: spent on an attempt, expired, or failed.
export const NO_TOKEN = null;

export type ChallengeToken = string | typeof NO_TOKEN;

export function canSubmit(
  token: ChallengeToken,
  isSubmitting: boolean
): boolean {
  return token !== NO_TOKEN && !isSubmitting;
}

// A token is single-use, and the widget must be reset to produce another. The
// question this answers is whether the attempt just made actually put it to
// Cloudflare — because resetting when it did not is what leaves a visitor
// correcting a typo with no token to resubmit with.
//
// Everything spends it except the two outcomes that are decided before
// verification runs: `submitContactMessage` validates first, and the route
// answers `malformed` without calling it at all. `no-answer` counts as spent
// because nobody can say whether the request arrived — one wasted widget
// refresh is the cheaper of the two wrong guesses.
export function spendsToken(kind: SubmissionReport["kind"]): boolean {
  switch (kind) {
    case "invalid":
    case "malformed":
      return false;
    case "sent":
    case "challenge-failed":
    case "send-failed":
    case "no-answer":
      return true;
    // A new kind on the wire has to answer this question rather than default
    // to the wrong half of it.
    default:
      kind satisfies never;
      return true;
  }
}
