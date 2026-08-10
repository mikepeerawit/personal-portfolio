import { NextResponse } from "next/server";
import { submitContactMessage } from "@/lib/contact-message";
import { sendEmail } from "@/lib/mailer";
import { classifySolicitation } from "@/lib/solicitation";

const SEND_FAILED_MESSAGE =
  "Something went wrong sending your message. Please try again later.";

export async function POST(req: Request) {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body.", fieldErrors: {} },
      { status: 400 }
    );
  }

  const result = await submitContactMessage(
    raw,
    sendEmail,
    classifySolicitation
  );

  if (result.ok) {
    return NextResponse.json({ success: true });
  }

  if (result.kind === "invalid") {
    return NextResponse.json(
      { error: "Please check the form and try again.", fieldErrors: result.fieldErrors },
      { status: 400 }
    );
  }

  console.error("Contact message send failed:", result.cause);
  return NextResponse.json({ error: SEND_FAILED_MESSAGE }, { status: 500 });
}
