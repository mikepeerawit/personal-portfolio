import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();
    console.log("Received form submission:", { name, email });

    try {
      const info = await sendContactEmail({ name, email, message });
      console.log("Message sent: %s", info.messageId);
      return NextResponse.json({ success: true });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      return NextResponse.json(
        { error: "Failed to send email: " + (emailError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to process request: " + (error as Error).message },
      { status: 500 }
    );
  }
}
