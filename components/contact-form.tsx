"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PageSection from "@/components/page-section";
import {
  parseContactMessage,
  type ContactMessage,
  type FieldErrors,
} from "@/lib/contact-message";
import {
  NO_ANSWER,
  fromResponse,
  type SubmissionReport,
} from "@/lib/contact-wire";
import { section } from "@/lib/page-outline";

const FieldError = ({ id, message }: { id: string; message?: string }) => {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-red-500">
      {message}
    </p>
  );
};

// The form owns every status string it shows. Field errors are the exception
// and deliberately so: they are authored in lib/contact-message.ts, which both
// sides run, so a field is worded identically whichever side rejected it.
const SEND_FAILED =
  "Something went wrong sending your message. Please try again later.";

// Deliberately does not claim the server was unreachable: a bad gateway is
// reached and still unusable. What is true in every no-answer case is that
// nobody can say whether the message got through.
const NO_ANSWER_MESSAGE =
  "Couldn't confirm your message was sent. Please try again, or email me directly.";

// The form owns the request; lib/contact-wire.ts owns the shape. A rejected
// fetch is the one no-answer the form has to raise itself.
async function post(message: ContactMessage): Promise<SubmissionReport> {
  try {
    return await fromResponse(
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      })
    );
  } catch {
    return NO_ANSWER;
  }
}

const ContactForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitStatus({ type: null, message: "" });

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const parsed = parseContactMessage({
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    });

    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const report = await post(parsed.value);

      switch (report.kind) {
        case "sent":
          setSubmitStatus({
            type: "success",
            message: "Message sent successfully!",
          });
          form.reset();
          return;

        // The server validates independently; if it disagrees with us, show
        // its errors against the fields rather than as one opaque string.
        case "invalid":
          setFieldErrors(report.fieldErrors);
          return;

        case "send-failed":
        case "malformed":
          setSubmitStatus({ type: "error", message: SEND_FAILED });
          return;

        case "no-answer":
          setSubmitStatus({ type: "error", message: NO_ANSWER_MESSAGE });
          return;

        // A new kind on the wire is a compile error here, not a submission
        // that silently shows the visitor nothing.
        default:
          report satisfies never;
          return;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageSection section={section.contact}>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm text-muted-foreground">
              Name
            </label>
            <Input
              id="name"
              name="name"
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
              className="border-muted-foreground/20 focus-visible:ring-foreground/20"
            />
            <FieldError id="name-error" message={fieldErrors.name} />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-muted-foreground">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className="border-muted-foreground/20 focus-visible:ring-foreground/20"
            />
            <FieldError id="email-error" message={fieldErrors.email} />
          </div>
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm text-muted-foreground">
              Message
            </label>
            <Textarea
              id="message"
              name="message"
              rows={5}
              required
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={
                fieldErrors.message ? "message-error" : undefined
              }
              className="resize-none border-muted-foreground/20 focus-visible:ring-foreground/20"
            />
            <FieldError id="message-error" message={fieldErrors.message} />
          </div>
        </div>
        {submitStatus.type && (
          <div
            className={`text-sm ${
              submitStatus.type === "success"
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {submitStatus.message}
          </div>
        )}
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="rounded-md px-4 transition-all border-foreground/20 text-foreground/80 hover:text-foreground hover:border-foreground/50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </PageSection>
  );
};

export default ContactForm;
