// The rule for reading a Challenge key out of the environment, in one place
// because it is applied in two: `lib/turnstile.ts` reads the secret at module
// load, and `next.config.ts` checks the site key at build.
//
// ADR-0001 set the rule — a misconfigured deployment fails at startup rather
// than on the first visitor who tries to send a message. The site key needs it
// as much as the secret does: it is inlined into the bundle at build time, so
// a build that goes out without it produces a page whose widget never renders,
// which no runtime check on the server can see.

export function requireChallengeKey(
  name: string,
  value: string | undefined
): string {
  // Empty, not just absent: an unset variable in a deployment platform is
  // frequently the empty string, and an empty key is not a key.
  if (!value) {
    throw new Error(`Missing challenge configuration: ${name} must be set`);
  }

  return value;
}
