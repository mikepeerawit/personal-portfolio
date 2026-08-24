// Who the site says it is: the name, the role, the place, and the address the
// site is served from. One module because these strings are read by things a
// visitor never sees side by side — the page itself, the browser tab, a search
// result, the card a shared link unfurls into, the structured data a crawler
// reads — and there is no way to notice they have drifted apart. A person who
// changes the role in the hero and not in the metadata sees nothing wrong on
// the page, and every share of the link keeps saying the old one.
//
// The same rule the Page Outline follows, applied to identity rather than
// structure: written down once, derived everywhere else.

const city = "Bangkok";
const country = "Thailand";

export const siteIdentity = {
  name: "Peerawit Chariyawongsiri",

  // What the hero calls the role, so this is what every other surface calls it
  // too. Title case rather than the "full-stack developer" the About prose
  // uses: this one is a title, not a sentence.
  role: "Full Stack Developer",

  city,
  country,
  // ISO 3166-1 alpha-2, for structured data. A crawler will not infer it from
  // the word "Thailand".
  countryCode: "TH",
  // The one form a human reads, on the page and in the social card.
  location: `${city}, ${country}`,

  // Production is served from the apex; there is no `www` host to prefer, so
  // this is the canonical origin rather than one of two spellings of it. No
  // trailing slash — everything below appends a path to it.
  url: "https://mikepeerawit.com",

  // The sentence that appears under the link in a search result and in the
  // preview of a shared one. It is the site's only pitch to someone who has
  // not opened it yet, so it says what is here rather than restating the role
  // the title already carries. Kept under ~155 characters, past which Google
  // truncates it mid-word.
  description:
    "Full-stack developer in Bangkok, Thailand, building thoughtful, well-crafted web products. Work experience, projects, and a way to get in touch.",

  // The portrait, served from `public/`. Named here because three surfaces
  // want it — the hero, the social card, and the structured data — and only
  // the first of them is looking at the page when it breaks.
  portrait: "/profile-pic.jpeg",
} as const;

// What the browser tab and a search result headline show. Both halves matter:
// the name is what someone searches, the role is what tells them they found
// the right person.
export const siteTitle = `${siteIdentity.name} — ${siteIdentity.role}`;

// Structured data, so a crawler reads the page as a person rather than as
// words that happen to include a name. Derived from the identity above for the
// same reason everything else is: the schema is the one copy nobody would ever
// catch going stale, because nothing renders it.
export const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: siteIdentity.name,
  jobTitle: siteIdentity.role,
  url: siteIdentity.url,
  image: `${siteIdentity.url}${siteIdentity.portrait}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: siteIdentity.city,
    addressCountry: siteIdentity.countryCode,
  },
  // Only profiles that are demonstrably this person's. `sameAs` is how a
  // crawler links the site to an identity it already knows, and a wrong entry
  // links it to someone else — so this list stays short and verified rather
  // than complete.
  sameAs: ["https://github.com/mikepeerawit"],
} as const;
