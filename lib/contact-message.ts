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
  | { ok: false; kind: "send-failed"; cause: unknown };

export type OutgoingEmail = {
  subject: string;
  text: string;
};

export type SendEmail = (email: OutgoingEmail) => Promise<void>;

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
  send: SendEmail
): Promise<SubmitResult> {
  const parsed = parseContactMessage(raw);

  if (!parsed.ok) {
    return { ok: false, kind: "invalid", fieldErrors: parsed.fieldErrors };
  }

  try {
    await send(renderContactEmail(parsed.value));
  } catch (cause) {
    return { ok: false, kind: "send-failed", cause };
  }

  return { ok: true };
}
