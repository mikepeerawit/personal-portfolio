import AnimatedSection from "@/components/animated-section";
import { OutlineSection } from "@/lib/page-outline";

// The frame every anchored section shares: the animated wrapper carrying the
// anchor id, the scroll offset that keeps the sticky header off the section
// just navigated to, and the heading. It takes the Page Outline section rather
// than an id and a title, so a call site cannot anchor or title a section with
// something the outline does not know about.
//
// The offset reads --header-height, the same property the header's own height
// reads — the two have to agree, so they are one number. Named PageSection
// because `section` is the outline's lookup export, already imported here.

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
