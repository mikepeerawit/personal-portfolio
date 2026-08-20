import { describe, expect, it } from "vitest";
import {
  MALFORMED_REQUEST,
  NO_ANSWER,
  fromResponse,
  toResponse,
} from "@/lib/contact-wire";

// The seam: what the route puts on the wire and what the form takes off it.
// Every case round-trips through a real `Response` — JSON.stringify and
// response.json() included — because serialisation is the step where a shape
// held by hand on both sides used to be able to drift.
async function roundTrip(wire: { status: number; body: unknown }) {
  return fromResponse(
    new Response(JSON.stringify(wire.body), { status: wire.status })
  );
}

describe("a sent Contact Message", () => {
  it("survives the round trip", async () => {
    const wire = toResponse({ ok: true });

    expect(wire.status).toBe(200);
    await expect(roundTrip(wire)).resolves.toEqual({ kind: "sent" });
  });
});

describe("an invalid Contact Message", () => {
  it("carries its per-field errors across", async () => {
    const fieldErrors = { email: "That doesn't look like an email address." };
    const wire = toResponse({ ok: false, kind: "invalid", fieldErrors });

    expect(wire.status).toBe(400);
    await expect(roundTrip(wire)).resolves.toEqual({
      kind: "invalid",
      fieldErrors,
    });
  });
});

describe("a send-failed Contact Message", () => {
  it("reports the failure without the cause", async () => {
    const cause = new Error("SMTP said no — 535 authentication failed");
    const wire = toResponse({ ok: false, kind: "send-failed", cause });

    expect(wire.status).toBe(500);
    await expect(roundTrip(wire)).resolves.toEqual({ kind: "send-failed" });
  });

  it("puts nothing about the cause on the wire at all", () => {
    const cause = new Error("SMTP said no — 535 authentication failed");
    const wire = toResponse({ ok: false, kind: "send-failed", cause });

    // Not just absent from the decoded report: absent from the bytes. The
    // cause is logged on the server and never returned to the browser.
    expect(JSON.stringify(wire.body)).not.toContain("535");
    expect(JSON.stringify(wire.body)).not.toContain("SMTP");
  });
});

describe("a request body that isn't JSON", () => {
  it("travels in the same envelope as every other outcome", async () => {
    // The form always sends JSON, so this is the path direct callers and bots
    // take. It gets a `kind` like everything else so the decoder has one shape
    // to handle, not a bespoke second one.
    expect(MALFORMED_REQUEST.status).toBe(400);
    await expect(roundTrip(MALFORMED_REQUEST)).resolves.toEqual({
      kind: "malformed",
    });
  });
});

describe("a response the browser cannot use", () => {
  // All of these leave the visitor in one situation: nobody can tell them
  // whether the message got through. One case, because it is one behaviour.
  it("reports no-answer for a body that isn't JSON", async () => {
    const gateway = new Response("<html>502 Bad Gateway</html>", {
      status: 502,
    });

    await expect(fromResponse(gateway)).resolves.toEqual({ kind: "no-answer" });
  });

  it("reports no-answer for a kind it does not recognise", async () => {
    const future = new Response(JSON.stringify({ kind: "quarantined" }), {
      status: 200,
    });

    await expect(fromResponse(future)).resolves.toEqual({ kind: "no-answer" });
  });

  it("reports no-answer for field errors it could not render", async () => {
    const bad = new Response(
      JSON.stringify({ kind: "invalid", fieldErrors: { email: 42 } }),
      { status: 400 }
    );

    await expect(fromResponse(bad)).resolves.toEqual({ kind: "no-answer" });
  });

  it("reports no-answer for field errors naming a field that isn't one", async () => {
    const bad = new Response(
      JSON.stringify({ kind: "invalid", fieldErrors: { phone: "Required." } }),
      { status: 400 }
    );

    await expect(fromResponse(bad)).resolves.toEqual({ kind: "no-answer" });
  });

  it("offers the same report for a request that never got an answer", () => {
    // The form owns `fetch`, so a rejected fetch is the one no-answer it has
    // to raise itself. It takes the value from here rather than building one.
    expect(NO_ANSWER).toEqual({ kind: "no-answer" });
  });
});

describe("the status code", () => {
  it("is not what the browser reasons from", async () => {
    // Status codes stay meaningful for curl, logs and platform monitoring, but
    // the decoder reads `kind` alone — inferring an outcome from `response.ok`
    // plus the presence of a field is the drift this module exists to remove.
    const mislabelled = new Response(JSON.stringify({ kind: "sent" }), {
      status: 500,
    });

    await expect(fromResponse(mislabelled)).resolves.toEqual({ kind: "sent" });
  });
});

describe("an invalid report with nothing to show", () => {
  it("reports no-answer rather than a silent form", async () => {
    // `{}` passes a per-entry check vacuously. Decoded as a usable `invalid`,
    // it clears the errors, shows no status, and leaves the visitor looking at
    // a form that did nothing — the one unusable body that would not degrade.
    const empty = new Response(
      JSON.stringify({ kind: "invalid", fieldErrors: {} }),
      { status: 400 }
    );

    await expect(fromResponse(empty)).resolves.toEqual({ kind: "no-answer" });
  });
});
