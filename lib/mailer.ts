import nodemailer from "nodemailer";
import type { SendEmail } from "@/lib/contact-message";

// Configuration is read and validated once, at module load, so a
// misconfigured deployment fails on startup rather than on someone's
// first real submission.
const user = process.env.EMAIL_USER;
const password = process.env.EMAIL_PASSWORD;

if (!user || !password) {
  throw new Error(
    "Missing email configuration: EMAIL_USER and EMAIL_PASSWORD must be set"
  );
}

const recipient = process.env.EMAIL_RECIPIENT || user;

const transporter = nodemailer.createTransport({
  service: "zoho",
  auth: { user, pass: password },
});

export const sendEmail: SendEmail = async ({ subject, text, replyTo }) => {
  // `from` stays the authenticated account. Putting the visitor's address there
  // would be forging the sending domain — it fails SPF and DKIM alignment at
  // the receiving end, which is the opposite of what issue #37 is about.
  // `replyTo` is the header that exists for exactly this: mail sent by one
  // party on behalf of another.
  await transporter.sendMail({
    from: user,
    to: recipient,
    replyTo,
    subject,
    text,
  });
};
