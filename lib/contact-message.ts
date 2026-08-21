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

// `replyTo` is required because every email this module produces is a Contact
// Message and every Contact Message has an address to reply to.
// `renderContactEmail` is the only producer, so an optional field here would
// describe a message nothing can construct.
export type OutgoingEmail = {
  subject: string;
  text: string;
  replyTo: string;
};

export type SendEmail = (email: OutgoingEmail) => Promise<void>;

// Whether a message is a Solicitation is a property of the message, not a
// fourth outcome of submitting: a Solicitation is still sent. The verdict
// arrives the same way the mail transport does, so the rules behind it stay
// out of the browser bundle — see `lib/solicitation.ts`.
export type Classification = "ordinary" | "solicitation";

export type Classify = (message: ContactMessage) => Classification;

const SOLICITATION_PREFIX = "[Solicitation] ";

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

// Deliberately loose: the address only has to be plausible enough to reply to.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The name goes into the Subject header, so control characters are rejected
// rather than relying on the transport to strip them.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

// A Gibberish Submission: one unbroken run of ASCII letters and digits is not
// prose in any Latin-script language, and it is the shape roughly half the
// spam this form receives arrives in. Publishing this rule to the browser is
// safe — complying with it means writing a real message.
//
// The ASCII range is load-bearing, not incidental precision. Thai, Chinese and
// Japanese do not delimit words with spaces, so a genuine enquiry written in
// one of them is also a single run of characters with no whitespace; anchoring
// to ASCII exempts every such script by construction. Do not simplify this to
// "contains no whitespace" — that rejects a Thai speaker for writing Thai.
// See ADR-0005.
const GIBBERISH_MESSAGE = /^[A-Za-z0-9]+$/;

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
  } else if (GIBBERISH_MESSAGE.test(message)) {
    fieldErrors.message =
      "That doesn't look like a message — please write a sentence or two.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { name, email, message } };
}

export function renderContactEmail(
  { name, email, message }: ContactMessage,
  classification: Classification
): OutgoingEmail {
  // The prefix goes ahead of the existing subject rather than replacing it, so
  // an ordinary message's subject is byte-for-byte what it has always been and
  // a mailbox filter matching the old text still matches a marked message.
  const mark = classification === "solicitation" ? SOLICITATION_PREFIX : "";

  // The submitter's address goes in Reply-To, never in From: From is the
  // authenticated account, and a stranger's address there would forge the
  // sending domain and fail the SPF and DKIM alignment ADR-0008 buys. Reply-To
  // is unauthenticated by design, so it costs that alignment nothing.
  //
  // It stays in the body as well. The body line is the record if a client
  // strips the header, and mailbox searches already match on it.
  return {
    subject: `${mark}Portfolio Contact Form: Message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`,
    replyTo: email,
  };
}

export async function submitContactMessage(
  raw: unknown,
  send: SendEmail,
  classify: Classify
): Promise<SubmitResult> {
  const parsed = parseContactMessage(raw);

  if (!parsed.ok) {
    return { ok: false, kind: "invalid", fieldErrors: parsed.fieldErrors };
  }

  // Nothing is logged here: the subject prefix is the record, and it lives in
  // a mailbox the owner controls. Logging verdicts would reintroduce the
  // submitter-data logging ADR-0001 removed.
  try {
    await send(renderContactEmail(parsed.value, classify(parsed.value)));
  } catch (cause) {
    return { ok: false, kind: "send-failed", cause };
  }

  return { ok: true };
}
