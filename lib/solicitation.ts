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

// Vocabulary a solicitation and a genuine enquiry use alike: someone hiring for
// SEO work, or asking for a search results page, reaches for exactly these
// words. Being *about* the topic is one signal no matter how many synonyms for
// it appear — scoring each separately would mark "help us rank our keywords in
// search results" on three counts of naming one subject once, which is the
// enquiry the whole premise exists to protect. Hence TOPICAL_SCORE, capped.
//
// `rank` is left open-ended to catch "ranked" and "ranking"; the leading
// boundary keeps it off "frank".
const TOPICAL_PHRASES = [
  /\bsearch results\b/i,
  /\bkeywords?\b/i,
  /\bseo\b/i,
  /\brank/i,
];

// Templated sales copy, which is what actually separates the cluster from a
// client who happens to work in the field. Nobody enquiring about a project
// promises you the first page within 24 hours. Each one counts.
const PITCH_PHRASES = [
  /\btop of (the )?search results\b/i,
  /\bfirst page\b/i,
  /\bpay per click\b/i,
  /\btraffic to your (web)?site\b/i,
  /\bwithin 24 hours\b/i,
];

const LINK = /\bhttps?:\/\/|\bwww\./i;

const SOLICITOR_DOMAIN_SCORE = 2;
const TOPICAL_SCORE = 1;
const PITCH_PHRASE_SCORE = 1;
const LINK_SCORE = 1;

// More than one signal is required, so a genuine message that is merely about
// the subject — or that merely arrives from a domain which has sent pitches
// before — reaches the inbox unmarked. Losing one real enquiry costs more than
// receiving fifty solicitations, so this is tuned to let ambiguity through.
const THRESHOLD = 3;

// Subdomains count: `mail.jmailservice.com` is the same operator, and matching
// the registered domain exactly would be defeated by a hostname prefix.
function fromSolicitorDomain(email: string) {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();

  return SOLICITOR_DOMAINS.some(
    (solicitor) => domain === solicitor || domain.endsWith(`.${solicitor}`)
  );
}

function matches(phrases: RegExp[], message: string) {
  return phrases.filter((phrase) => phrase.test(message)).length;
}

function score({ email, message }: ContactMessage) {
  const domainScore = fromSolicitorDomain(email) ? SOLICITOR_DOMAIN_SCORE : 0;
  const topicalScore =
    matches(TOPICAL_PHRASES, message) > 0 ? TOPICAL_SCORE : 0;
  const pitchScore = matches(PITCH_PHRASES, message) * PITCH_PHRASE_SCORE;
  const linkScore = LINK.test(message) ? LINK_SCORE : 0;

  return domainScore + topicalScore + pitchScore + linkScore;
}

export const classifySolicitation: Classify = (
  message: ContactMessage
): Classification =>
  score(message) >= THRESHOLD ? "solicitation" : "ordinary";
