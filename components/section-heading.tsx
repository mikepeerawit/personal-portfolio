import { OutlineSection } from "@/lib/page-outline";

// The heading a visitor reads at the top of a section. It takes the Page
// Outline section rather than a string, so a call site cannot title a section
// with text the outline does not know about — and the class string that gives
// every heading the same look lives here once.

const SectionHeading = ({ section }: { section: OutlineSection }) => {
  return (
    <h2 className="text-2xl font-semibold tracking-tight mb-6">
      {section.heading}
    </h2>
  );
};

export default SectionHeading;
