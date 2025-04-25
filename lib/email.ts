import nodemailer from "nodemailer";

type EmailData = {
  name: string;
  email: string;
  message: string;
};

export async function sendContactEmail({ name, email, message }: EmailData) {
  // Validate environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error("Missing email configuration");
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: "zoho",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Email options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_RECIPIENT || process.env.EMAIL_USER,
    subject: `Portfolio Contact Form: Message from ${name}`,
    text: `
      Name: ${name}
      Email: ${email}
      Message: ${message}
    `,
    html: `
      <h3>Portfolio Contact Form Submission</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `,
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);
  return info;
}
