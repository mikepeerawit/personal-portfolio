// The Page Outline: the single list of sections the page is made of, in the
// order they appear. A section's anchor id, its nav href and its nav label are
// one record here rather than three strings that have to agree by hand — the
// href is derived from the id, so a rename cannot silently break in-page
// navigation.

export type SectionId =
  | "about"
  | "experience"
  | "projects"
  | "education"
  | "contact";

export type OutlineSection = {
  id: SectionId;
  label: string;
  href: `#${SectionId}`;
};

// The only place the order and the labels are written down.
const ORDER: readonly { id: SectionId; label: string }[] = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
];

export const pageOutline: readonly OutlineSection[] = ORDER.map(
  ({ id, label }) => ({ id, label, href: `#${id}` }),
);

// Lookup by id, for the section components: each renders `section.<id>.id`
// rather than a bare string, so dropping a section from the outline is a
// compile error instead of a dead anchor.
export const section = Object.fromEntries(
  pageOutline.map((entry) => [entry.id, entry]),
) as Record<SectionId, OutlineSection>;
