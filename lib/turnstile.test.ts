import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Like the mailer, this module reads its secret at import and fails there if it
// is missing, so every case loads it fresh under a chosen environment rather
// than calling a function.
let saved: string | undefined;
const fetchMock = vi.fn();

async function loadVerifier(secret?: string) {
  if (secret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = secret;
  return import("./turnstile");
}

// The one thing here that would otherwise reach the network.
function respondWith(body: unknown, ok = true) {
  fetchMock.mockResolvedValue({
    ok,
    json: async () => body,
  });
}

beforeEach(() => {
  saved = process.env.TURNSTILE_SECRET_KEY;
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  if (saved === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = saved;
  vi.unstubAllGlobals();
});

describe("a deployment missing its challenge configuration", () => {
  it("fails to load rather than on the first visitor", async () => {
    await expect(loadVerifier()).rejects.toThrow(
      "Missing challenge configuration"
    );
  });

  it("names the variable, so the fix does not need a code read", async () => {
    await expect(loadVerifier()).rejects.toThrow(/TURNSTILE_SECRET_KEY/);
  });

  it("treats an empty secret as missing rather than as a secret", async () => {
    await expect(loadVerifier("")).rejects.toThrow(
      "Missing challenge configuration"
    );
  });
});

describe("verifying a token", () => {
  it("passes a Challenge Cloudflare accepts", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    respondWith({ success: true });

    await expect(verifyChallenge("a-token")).resolves.toBe(true);
  });

  it("fails a Challenge Cloudflare rejects", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    respondWith({ success: false, "error-codes": ["invalid-input-response"] });

    await expect(verifyChallenge("a-token")).resolves.toBe(false);
  });

  it("sends the secret and the token, and nothing about the submitter", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    respondWith({ success: true });

    await verifyChallenge("a-token");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("challenges.cloudflare.com");

    // Nothing the visitor wrote goes to Cloudflare: the token proves a human
    // was present, and their name and message are none of the verifier's
    // business.
    const body = String(init.body);
    expect(body).toContain("secret=a-secret");
    expect(body).toContain("response=a-token");
    expect(body.split("&")).toHaveLength(2);
  });

  it("fails an absent token without asking Cloudflare", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");

    // What a direct POST at the API sends. There is nothing to verify, so
    // there is no round trip to spend on it.
    await expect(verifyChallenge(undefined)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when the verifier is unreachable", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    respondWith({}, false);

    // An outage at Cloudflare is not proof the visitor is a bot, and this
    // still refuses them. The alternative — letting everything through while
    // the verifier is down — is an open door at exactly the moment someone
    // would walk through it. The visitor is told to try again.
    await expect(verifyChallenge("a-token")).resolves.toBe(false);
  });

  it("fails a response that is not the shape Cloudflare documents", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    respondWith({ success: "true" });

    // A string is not `true`. Anything but the documented shape is a failure,
    // so a changed API cannot quietly become an open door.
    await expect(verifyChallenge("a-token")).resolves.toBe(false);
  });
});
