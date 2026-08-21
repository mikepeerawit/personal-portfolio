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

  it("fails closed when Cloudflare answers with an error status", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    respondWith({}, false);

    // Cloudflare was reached and refused to answer the question — a 5xx, or a
    // 403 at a revoked secret. It said nothing about this visitor, so there is
    // no verdict to read out of it.
    await expect(verifyChallenge("a-token")).resolves.toBe(false);
  });

  it("fails closed when Cloudflare cannot be reached at all", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    // A DNS failure, a reset connection, a TLS error: the request never got an
    // answer of any kind. An outage at Cloudflare is not proof the visitor is a
    // bot, and this still refuses them — letting everything through while the
    // verifier is down is an open door at exactly the moment someone would walk
    // through it.
    //
    // What it must not do is throw. That escapes the route, and the visitor is
    // told nobody can say whether their message was sent — which is false.
    // Nothing was sent, and nothing could have been.
    await expect(verifyChallenge("a-token")).resolves.toBe(false);
  });

  it("fails closed when the answer cannot be read as JSON", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON at position 0");
      },
    });

    // A 200 carrying something that is not Cloudflare's answer at all: a
    // captive portal's login page, a proxy's error page. The status says the
    // request succeeded and the body still holds no verdict, so this is the one
    // failure mode that cannot be spotted by looking at `ok`.
    await expect(verifyChallenge("a-token")).resolves.toBe(false);
  });

  it("gives up on a verifier that accepts the request and never answers", async () => {
    const { verifyChallenge, VERIFY_TIMEOUT_MS } = await loadVerifier("a-secret");
    vi.useFakeTimers();

    try {
      // Not a refusal and not a network failure: the connection is open, the
      // request was accepted, and the answer never comes. Nothing above catches
      // this, because nothing has gone wrong yet — it just never finishes.
      // Left alone it holds the function open until the platform kills it, and
      // the visitor waits out the whole timeout for no answer.
      fetchMock.mockImplementation((_url: string, init: RequestInit) => {
        const { signal } = init;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(signal.reason));
        });
      });

      const verdict = verifyChallenge("a-token");
      await vi.advanceTimersByTimeAsync(VERIFY_TIMEOUT_MS);

      await expect(verdict).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("logs the cause when the exchange fails, so an outage is not read as a bot", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = new TypeError("fetch failed");
    fetchMock.mockRejectedValue(cause);

    try {
      await expect(verifyChallenge("a-token")).resolves.toBe(false);

      // The route reads a boolean, so a refused bot and a Cloudflare outage
      // reach it as the same `false` and leave the same silence behind. This is
      // the only place the difference still exists. Without it, "nobody could
      // send" has nothing to look at. Same rule ADR-0001 set for send failures:
      // the cause is logged because it no longer reaches the browser.
      expect(logged).toHaveBeenCalledWith(
        expect.stringContaining("Challenge"),
        cause
      );
    } finally {
      logged.mockRestore();
    }
  });

  it("keeps the secret and the token out of what it logs", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    try {
      await verifyChallenge("a-token");

      // An outage log ends up wherever the platform keeps logs. The secret is
      // the deployment's credential and the token is the visitor's; neither is
      // any part of the reason the exchange failed.
      const written = JSON.stringify(logged.mock.calls);
      expect(written).not.toContain("a-secret");
      expect(written).not.toContain("a-token");
    } finally {
      logged.mockRestore();
    }
  });

  it("says nothing when Cloudflare simply refuses the token", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    respondWith({ success: false, "error-codes": ["invalid-input-response"] });

    try {
      await verifyChallenge("a-token");

      // The ordinary case, and the one this whole feature exists to produce.
      // Logging every refused bot would bury the outage above in noise.
      expect(logged).not.toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });

  it("fails a response that is not the shape Cloudflare documents", async () => {
    const { verifyChallenge } = await loadVerifier("a-secret");
    respondWith({ success: "true" });

    // A string is not `true`. Anything but the documented shape is a failure,
    // so a changed API cannot quietly become an open door.
    await expect(verifyChallenge("a-token")).resolves.toBe(false);
  });
});
