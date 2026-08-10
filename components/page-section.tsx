import AnimatedSection from "@/components/animated-section";
import { OutlineSection } from "@/lib/page-outline";

// The frame every anchored section of the page shares: the animated wrapper
// carrying the section's anchor id, the scroll offset that keeps the sticky
// header from covering the section it just navigated to, and the heading a
// visitor reads at the top of it. A call site names its section once and
// supplies only the body.
//
// It takes the Page Outline section rather than an id and a title, so a call
// site cannot anchor or title a section with something the outline does not
// know about. The scroll offset reads --header-height, the same custom
// property the header's own height reads, so the two cannot drift apart.
//
// Named PageSection, not Section: `section` is the Page Outline's lookup
// export and is already imported by these call sites.

type PageSectionProps = {
  section: OutlineSection;
  children: React.ReactNode;
};

const PageSection = ({ section, children }: PageSectionProps) => {
  return (
    <AnimatedSection
      id={section.id}
      className="scroll-mt-[var(--header-height)] pt-4"
    >
      <h2 className="text-2xl font-semibold tracking-tight mb-6">
        {section.heading}
      </h2>
      {children}
    </AnimatedSection>
  );
};

export default PageSection;
