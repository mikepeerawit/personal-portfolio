import { describe, expect, it } from "vitest";
import {
  parseContactMessage,
  submitContactMessage,
  type Classify,
  type OutgoingEmail,
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

// Stubs at the classify seam, mirroring the fakes at the send seam. The real
// scoring rules are tested as a pure function in solicitation.test.ts; here
// the verdict is dictated so the tests are about what submitting does with it.
const asOrdinary: Classify = () => "ordinary";
const asSolicitation: Classify = () => "solicitation";

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

  // A Gibberish Submission — the shape roughly half the spam this form
  // receives arrives in. These are the payloads observed in the mailbox.
  it.each(["CkqxyhpzjWmVgKGekjoRJgW", "GpanMFTPvfemgdRaqwertyuiop"])(
    "rejects a gibberish message: %s",
    (message) => {
      const result = parseContactMessage({ ...valid, message });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.fieldErrors.message).toBeDefined();
    }
  );

  it("names the fix when rejecting gibberish rather than reporting a generic failure", () => {
    const result = parseContactMessage({
      ...valid,
      message: "CkqxyhpzjWmVgKGekjoRJgW",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.message).toBe(
      "That doesn't look like a message — please write a sentence or two."
    );
  });

  // The script guard, and the test most likely to be broken by a future
  // simplification of the gibberish rule. Thai does not delimit words with
  // spaces, so a genuine Thai enquiry is a single run of characters with no
  // whitespace — exactly the shape the gibberish rule rejects. The rule is
  // anchored to ASCII so that writing in Thai is never grounds for rejection.
  // If this test fails, the guard has been removed: restore it, do not
  // update the test.
  it("accepts a Thai-script message with no whitespace", () => {
    const result = parseContactMessage({
      ...valid,
      message: "สวัสดีครับผมสนใจอยากคุยเรื่องงานกับคุณ",
    });

    expect(result.ok).toBe(true);
  });

  it.each([
    ["Chinese", "你好我想和你討論一個專案的合作機會"],
    ["Japanese", "こんにちは仕事のご相談をさせていただきたいです"],
  ])("accepts a %s message with no whitespace, for the same reason", (_script, message) => {
    const result = parseContactMessage({ ...valid, message });

    expect(result.ok).toBe(true);
  });

  it("accepts an ordinary short English message", () => {
    const result = parseContactMessage({
      ...valid,
      message: "Hi, are you free for freelance work?",
    });

    expect(result.ok).toBe(true);
  });

  it("leaves a single short word to the 10-character floor, not the gibberish rule", () => {
    const result = parseContactMessage({ ...valid, message: "hello" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.message).toBe("Please write at least 10 characters.");
  });
});

describe("submitContactMessage", () => {
  it("sends a text email carrying every field", async () => {
    const sender = recordingSender();
    const result = await submitContactMessage(valid, sender.send, asOrdinary);

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

  it("sets Reply-To to the submitter, so replying is one click", async () => {
    const sender = recordingSender();
    await submitContactMessage(valid, sender.send, asOrdinary);

    const [email] = sender.sent;
    expect(email.replyTo).toBe(valid.email);

    // Still in the body too: the header is what a mail client acts on, the
    // body line is what survives a client that strips it.
    expect(email.text).toContain(valid.email);
  });

  it("sets Reply-To on a Solicitation as well", async () => {
    const sender = recordingSender();
    await submitContactMessage(valid, sender.send, asSolicitation);

    // Marking is a property of the message, not a downgrade of it: ADR-0005
    // delivers a Solicitation intact, and a mis-marked genuine enquiry has to
    // stay as replyable as any other.
    expect(sender.sent[0].replyTo).toBe(valid.email);
  });

  it("produces no HTML body, so nothing needs escaping", async () => {
    const sender = recordingSender();
    await submitContactMessage(
      { ...valid, message: "<script>alert(1)</script> hello there" },
      sender.send,
      asOrdinary
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
      asOrdinary
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
      asOrdinary
    );

    expect(result).toEqual({ ok: false, kind: "send-failed", cause });
  });

  it("distinguishes invalid input from send failure", async () => {
    const invalid = await submitContactMessage(
      {},
      recordingSender().send,
      asOrdinary
    );
    const failed = await submitContactMessage(
      valid,
      failingSender(new Error("boom")),
      asOrdinary
    );

    expect(invalid.ok).toBe(false);
    expect(failed.ok).toBe(false);
    if (invalid.ok || failed.ok) return;
    expect(invalid.kind).not.toBe(failed.kind);
  });

  it("sends a Solicitation rather than rejecting it", async () => {
    const sender = recordingSender();
    const result = await submitContactMessage(
      valid,
      sender.send,
      asSolicitation
    );

    expect(result).toEqual({ ok: true });
    expect(sender.sent).toHaveLength(1);
  });

  it("prefixes a Solicitation's subject ahead of the existing text", async () => {
    const sender = recordingSender();
    await submitContactMessage(valid, sender.send, asSolicitation);

    const [email] = sender.sent;
    expect(email.subject).toBe(
      "[Solicitation] Portfolio Contact Form: Message from Ada Lovelace"
    );
  });

  it("leaves an ordinary subject byte-for-byte unchanged", async () => {
    const ordinary = recordingSender();
    const marked = recordingSender();
    await submitContactMessage(valid, ordinary.send, asOrdinary);
    await submitContactMessage(valid, marked.send, asSolicitation);

    expect(ordinary.sent[0].subject).toBe(
      "Portfolio Contact Form: Message from Ada Lovelace"
    );
    // The mark is exactly the prefix and nothing else — a Gmail filter on the
    // old subject text keeps matching a marked message.
    expect(marked.sent[0].subject).toBe(
      `[Solicitation] ${ordinary.sent[0].subject}`
    );
  });

  it("keeps the mark out of the email body", async () => {
    const ordinary = recordingSender();
    const marked = recordingSender();
    await submitContactMessage(valid, ordinary.send, asOrdinary);
    await submitContactMessage(valid, marked.send, asSolicitation);

    expect(marked.sent[0].text).toBe(ordinary.sent[0].text);
    expect(marked.sent[0].text).not.toContain("Solicitation");
  });

  it("does not classify a message it never accepted", async () => {
    const sender = recordingSender();
    let classified = 0;
    await submitContactMessage({ ...valid, email: "" }, sender.send, () => {
      classified += 1;
      return "ordinary";
    });

    expect(classified).toBe(0);
  });
});
