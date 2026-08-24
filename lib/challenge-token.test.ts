import { describe, expect, it } from "vitest";
import { NO_TOKEN, canSubmit, spendsToken } from "@/lib/challenge-token";

describe("whether a submission may be attempted", () => {
  it("refuses to attempt one before a token exists", () => {
    // The widget produces a token asynchronously: the script loads, Cloudflare
    // is consulted, and only then is there anything to send. A visitor who
    // fills the form and submits inside that window used to post an empty
    // token and be told they could not be verified — the form manufacturing
    // the very failure the Challenge exists to report.
    expect(canSubmit(NO_TOKEN, false)).toBe(false);
  });

  it("allows one once a token has arrived", () => {
    expect(canSubmit("a-token", false)).toBe(true);
  });
});

describe("whether an attempt spent the token", () => {
  it("keeps the token when the server rejected the fields", () => {
    // Validation runs before verification server-side, so an `invalid` answer
    // means the token was never put to Cloudflare and is still good. Throwing
    // it away here is what forces the visitor to correct a typo and then
    // resubmit into an empty token.
    expect(spendsToken("invalid")).toBe(false);
  });

  it("keeps the token when the request never parsed", () => {
    // `malformed` means the route could not read the body at all, so nothing
    // downstream of it ran. Unreachable from this form, which always sends
    // JSON, but the rule is the same one: no verification, no spend.
    expect(spendsToken("malformed")).toBe(false);
  });

  it("spends the token on a message that sent", () => {
    expect(spendsToken("sent")).toBe(true);
  });

  it("spends the token on a Challenge that did not pass", () => {
    expect(spendsToken("challenge-failed")).toBe(true);
  });

  it("spends the token when the message failed to send", () => {
    // Verification happened and succeeded; only the mail transport failed. The
    // token is burnt at Cloudflare either way.
    expect(spendsToken("send-failed")).toBe(true);
  });

  it("spends the token when no answer came back at all", () => {
    // Nobody knows whether the request arrived, so nobody knows whether the
    // token was put to Cloudflare. Assuming it was spent costs one widget
    // refresh; assuming it was not costs the visitor a second failed attempt
    // on a token Cloudflare has already seen.
    expect(spendsToken("no-answer")).toBe(true);
  });
});

describe("a submission already in flight", () => {
  it("cannot be submitted a second time", () => {
    // Pins what the disabled button already does, at the seam rather than in
    // the markup: a held token is not enough on its own.
    expect(canSubmit("a-token", true)).toBe(false);
  });
});
