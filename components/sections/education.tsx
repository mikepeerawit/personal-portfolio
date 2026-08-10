import AnimatedSection from "@/components/animated-section";
import TimelineItem from "@/components/timeline-item";
import { education } from "@/data/constants/education-data";
import { section } from "@/lib/page-outline";

const Education = () => {
  return (
    <AnimatedSection id={section.education.id} className="scroll-mt-20 pt-4">
      <h2 className="text-2xl font-semibold tracking-tight mb-6">Education</h2>
      <div>
        {education.map((item, index) => (
          <TimelineItem
            key={index}
            title={item.title}
            subtitle={item.subtitle}
            date={item.date}
            description={item.description}
            url={item.url}
          />
        ))}
      </div>
    </AnimatedSection>
  );
};

export default Education;
