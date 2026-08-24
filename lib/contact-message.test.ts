import { describe, expect, it } from "vitest";
import {
  parseContactMessage,
  submitContactMessage,
  type OutgoingEmail,
  type Verify,
} from "./contact-message";

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "I'd like to talk about a project.",
};

// A recording fake standing in for the mail transport — the only adapter the
// tests need at the send seam.
function recordingSender() {
  const sent: OutgoingEmail[] = [];
  return {
    sent,
    send: async (email: OutgoingEmail) => {
      sent.push(email);
    },
  };
}

function failingSender(cause: unknown) {
  return async () => {
    throw cause;
  };
}

// Stubs at the verify seam, mirroring the fakes at the send seam. Whether a
// token is genuine is Cloudflare's to answer; here the verdict is dictated so
// the tests are about what submitting does with it — and so no test needs a
// network.
const challengePassed: Verify = async () => true;
const challengeFailed: Verify = async () => false;

describe("parseContactMessage", () => {
  it("accepts a well-formed message", () => {
    const result = parseContactMessage(valid);
    expect(result).toEqual({ ok: true, value: valid });
  });

  it("trims surrounding whitespace but preserves newlines in the message", () => {
    const result = parseContactMessage({
      name: "  Ada  ",
      email: "  ada@example.com  ",
      message: "  first line\nsecond line  ",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        name: "Ada",
        email: "ada@example.com",
        message: "first line\nsecond line",
      },
    });
  });

  it("reports every empty field at once", () => {
    const result = parseContactMessage({ name: "", email: "", message: "" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "email",
      "message",
      "name",
    ]);
  });

  it("treats whitespace-only fields as empty", () => {
    const result = parseContactMessage({ ...valid, name: "   " });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.name).toBeDefined();
  });

  it.each([null, undefined, "a string", 42, []])(
    "rejects non-object input: %s",
    (raw) => {
      const result = parseContactMessage(raw);
      expect(result.ok).toBe(false);
    }
  );

  it("rejects non-string field values", () => {
    const result = parseContactMessage({ ...valid, message: { evil: true } });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.message).toBeDefined();
  });

  it("rejects control characters in the name, which reaches the Subject header", () => {
    const result = parseContactMessage({
      ...valid,
      name: "Ada\r\nBcc: someone@example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.name).toBeDefined();
  });

  it("rejects a name over 100 characters", () => {
    const result = parseContactMessage({ ...valid, name: "a".repeat(101) });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.name).toBeDefined();
  });

  it.each(["nope", "no-at-sign.com", "missing@domain", "two @spaces.com"])(
    "rejects implausible email: %s",
    (email) => {
      const result = parseContactMessage({ ...valid, email });
      expect(result.ok).toBe(false);
    }
  );

  it.each(["a+tag@example.co.uk", "first.last@sub.domain.io"])(
    "accepts plausible email: %s",
    (email) => {
      const result = parseContactMessage({ ...valid, email });
      expect(result.ok).toBe(true);
    }
  );

  it("rejects a message under 10 characters", () => {
    const result = parseContactMessage({ ...valid, message: "hi" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.message).toBeDefined();
  });

  it("rejects a message over 2000 characters", () => {
    const result = parseContactMessage({ ...valid, message: "a".repeat(2001) });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.message).toBeDefined();
  });

  it("accepts an ordinary short English message", () => {
    const result = parseContactMessage({
      ...valid,
      message: "Hi, are you free for freelance work?",
    });

    expect(result.ok).toBe(true);
  });

  it("holds a single short word to the 10-character floor", () => {
    const result = parseContactMessage({ ...valid, message: "hello" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.message).toBe("Please write at least 10 characters.");
  });
});

describe("submitContactMessage", () => {
  it("sends a text email carrying every field", async () => {
    const sender = recordingSender();
    const result = await submitContactMessage(valid, sender.send, challengePassed);

    expect(result).toEqual({ ok: true });
    expect(sender.sent).toHaveLength(1);

    const [email] = sender.sent;
    expect(email.subject).toBe(
      "Portfolio Contact Form: Message from Ada Lovelace"
    );
    expect(email.text).toContain(valid.name);
    expect(email.text).toContain(valid.email);
    expect(email.text).toContain(valid.message);
  });

  it("produces no HTML body, so nothing needs escaping", async () => {
    const sender = recordingSender();
    await submitContactMessage(
      { ...valid, message: "<script>alert(1)</script> hello there" },
      sender.send,
      challengePassed
    );

    const [email] = sender.sent;
    expect(email).not.toHaveProperty("html");
    expect(email.text).toContain("<script>alert(1)</script>");
  });

  it("does not send when the message is invalid", async () => {
    const sender = recordingSender();
    const result = await submitContactMessage(
      { ...valid, email: "" },
      sender.send,
      challengePassed
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("invalid");
    expect(sender.sent).toHaveLength(0);
  });

  it("reports a send failure without throwing", async () => {
    const cause = new Error("535 authentication failed");
    const result = await submitContactMessage(
      valid,
      failingSender(cause),
      challengePassed
    );

    expect(result).toEqual({ ok: false, kind: "send-failed", cause });
  });

  it("distinguishes invalid input from send failure", async () => {
    const invalid = await submitContactMessage(
      {},
      recordingSender().send,
      challengePassed
    );
    const failed = await submitContactMessage(
      valid,
      failingSender(new Error("boom")),
      challengePassed
    );

    expect(invalid.ok).toBe(false);
    expect(failed.ok).toBe(false);
    if (invalid.ok || failed.ok) return;
    expect(invalid.kind).not.toBe(failed.kind);
  });

  it("refuses a message whose Challenge did not pass", async () => {
    const sender = recordingSender();
    const result = await submitContactMessage(valid, sender.send, challengeFailed);

    expect(result).toEqual({ ok: false, kind: "challenge-failed" });

    // Nothing is sent. This is the whole point of the Challenge: a submission
    // that cannot prove a human made it never becomes an email at all.
    expect(sender.sent).toHaveLength(0);
  });

  it("hands the token to the verifier and nothing else", async () => {
    const seen: (string | undefined)[] = [];
    const recordingVerifier: Verify = async (token) => {
      seen.push(token);
      return true;
    };

    await submitContactMessage(valid, recordingSender().send, recordingVerifier, "a-token");

    expect(seen).toEqual(["a-token"]);
  });

  it("treats a missing token as a failed Challenge", async () => {
    const sender = recordingSender();

    // What a direct POST at /api/contact sends, and what a browser with the
    // widget blocked sends. The verifier decides; submitting does not shortcut
    // it, so there is exactly one place that rule lives.
    const result = await submitContactMessage(
      valid,
      sender.send,
      async (token) => token !== undefined,
      undefined
    );

    expect(result).toEqual({ ok: false, kind: "challenge-failed" });
    expect(sender.sent).toHaveLength(0);
  });

  it("does not spend a Challenge on a message it never accepted", async () => {
    const sender = recordingSender();
    let verified = 0;

    // Validation is local and free; verifying is a round trip to Cloudflare
    // and burns a single-use token. Invalid input must not reach it.
    await submitContactMessage({ ...valid, email: "" }, sender.send, async () => {
      verified += 1;
      return true;
    });

    expect(verified).toBe(0);
  });

  it("distinguishes a failed Challenge from a send failure", async () => {
    const challenge = await submitContactMessage(
      valid,
      recordingSender().send,
      challengeFailed
    );
    const failed = await submitContactMessage(
      valid,
      failingSender(new Error("boom")),
      challengePassed
    );

    expect(challenge.ok).toBe(false);
    expect(failed.ok).toBe(false);
    if (challenge.ok || failed.ok) return;

    // The form words them differently: one is "try again", the other is
    // "something broke at our end".
    expect(challenge.kind).not.toBe(failed.kind);
  });
});
