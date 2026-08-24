import { describe, expect, it } from "vitest";
import { requireChallengeKey } from "@/lib/challenge-config";

describe("a challenge key the deployment must supply", () => {
  it("returns the key when it is set", () => {
    expect(requireChallengeKey("TURNSTILE_SECRET_KEY", "a-secret")).toBe(
      "a-secret"
    );
  });

  it("refuses a missing key", () => {
    expect(() =>
      requireChallengeKey("TURNSTILE_SECRET_KEY", undefined)
    ).toThrow("Missing challenge configuration");
  });

  it("refuses an empty key rather than treating it as one", () => {
    // An unset variable in a deployment platform is frequently the empty
    // string rather than absent.
    expect(() => requireChallengeKey("TURNSTILE_SECRET_KEY", "")).toThrow(
      "Missing challenge configuration"
    );
  });

  it("names the variable, so the fix does not need a code read", () => {
    // Whoever hits this is looking at a failed build, not at this file.
    expect(() =>
      requireChallengeKey("NEXT_PUBLIC_TURNSTILE_SITE_KEY", undefined)
    ).toThrow(/NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  });
});
