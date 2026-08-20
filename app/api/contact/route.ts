import { NextResponse } from "next/server";
import { submitContactMessage } from "@/lib/contact-message";
import { MALFORMED_REQUEST, toResponse } from "@/lib/contact-wire";
import { sendEmail } from "@/lib/mailer";
import { classifySolicitation } from "@/lib/solicitation";

export async function POST(req: Request) {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(MALFORMED_REQUEST.body, {
      status: MALFORMED_REQUEST.status,
    });
  }

  const result = await submitContactMessage(
    raw,
    sendEmail,
    classifySolicitation
  );

  // The cause is logged here and goes no further; `toResponse` has no way to
  // put it on the wire.
  if (!result.ok && result.kind === "send-failed") {
    console.error("Contact message send failed:", result.cause);
  }

  const { status, body } = toResponse(result);
  return NextResponse.json(body, { status });
}
