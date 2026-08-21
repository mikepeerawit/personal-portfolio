"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
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
import {
  NO_TOKEN,
  canSubmit,
  spendsToken,
  type ChallengeToken,
} from "@/lib/challenge-token";
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

// A Challenge that did not pass. Worded for the visitor it will actually
// reach — a person whose token expired while they wrote, or whose browser
// blocked the widget — rather than for the bots it exists to stop. It names
// the way out, because for that visitor there may not be another one.
const CHALLENGE_FAILED =
  "Couldn't verify that you're human. Please try again, or email me directly at me@mikepeerawit.com.";

// Shown when the widget never gets far enough to refuse anyone: the script was
// blocked by an extension or a network filter, or Cloudflare will not render
// for this hostname. Without it the visitor gets a permanently disabled button
// and no explanation — and ADR-0008 promises exactly the opposite, because the
// email address is the only way out for a visitor the Challenge cannot serve.
const CHALLENGE_UNAVAILABLE =
  "The check that proves you're human couldn't load — an extension or network filter may be blocking it. Please email me directly at me@mikepeerawit.com.";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// The widget is rendered explicitly rather than by leaving a `cf-turnstile`
// div for the script to find. Implicit rendering only communicates through a
// hidden input, which means the form cannot tell "no token yet" from "no token
// ever" and submits the empty string in both cases. Rendering it here hands
// back the token as it arrives, and hands back a widget id to reset.
type TurnstileOptions = {
  sitekey: string;
  theme: "dark" | "light" | "auto";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      // Cloudflare returns the widget id, or `undefined` when it will not
      // render at all — most often a sitekey that is not valid for this
      // hostname. Typed honestly, because `undefined` is not `null` and would
      // slip through every guard below.
      render: (
        container: HTMLElement,
        options: TurnstileOptions
      ) => string | undefined;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

// The form owns the request; lib/contact-wire.ts owns the shape. A rejected
// fetch is the one no-answer the form has to raise itself.
async function post(
  message: ContactMessage,
  token: string
): Promise<SubmissionReport> {
  try {
    return await fromResponse(
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The token travels beside the Contact Message, not inside it: it is
        // proof about the sender, not something the visitor wrote.
        body: JSON.stringify({ ...message, token }),
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
  const [challengeToken, setChallengeToken] =
    useState<ChallengeToken>(NO_TOKEN);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Idempotent, because it is called from two places that race: the script's
  // onLoad, and the effect below for the case where the script was already
  // loaded and onLoad will not fire again.
  const render = useCallback(() => {
    if (!SITE_KEY || !widget.current || widgetId.current !== null) return;
    if (!window.turnstile) return;

    const rendered = window.turnstile.render(widget.current, {
      sitekey: SITE_KEY,
      // `dark`, not `auto`: auto follows the visitor's OS preference, and this
      // site is unconditionally dark, so a visitor on a light-mode machine
      // would get a white widget on a black page. If the site ever gains a
      // theme toggle, this has to follow it.
      theme: "dark",
      callback: setChallengeToken,
      // A Turnstile token expires a few minutes after it is issued, which a
      // visitor writing a long message will outlast. Dropping it disables the
      // button until the widget auto-refreshes and issues another, instead of
      // letting them spend a stale one and be told they are not human.
      "expired-callback": () => setChallengeToken(NO_TOKEN),
      "error-callback": () => setChallengeToken(NO_TOKEN),
    });

    if (rendered === undefined) {
      // No widget, so no token is ever coming. Say so now rather than leaving
      // a disabled button to explain itself.
      setSubmitStatus({ type: "error", message: CHALLENGE_UNAVAILABLE });
      return;
    }

    widgetId.current = rendered;
  }, []);

  useEffect(() => {
    render();

    return () => {
      if (widgetId.current === null) return;
      window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [render]);

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

    // The button is disabled without one, so this is unreachable from the UI;
    // it is here because the alternative to narrowing is posting the empty
    // string, which is the bug this whole path exists to prevent.
    if (challengeToken === NO_TOKEN) return;

    setFieldErrors({});
    setIsSubmitting(true);

    // Declared out here so the token can be settled in `finally`, after the
    // visitor has been told what happened. Doing it before the switch let a
    // throwing `reset` take the outcome with it — including a message that had
    // just been sent successfully.
    let report: SubmissionReport | undefined;

    try {
      report = await post(parsed.value, challengeToken);

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

        case "challenge-failed":
          setSubmitStatus({ type: "error", message: CHALLENGE_FAILED });
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

      // A token Cloudflare has already seen will not be accepted again, and
      // the widget has to be asked for another. Only when the attempt actually
      // spent it: an `invalid` answer was decided before verification ran, and
      // throwing that token away is what strands a visitor who mistyped their
      // address with nothing to resubmit with.
      if (report !== undefined && spendsToken(report.kind)) {
        setChallengeToken(NO_TOKEN);

        try {
          if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
        } catch {
          // A widget that will not reset issues no further token, so the button
          // stays disabled — which is correct. The visitor already has their
          // status message, and that is what this must not disturb.
        }
      }
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
        {/* `afterInteractive`, not `lazyOnload`: lazyOnload waits for the load
            event *and* browser idle, so a visitor who fills the form quickly
            reaches the button before there is any token to send. The widget
            gates the button now, so a late script is a disabled button rather
            than a rejected submission — but it is still the difference between
            waiting and not noticing. */}
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={render}
          onError={() =>
            setSubmitStatus({ type: "error", message: CHALLENGE_UNAVAILABLE })
          }
        />
        <div ref={widget} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="rounded-md px-4 transition-all border-foreground/20 text-foreground/80 hover:text-foreground hover:border-foreground/50"
          disabled={!canSubmit(challengeToken, isSubmitting)}
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </PageSection>
  );
};

export default ContactForm;
