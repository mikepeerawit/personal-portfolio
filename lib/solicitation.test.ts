import { readFileSync } from "node:fs";
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
    "a short pitch carrying a link and two sales phrases",
    {
      name: "Dan",
      email: "dan@example.com",
      message: "We improve your rank in search results. See https://example.com",
    },
  ],
];

const notMarked: Array<[string, ContactMessage]> = [
  [
    "the one genuine message in the corpus",
    { name: "mike", email: "Michael.chry@gmail.com", message: "test" },
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
// thresholds and tune their copy against them. That is guaranteed by the
// import graph rather than by trusting tree-shaking: the contact form imports
// only the Contact Message module, and the Contact Message module does not
// import this one — it takes the verdict as an argument.
describe("the scoring rules stay server-side", () => {
  it.each([
    "components/contact-form.tsx",
    "lib/contact-message.ts",
  ])("%s does not import the solicitation module", (file) => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

    expect(source).not.toMatch(/from\s+["'].*solicitation["']/);
  });
});
