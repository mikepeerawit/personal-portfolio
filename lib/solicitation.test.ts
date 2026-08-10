import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { classifySolicitation } from "./solicitation";
import type { ContactMessage } from "./contact-message";

// The cases below are shaped from the real corpus described in issue #11: the
// templated SEO copy that arrived from `jmailservice.com` and its neighbours,
// against the one genuine message the mailbox received in twelve months.
//
// This is the one place tests touch the scoring rules directly, because it is
// a table of cases rather than a behaviour. What submitting *does* with the
// verdict is tested through the seam in contact-message.test.ts.
//
// The corpus's other cluster is absent on purpose: a Gibberish Submission is
// not a valid Contact Message, so it is rejected by parsing and the classifier
// never sees one. Its cases live in contact-message.test.ts.
const pitch =
  "Hi, I noticed your website is not showing up at the top of search results " +
  "for your main keywords. We can get you ranked on the first page within 24 " +
  "hours and drive more traffic to your website. Reply to find out how.";

const marked: Array<[string, ContactMessage]> = [
  [
    "a templated pitch from a known solicitor domain",
    { name: "Gabrielle Simmons", email: "gabrielle@jmailservice.com", message: pitch },
  ],
  [
    "the same pitch from one of the other observed domains",
    { name: "Richard Lawson", email: "richard@dominatingkeywords.com", message: pitch },
  ],
  [
    // A blocklist would fail silently the month they register a new domain;
    // a score keeps working on the copy alone.
    "the same pitch from a domain nobody has seen before",
    { name: "Richard Lawson", email: "richard@brand-new-domain.example", message: pitch },
  ],
  [
    "a short pitch where the link is the deciding signal",
    {
      name: "Dan",
      email: "dan@example.com",
      message: "Get your site to the top of search results — see https://example.com",
    },
  ],
  [
    "a two-line pitch from an unknown domain",
    {
      name: "Kelly",
      email: "kelly@offers.example",
      message: "Get to the top of search results within 24 hours. Interested?",
    },
  ],
  [
    // Without subdomain matching this scores 1 and slips through, which is a
    // hostname prefix away from defeating the strongest signal there is.
    "a pitch from a subdomain of a known solicitor domain",
    {
      name: "Mailer",
      email: "mailer@mail.jmailservice.com",
      message: "Would you like more traffic to your website this quarter?",
    },
  ],
];

const notMarked: Array<[string, ContactMessage]> = [
  [
    // The corpus's one genuine message was the owner's own test, and its body
    // was literally "test" — too short to be a Contact Message at all, so the
    // classifier never sees it. Standing in for it is the same message at a
    // length that survives validation, since a `ContactMessage` is only a
    // Contact Message once it has been parsed and found valid.
    "the owner's own test message",
    {
      name: "mike",
      email: "mike@example.com",
      message: "testing the contact form",
    },
  ],
  [
    "an ordinary enquiry",
    {
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "I'd like to talk about a project.",
    },
  ],
  [
    // Discussing the subject is not selling it: one topical phrase from an
    // unremarkable sender must never be enough.
    "someone hiring for SEO work who mentions it once",
    {
      name: "Priya",
      email: "priya@acme.co.uk",
      message:
        "Hi Mike, we are hiring a contractor to help with SEO on our marketing site. Are you free in September?",
    },
  ],
  [
    "an enquiry that happens to link to the sender's site",
    {
      name: "Tom",
      email: "tom@studio.io",
      message: "Loved your portfolio. Ours is at https://studio.io — fancy a chat?",
    },
  ],
  [
    // The strongest signal in the corpus, and still not decisive on its own.
    "an unremarkable message from a known solicitor domain",
    {
      name: "Sam",
      email: "sam@jmailservice.com",
      message: "I saw your portfolio and wanted to ask about your availability.",
    },
  ],
  [
    // Naming one subject three ways is one signal, not three. These are the
    // enquiries the premise exists to protect, and they are the reason the
    // topical vocabulary is capped instead of counted.
    "a client asking for search functionality to be built",
    {
      name: "Wes",
      email: "wes@retailer.example",
      message:
        "Can you build a search results page that ranks products by keyword relevance?",
    },
  ],
  [
    "a client asking for SEO help in the field's own words",
    {
      name: "Nadia",
      email: "nadia@agency.example",
      message:
        "I need help to rank our keywords in search results — are you available in October?",
    },
  ],
];

describe("classifySolicitation", () => {
  it.each(marked)("marks %s", (_case, message) => {
    expect(classifySolicitation(message)).toBe("solicitation");
  });

  it.each(notMarked)("leaves %s ordinary", (_case, message) => {
    expect(classifySolicitation(message)).toBe("ordinary");
  });
});

// The rules must not reach the browser bundle, or a spammer can read the
// thresholds and tune their copy against them. ADR-0005 says that is
// guaranteed by the import graph rather than by trusting tree-shaking, so this
// walks the graph rather than grepping the two files we happen to remember:
// anything the contact form can reach, transitively, is what a bundler would
// pull in. Type-only imports are counted too — stricter than a bundler, which
// erases them, and there is no reason for a client module to name this one at
// all.
const REPO_ROOT = new URL("../", import.meta.url);
const IMPORT_SPECIFIER = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveLocal(specifier: string, fromPath: string) {
  const base = specifier.startsWith("@/")
    ? new URL(specifier.slice(2), REPO_ROOT)
    : specifier.startsWith(".")
      ? new URL(specifier, new URL(fromPath, REPO_ROOT))
      : undefined;

  // A bare specifier is a package, not our code.
  if (!base) return undefined;

  return EXTENSIONS.map((extension) => `${base.pathname}${extension}`).find(
    (candidate) => existsSync(candidate)
  );
}

function reachableFrom(entry: string) {
  const seen = new Set<string>();
  const queue = [new URL(entry, REPO_ROOT).pathname];

  while (queue.length > 0) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);

    const source = readFileSync(path, "utf8");
    for (const [, specifier] of source.matchAll(IMPORT_SPECIFIER)) {
      const resolved = resolveLocal(specifier, relative(REPO_ROOT.pathname, path));
      if (resolved) queue.push(resolved);
    }
  }

  return seen;
}

describe("the scoring rules stay server-side", () => {
  it("is unreachable from the contact form", () => {
    const reachable = reachableFrom("components/contact-form.tsx");

    // The walk is only meaningful if it actually walked: the form reaches the
    // Contact Message module, which is where it gets validation from.
    expect(reachable).toContain(new URL("lib/contact-message.ts", REPO_ROOT).pathname);
    expect(reachable).not.toContain(
      new URL("lib/solicitation.ts", REPO_ROOT).pathname
    );
  });

  it("is unreachable from the page the form is rendered on", () => {
    const reachable = reachableFrom("app/page.tsx");

    expect(reachable).not.toContain(
      new URL("lib/solicitation.ts", REPO_ROOT).pathname
    );
  });

  // The negative control: the two tests above only mean something if the walk
  // can find this module when it really is imported. The API route imports it,
  // and the route is server-only.
  it("is reachable from the API route, which is where it belongs", () => {
    const reachable = reachableFrom("app/api/contact/route.ts");

    expect(reachable).toContain(
      new URL("lib/solicitation.ts", REPO_ROOT).pathname
    );
  });
});
