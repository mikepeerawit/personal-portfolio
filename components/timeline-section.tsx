import AnimatedSection from "@/components/animated-section";
import SectionHeading from "@/components/section-heading";
import TimelineItem from "@/components/timeline-item";
import { TimelineItem as TimelineItemType } from "@/data/types";
import { OutlineSection } from "@/lib/page-outline";

// A section of the page that is a heading over a list of Timeline Items —
// work experience and education. Items are spread into TimelineItem rather
// than re-listed field by field, so adding a field to a Timeline Item does not
// mean remembering to thread it through here.

type TimelineSectionProps = {
  section: OutlineSection;
  items: readonly TimelineItemType[];
};

const TimelineSection = ({ section, items }: TimelineSectionProps) => {
  return (
    <AnimatedSection id={section.id} className="scroll-mt-20 pt-4">
      <SectionHeading section={section} />
      <div>
        {items.map((item, index) => (
          <TimelineItem key={index} {...item} />
        ))}
      </div>
    </AnimatedSection>
  );
};

export default TimelineSection;
