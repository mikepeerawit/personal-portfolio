"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AnimatedSection from "@/components/animated-section";
import { parseContactMessage, type FieldErrors } from "@/lib/contact-message";

const FieldError = ({ id, message }: { id: string; message?: string }) => {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-red-500">
      {message}
    </p>
  );
};

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
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.value),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: "success",
          message: "Message sent successfully!",
        });
        form.reset();
        return;
      }

      // The server validates independently; if it disagrees with us, show
      // its errors against the fields rather than as one opaque string.
      if (data?.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        setFieldErrors(data.fieldErrors as FieldErrors);
        return;
      }

      setSubmitStatus({
        type: "error",
        message: data?.error ?? "An unexpected error occurred.",
      });
    } catch {
      setSubmitStatus({
        type: "error",
        message:
          "Couldn't reach the server. Please try again, or email me directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatedSection id="contact" className="scroll-mt-20 pt-4">
      <h2 className="text-2xl font-semibold tracking-tight mb-6">Contact</h2>
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
    </AnimatedSection>
  );
};

export default ContactForm;
