import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Everything this module does, it does at import: it reads the environment,
// decides whether the deployment is configured at all, and builds one
// transport. So every case here loads the module fresh under a chosen
// environment rather than calling a function — `vi.resetModules()` plus a
// dynamic import is the only way to observe load-time behaviour more than once.
const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn();
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});

// The transport is the one thing here that would otherwise reach the network.
// Mocking nodemailer is what lets the rest be asserted exactly.
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const ENV_KEYS = ["EMAIL_USER", "EMAIL_PASSWORD", "EMAIL_RECIPIENT"] as const;

type Environment = { user?: string; password?: string; recipient?: string };

let saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

// process.env is edited directly and restored rather than stubbed, because a
// case has to be able to observe a variable that is *absent*, not one set to
// the empty string — the difference between the two is a behaviour below.
function apply({ user, password, recipient }: Environment) {
  const values = {
    EMAIL_USER: user,
    EMAIL_PASSWORD: password,
    EMAIL_RECIPIENT: recipient,
  };

  for (const key of ENV_KEYS) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function loadMailer(environment: Environment) {
  apply(environment);
  return import("./mailer");
}

// A configured deployment, for the cases that are about something else.
const CONFIGURED: Environment = {
  user: "owner@example.com",
  password: "an-app-password",
};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  vi.resetModules();
  createTransport.mockClear();
  sendMail.mockReset();
  sendMail.mockResolvedValue(undefined);
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("a deployment missing its email configuration", () => {
  // The throw is the point: it fires when the module loads, which on a server
  // is startup, rather than on the first visitor who tries to send a message.
  it("fails to load when EMAIL_USER is absent", async () => {
    await expect(
      loadMailer({ password: "an-app-password" })
    ).rejects.toThrow("Missing email configuration");
  });

  it("fails to load when EMAIL_PASSWORD is absent", async () => {
    await expect(
      loadMailer({ user: "owner@example.com" })
    ).rejects.toThrow("Missing email configuration");
  });

  it("names both variables, so the fix does not need a code read", async () => {
    await expect(loadMailer({})).rejects.toThrow(
      /EMAIL_USER and EMAIL_PASSWORD/
    );
  });

  it("builds no transport at all", async () => {
    await expect(loadMailer({})).rejects.toThrow();

    // Not merely unused: never constructed. A transport built from half a
    // configuration is one that fails later, at send time, which is the
    // failure mode the load-time throw exists to prevent.
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("treats an empty password as missing rather than as a password", async () => {
    // A variable set to "" is the shape a half-filled deployment dashboard
    // produces. It is not a credential, and it must not reach the transport.
    await expect(
      loadMailer({ user: "owner@example.com", password: "" })
    ).rejects.toThrow("Missing email configuration");
  });
});

describe("the transport", () => {
  it("is built from the credentials in the environment", async () => {
    await loadMailer(CONFIGURED);

    expect(createTransport).toHaveBeenCalledWith({
      service: "zoho",
      auth: { user: "owner@example.com", pass: "an-app-password" },
    });
  });

  it("is built once, at load, not once per message", async () => {
    const { sendEmail } = await loadMailer(CONFIGURED);

    await sendEmail({ subject: "one", text: "first" });
    await sendEmail({ subject: "two", text: "second" });

    // Two messages, one transport: the connection is reused. Rebuilding it per
    // send would re-authenticate on every submission.
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});

describe("the recipient", () => {
  it("is EMAIL_RECIPIENT when one is configured", async () => {
    const { sendEmail } = await loadMailer({
      ...CONFIGURED,
      recipient: "inbox@example.com",
    });

    await sendEmail({ subject: "Portfolio Contact Form", text: "body" });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "inbox@example.com" })
    );
  });

  it("falls back to the sending account when none is configured", async () => {
    // The common deployment: one mailbox, both sending and receiving. It is a
    // supported configuration, not an oversight, so it gets a test.
    const { sendEmail } = await loadMailer(CONFIGURED);

    await sendEmail({ subject: "Portfolio Contact Form", text: "body" });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@example.com" })
    );
  });

  it("falls back when EMAIL_RECIPIENT is set to an empty string", async () => {
    // `||` rather than `??`, deliberately: an empty string is a variable
    // someone cleared, and delivering to "" would silently drop every message.
    const { sendEmail } = await loadMailer({ ...CONFIGURED, recipient: "" });

    await sendEmail({ subject: "Portfolio Contact Form", text: "body" });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@example.com" })
    );
  });
});

describe("sending a rendered email", () => {
  it("hands the subject and text to the transport unchanged", async () => {
    const { sendEmail } = await loadMailer(CONFIGURED);

    // Shaped like what renderContactEmail actually produces, so the assertion
    // fails if this module ever starts editing what it was given.
    const email = {
      subject: "Portfolio Contact Form: Message from Ada Lovelace",
      text: "Name: Ada Lovelace\nEmail: ada@example.com\n\nMessage:\nHello.\n",
    };

    await sendEmail(email);

    expect(sendMail).toHaveBeenCalledWith({
      from: "owner@example.com",
      to: "owner@example.com",
      subject: email.subject,
      text: email.text,
    });
  });

  it("sends no HTML body", async () => {
    const { sendEmail } = await loadMailer(CONFIGURED);

    await sendEmail({
      subject: "Message from <img src=x onerror=alert(1)>",
      text: "A message containing <b>markup</b> & an ampersand.",
    });

    // ADR-0001 removed an HTML body that interpolated submitter input
    // unescaped. Text-only is what keeps it removed: with no html field there
    // is nothing for a mail client to render, whatever the submitter typed.
    const [sent] = sendMail.mock.calls[0] as [Record<string, unknown>];
    expect(sent).not.toHaveProperty("html");
    expect(sent.text).toBe("A message containing <b>markup</b> & an ampersand.");
  });

  it("lets a transport failure reach the caller", async () => {
    const { sendEmail } = await loadMailer(CONFIGURED);
    const rejection = new Error("535 authentication failed");
    sendMail.mockRejectedValue(rejection);

    // submitContactMessage turns a thrown cause into a send-failed result, and
    // the route logs it. Swallowing it here would report a message as sent
    // that nobody received.
    await expect(
      sendEmail({ subject: "Portfolio Contact Form", text: "body" })
    ).rejects.toBe(rejection);
  });

  it("resolves with nothing when the transport accepts the message", async () => {
    const { sendEmail } = await loadMailer(CONFIGURED);

    // SendEmail promises void. Returning the transport's own response would
    // put nodemailer's shape into the contact pipeline's contract.
    sendMail.mockResolvedValue({ messageId: "<abc@zoho>", accepted: ["x"] });

    await expect(
      sendEmail({ subject: "Portfolio Contact Form", text: "body" })
    ).resolves.toBeUndefined();
  });
});
