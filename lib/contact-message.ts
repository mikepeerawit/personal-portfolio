// The Contact Message module: everything it takes to turn untrusted form input
// into a sent email, behind one interface. Imported by both the contact form
// and the API route, so it must stay free of node-only and DOM-only imports —
// the mail transport arrives as the `send` argument.

export type ContactMessage = {
  name: string;
  email: string;
  message: string;
};

export type FieldErrors = Partial<Record<keyof ContactMessage, string>>;

export type ParseResult =
  | { ok: true; value: ContactMessage }
  | { ok: false; fieldErrors: FieldErrors };

export type SubmitResult =
  | { ok: true }
  | { ok: false; kind: "invalid"; fieldErrors: FieldErrors }
  | { ok: false; kind: "challenge-failed" }
  | { ok: false; kind: "send-failed"; cause: unknown };

export type OutgoingEmail = {
  subject: string;
  text: string;
};

export type SendEmail = (email: OutgoingEmail) => Promise<void>;

// A Challenge is passed or it is not, and only Cloudflare can say which. The
// verdict arrives the way the mail transport does, so the secret and the
// network call stay out of the browser bundle — see `lib/turnstile.ts`.
export type Verify = (token: string | undefined) => Promise<boolean>;

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

// Deliberately loose: the address only has to be plausible enough to reply to.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The name goes into the Subject header, so control characters are rejected
// rather than relying on the transport to strip them.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function readField(raw: Record<string, unknown>, field: keyof ContactMessage) {
  const value = raw[field];
  return typeof value === "string" ? value.trim() : "";
}

export function parseContactMessage(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) {
    return {
      ok: false,
      fieldErrors: {
        name: "Please enter your name.",
        email: "Please enter your email address.",
        message: "Please enter a message.",
      },
    };
  }

  const record = raw as Record<string, unknown>;
  const name = readField(record, "name");
  const email = readField(record, "email");
  const message = readField(record, "message");
  const fieldErrors: FieldErrors = {};

  if (name.length === 0) {
    fieldErrors.name = "Please enter your name.";
  } else if (name.length > NAME_MAX) {
    fieldErrors.name = `Please keep your name under ${NAME_MAX} characters.`;
  } else if (CONTROL_CHARACTERS.test(name)) {
    fieldErrors.name = "Please remove any special characters from your name.";
  }

  if (email.length === 0) {
    fieldErrors.email = "Please enter your email address.";
  } else if (email.length > EMAIL_MAX) {
    fieldErrors.email = "That email address is too long.";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "That doesn't look like an email address.";
  }

  if (message.length === 0) {
    fieldErrors.message = "Please enter a message.";
  } else if (message.length < MESSAGE_MIN) {
    fieldErrors.message = `Please write at least ${MESSAGE_MIN} characters.`;
  } else if (message.length > MESSAGE_MAX) {
    fieldErrors.message = `Please keep your message under ${MESSAGE_MAX} characters.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { name, email, message } };
}

export function renderContactEmail({
  name,
  email,
  message,
}: ContactMessage): OutgoingEmail {
  return {
    subject: `Portfolio Contact Form: Message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`,
  };
}

export async function submitContactMessage(
  raw: unknown,
  send: SendEmail,
  verify: Verify,
  token?: string
): Promise<SubmitResult> {
  const parsed = parseContactMessage(raw);

  if (!parsed.ok) {
    return { ok: false, kind: "invalid", fieldErrors: parsed.fieldErrors };
  }

  // Validation runs first because it is local and free: a visitor who mistyped
  // an address sees that against the field without waiting on a round trip to
  // Cloudflare, and a bot that cannot pass the Challenge is refused before
  // anything is sent either way.
  if (!(await verify(token))) {
    return { ok: false, kind: "challenge-failed" };
  }

  // Nothing is logged here — logging submissions is what ADR-0001 removed.
  try {
    await send(renderContactEmail(parsed.value));
  } catch (cause) {
    return { ok: false, kind: "send-failed", cause };
  }

  return { ok: true };
}
