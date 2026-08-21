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

// Google Workspace, because the site's domain already receives there. Sending
// from the same Workspace the mail is delivered to makes this internal mail,
// aligned to SPF and DKIM by construction rather than exempted from them by a
// filter. Changing this away from the domain's own mail provider re-opens the
// exposure ADR-0008 closed.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass: password },
});

export const sendEmail: SendEmail = async ({ subject, text, replyTo }) => {
  // `from` is the authenticated account and never the submitter. A stranger's
  // address there would forge the sending domain, fail DMARC alignment, and
  // undo the whole point of sending from this account; Reply-To carries them
  // instead.
  await transporter.sendMail({ from: user, to: recipient, subject, text, replyTo });
};
