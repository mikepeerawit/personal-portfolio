// The contact wire: the one place the shape exchanged between the API route
// and the contact form is written down. The route encodes a SubmitResult with
// `toResponse`; the form decodes what comes back with `fromResponse`. Neither
// side infers an outcome from the status code or from which fields happen to
// be present, which is what they used to do — the same three outcomes were
// spelled out in three places and only one of them was typed.
//
// Transport-free on purpose: nothing here fetches. The form owns the request,
// this owns the shape. That keeps the module importable from both runtimes and
// testable with no transport at all.

import type { ContactMessage, FieldErrors, SubmitResult } from "@/lib/contact-message";

export type WireBody =
  | { kind: "sent" }
  | { kind: "invalid"; fieldErrors: FieldErrors }
  | { kind: "challenge-failed" }
  | { kind: "send-failed" }
  | { kind: "malformed" };

export type WireResponse = { status: number; body: WireBody };

// What the browser has to go on. The server reports the five wire kinds; a
// sixth is reachable without the server saying anything at all — see NO_ANSWER.
export type SubmissionReport = WireBody | { kind: "no-answer" };

// The browser has no usable answer: the request never got one, or what came
// back could not be decoded. Not an outcome of submitting — nobody knows
// whether the Contact Message was sent, and the visitor is told exactly that.
export const NO_ANSWER = { kind: "no-answer" } as const;

// Not an outcome of submitting either: nothing was ever parsed into a Contact
// Message. It is a fixed response rather than a `toResponse` case because there
// is no SubmitResult that describes it.
export const MALFORMED_REQUEST: WireResponse = {
  status: 400,
  body: { kind: "malformed" },
};

// The fields a decoded error can name. Typed against ContactMessage so that
// adding a field to a Contact Message is a compile error here rather than a
// field error the form silently declines to render.
const RENDERABLE_FIELDS: Record<keyof ContactMessage, true> = {
  name: true,
  email: true,
  message: true,
};

export function toResponse(result: SubmitResult): WireResponse {
  if (result.ok) return { status: 200, body: { kind: "sent" } };

  switch (result.kind) {
    case "invalid":
      return {
        status: 400,
        body: { kind: "invalid", fieldErrors: result.fieldErrors },
      };

    // 403 rather than 400: the message was well-formed, and what was refused
    // was the sender rather than anything they typed. Nothing is echoed back —
    // a failed Challenge has no per-field cause and the token is not repeated.
    case "challenge-failed":
      return { status: 403, body: { kind: "challenge-failed" } };

    // `cause` is dropped here rather than at the call site: it is logged on the
    // server and never returned to the browser, and the surest way to keep it
    // that way is to leave the encoder no way to carry it.
    case "send-failed":
      return { status: 500, body: { kind: "send-failed" } };

    // A new SubmitResult kind is a compile error here rather than an outcome
    // quietly reported to the browser as a send failure — and logged nowhere,
    // since the route only logs the send-failed case.
    default:
      result satisfies never;
      return { status: 500, body: { kind: "send-failed" } };
  }
}

function isFieldErrors(value: unknown): value is FieldErrors {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const entries = Object.entries(value);

  // Vacuously true on `{}`, which is why this is checked separately: an empty
  // map decodes as a usable `invalid`, and the form would then clear the errors
  // it has, show no status, and leave the visitor looking at a form that did
  // nothing. Every other unusable body degrades to NO_ANSWER; so does this one.
  if (entries.length === 0) return false;

  return entries.every(
    ([field, message]) =>
      Object.hasOwn(RENDERABLE_FIELDS, field) && typeof message === "string"
  );
}

export async function fromResponse(
  response: Response
): Promise<SubmissionReport> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    // A body that is not JSON at all: a platform error page, or a crash before
    // the handler ran. The server was reached; the answer is still unusable.
    return NO_ANSWER;
  }

  if (typeof body !== "object" || body === null) return NO_ANSWER;

  const { kind, fieldErrors } = body as {
    kind?: unknown;
    fieldErrors?: unknown;
  };

  // Every report is rebuilt here rather than handed back as parsed, so nothing
  // a hostile or newer server put in the body travels on into the form.
  switch (kind) {
    case "sent":
      return { kind: "sent" };
    case "send-failed":
      return { kind: "send-failed" };
    case "challenge-failed":
      return { kind: "challenge-failed" };
    case "malformed":
      return { kind: "malformed" };
    case "invalid":
      return isFieldErrors(fieldErrors)
        ? { kind: "invalid", fieldErrors }
        : NO_ANSWER;
    default:
      return NO_ANSWER;
  }
}
