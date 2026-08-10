// Scoring a Contact Message for the Solicitation cluster: coherent, templated
// messages selling something, which are delivered but marked rather than
// rejected. Signals and weights come from the mailbox corpus recorded in
// ADR-0005.
//
// This module is imported by the API route and by nothing the browser loads —
// the contact form receives no verdict and no rules, so a spammer cannot read
// the thresholds and tune their copy against them. Keep it that way: nothing
// on the browser's import path may import this file.

import type { Classification, Classify, ContactMessage } from "@/lib/contact-message";

// The domains the observed pitches actually came from. Weighted strongly —
// this is the single most reliable signal in the corpus — but deliberately
// below the threshold on its own, because the operators register new domains
// and a blocklist would fail silently and completely when they do.
const SOLICITOR_DOMAINS = [
  "jmailservice.com",
  "dominatingkeywords.com",
  "dominatebanners.com",
];

// Phrases characteristic of the cluster's copy. Anchored at a word boundary so
// "rank" also catches "ranked" and "ranking" without matching "frank".
const SALES_PHRASES = [
  /\bsearch results\b/i,
  /\bkeywords?\b/i,
  /\bseo\b/i,
  /\bpay per click\b/i,
  /\btraffic to your (web)?site\b/i,
  /\brank/i,
  /\bwithin 24 hours\b/i,
];

const LINK = /\bhttps?:\/\/|\bwww\./i;

const SOLICITOR_DOMAIN_SCORE = 2;
const SALES_PHRASE_SCORE = 1;
const LINK_SCORE = 1;

// More than one signal is required, so a genuine message that mentions SEO
// once — or arrives from a domain that has sent pitches before — reaches the
// inbox unmarked. Losing one real enquiry costs more than receiving fifty
// solicitations, so this is tuned to let ambiguity through.
const THRESHOLD = 3;

function domainOf(email: string) {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

function score({ email, message }: ContactMessage) {
  const domainScore = SOLICITOR_DOMAINS.includes(domainOf(email))
    ? SOLICITOR_DOMAIN_SCORE
    : 0;

  const phraseScore = SALES_PHRASES.filter((phrase) =>
    phrase.test(message)
  ).length * SALES_PHRASE_SCORE;

  const linkScore = LINK.test(message) ? LINK_SCORE : 0;

  return domainScore + phraseScore + linkScore;
}

export const classifySolicitation: Classify = (
  message: ContactMessage
): Classification =>
  score(message) >= THRESHOLD ? "solicitation" : "ordinary";
