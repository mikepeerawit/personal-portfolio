import { NextResponse } from "next/server";
import { submitContactMessage } from "@/lib/contact-message";
import { MALFORMED_REQUEST, toResponse } from "@/lib/contact-wire";
import { sendEmail } from "@/lib/mailer";
import { verifyChallenge } from "@/lib/turnstile";

export async function POST(req: Request) {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(MALFORMED_REQUEST.body, {
      status: MALFORMED_REQUEST.status,
    });
  }

  // The Challenge token rides alongside the Contact Message rather than inside
  // it: it is proof about the sender, not one of the three fields a visitor
  // wrote, and CONTEXT.md defines a Contact Message as those three.
  const token =
    typeof raw === "object" && raw !== null
      ? (raw as { token?: unknown }).token
      : undefined;

  const result = await submitContactMessage(
    raw,
    sendEmail,
    verifyChallenge,
    typeof token === "string" ? token : undefined
  );

  // The cause is logged here and goes no further; `toResponse` has no way to
  // put it on the wire.
  if (!result.ok && result.kind === "send-failed") {
    console.error("Contact message send failed:", result.cause);
  }

  const { status, body } = toResponse(result);
  return NextResponse.json(body, { status });
}
